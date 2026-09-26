"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { formatCep } from "@router-map/shared";
import { type Stop, addressLine, cityLine } from "@/lib/types";

type Props = {
  origin: Stop | null;
  stops: Stop[];
  geometry: [number, number][] | null;
  approximate: boolean;
  activeId: string | null;
};

const BRAZIL_CENTER: [number, number] = [-14.235, -51.925];

const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function pinIcon(label: string, variant: "origin" | "stop", active: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="route-pin route-pin--${variant}${active ? " route-pin--active" : ""}"><span>${label}</span></div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    popupAnchor: [0, -34],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0]!, 14, { duration: 0.6 });
      return;
    }
    map.flyToBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15, duration: 0.6 });
  }, [key, map]);
  return null;
}

/** Leaflet não percebe sozinho quando o contêiner muda de tamanho. */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function AddressPopup({ stop, title }: { stop: Stop; title: string }) {
  return (
    <Popup>
      <strong>{title}</strong>
      <br />
      {addressLine(stop.address)}
      <br />
      {cityLine(stop.address)} · {formatCep(stop.address.cep)}
    </Popup>
  );
}

export default function RouteMap({ origin, stops, geometry, approximate, activeId }: Props) {
  const points = useMemo(() => {
    const all = origin ? [origin, ...stops] : stops;
    return all.map((s) => [s.address.coordinates.lat, s.address.coordinates.lng] as [number, number]);
  }, [origin, stops]);

  return (
    <MapContainer center={BRAZIL_CENTER} zoom={4} zoomControl={false} className="size-full">
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} className="route-tiles" />
      <AutoResize />
      <FitBounds points={points} />

      {geometry && geometry.length > 1 && (
        <>
          <Polyline positions={geometry} pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.9 }} />
          <Polyline
            positions={geometry}
            pathOptions={{
              color: "#2563eb",
              weight: 5,
              opacity: 0.95,
              dashArray: approximate ? "8 10" : undefined,
            }}
          />
        </>
      )}

      {stops.map((stop, i) => (
        <Marker
          key={stop.id}
          position={[stop.address.coordinates.lat, stop.address.coordinates.lng]}
          icon={pinIcon(String(i + 1), "stop", activeId === stop.id)}
          zIndexOffset={activeId === stop.id ? 1000 : 0}
        >
          <AddressPopup stop={stop} title={`Entrega ${i + 1}`} />
        </Marker>
      ))}

      {origin && (
        <Marker
          position={[origin.address.coordinates.lat, origin.address.coordinates.lng]}
          icon={pinIcon("A", "origin", false)}
          zIndexOffset={2000}
        >
          <AddressPopup stop={origin} title="Origem" />
        </Marker>
      )}
    </MapContainer>
  );
}
