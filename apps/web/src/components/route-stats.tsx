import { type RouteResponse, formatDistance, formatDuration } from "@router-map/shared";
import { ClockIcon, MapPinIcon, RouteIcon } from "lucide-react";

type Props = { route: RouteResponse | null; stopCount: number; loading: boolean };

export function RouteStats({ route, stopCount, loading }: Props) {
  const items = [
    { icon: RouteIcon, label: "Distância", value: route ? formatDistance(route.distance) : "—" },
    { icon: ClockIcon, label: "Tempo estimado", value: route ? formatDuration(route.duration) : "—" },
    { icon: MapPinIcon, label: "Entregas", value: String(stopCount) },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2" aria-busy={loading}>
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-xl bg-muted/60 px-3 py-2.5">
          <dt className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <Icon className="size-3" />
            <span className="truncate">{label}</span>
          </dt>
          <dd className={`mt-1 text-lg font-semibold tabular-nums ${loading ? "animate-pulse opacity-60" : ""}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
