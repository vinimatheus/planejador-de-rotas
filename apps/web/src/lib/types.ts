import type { Address } from "@router-map/shared";

export type Stop = {
  id: string;
  address: Address;
};

export const toWaypoint = (s: Stop) => ({ id: s.id, coordinates: s.address.coordinates });

export function addressLine(a: Address): string {
  return [a.street, a.neighborhood].filter(Boolean).join(", ") || "Endereço geral do CEP";
}

export function cityLine(a: Address): string {
  return `${a.city} · ${a.state}`;
}

/** Link de navegação no Google Maps com a sequência pronta. */
export function googleMapsUrl(origin: Stop, stops: Stop[], returnToOrigin: boolean): string {
  const fmt = (s: Stop) => `${s.address.coordinates.lat},${s.address.coordinates.lng}`;
  const last = returnToOrigin ? origin : stops[stops.length - 1]!;
  const middle = returnToOrigin ? stops : stops.slice(0, -1);
  const params = new URLSearchParams({
    api: "1",
    origin: fmt(origin),
    destination: fmt(last),
    travelmode: "driving",
  });
  if (middle.length) params.set("waypoints", middle.map(fmt).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}
