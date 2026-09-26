import {
  type Coordinates,
  type Leg,
  type RouteResponse,
  type Waypoint,
  haversine,
  haversineMatrix,
} from "@router-map/shared";
import { env } from "../env";
import { fetchJson } from "../http";

/** Estimativas usadas quando o OSRM não responde. */
const DETOUR_FACTOR = 1.3; // ruas não são linha reta
const FALLBACK_SPEED_MS = 30 / 3.6; // 30 km/h urbano

const coordString = (points: Coordinates[]) =>
  points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");

type OsrmTable = { code: string; distances?: (number | null)[][] };
type OsrmRoute = {
  code: string;
  routes: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: { distance: number; duration: number }[];
  }[];
};

/** Matriz de distâncias por ruas (metros). Cai para linha reta se o OSRM falhar. */
export async function distanceMatrix(
  points: Coordinates[],
): Promise<{ matrix: number[][]; source: "osrm" | "haversine" }> {
  try {
    const url = `${env.OSRM_URL}/table/v1/driving/${coordString(points)}?annotations=distance`;
    const data = await fetchJson<OsrmTable>(url, { timeoutMs: 15_000 });
    if (data.code !== "Ok" || !data.distances) throw new Error(data.code);
    const fallback = haversineMatrix(points);
    // Pares sem rota (null) usam a linha reta com penalidade.
    const matrix = data.distances.map((row, i) =>
      row.map((d, j) => d ?? (fallback[i]?.[j] ?? 0) * DETOUR_FACTOR * 3),
    );
    return { matrix, source: "osrm" };
  } catch {
    return { matrix: haversineMatrix(points), source: "haversine" };
  }
}

/** Traça a rota na ordem dada: origem → paradas (→ origem). */
export async function buildRoute(
  origin: Waypoint,
  stops: Waypoint[],
  returnToOrigin: boolean,
): Promise<RouteResponse> {
  const sequence = returnToOrigin ? [origin, ...stops, origin] : [origin, ...stops];
  const order = stops.map((s) => s.id);

  try {
    const url =
      `${env.OSRM_URL}/route/v1/driving/${coordString(sequence.map((w) => w.coordinates))}` +
      `?overview=full&geometries=geojson&steps=false`;
    const data = await fetchJson<OsrmRoute>(url, { timeoutMs: 15_000 });
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) throw new Error(data.code);

    const legs: Leg[] = route.legs.map((leg, i) => ({
      fromId: sequence[i]!.id,
      toId: sequence[i + 1]!.id,
      distance: leg.distance,
      duration: leg.duration,
    }));

    return {
      order,
      distance: route.distance,
      duration: route.duration,
      legs,
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      source: "osrm",
    };
  } catch {
    const legs: Leg[] = sequence.slice(1).map((to, i) => {
      const from = sequence[i]!;
      const distance = haversine(from.coordinates, to.coordinates) * DETOUR_FACTOR;
      return { fromId: from.id, toId: to.id, distance, duration: distance / FALLBACK_SPEED_MS };
    });
    return {
      order,
      distance: legs.reduce((s, l) => s + l.distance, 0),
      duration: legs.reduce((s, l) => s + l.duration, 0),
      legs,
      geometry: sequence.map((w) => [w.coordinates.lat, w.coordinates.lng]),
      source: "haversine",
    };
  }
}
