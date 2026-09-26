"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { formatCep } from "@router-map/shared";
import {
  ExternalLinkIcon,
  LinkIcon,
  HouseIcon,
  Loader2Icon,
  PencilIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  TruckIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { CepInput } from "@/components/cep-input";
import { MultiCepInput } from "@/components/multi-cep-input";
import { RouteStats } from "@/components/route-stats";
import { StopList } from "@/components/stop-list";
import { useRoutePlanner } from "@/hooks/use-route-planner";
import { addressLine, cityLine, googleMapsUrl } from "@/lib/types";

const RouteMap = dynamic(() => import("@/components/route-map"), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center bg-muted text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  ),
});

export function RoutePlanner() {
  const p = useRoutePlanner();
  const [editingOrigin, setEditingOrigin] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const canRoute = Boolean(p.origin) && p.stops.length > 0;
  const showOriginInput = !p.origin || editingOrigin;

  return (
    <div className="flex h-dvh flex-col-reverse bg-background lg:flex-row">
      <aside className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t lg:w-[420px] lg:flex-none lg:overflow-visible lg:border-t-0 lg:border-r">
        <header className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <TruckIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-base leading-tight font-semibold">Planejador de Rotas</h1>
            <p className="text-xs text-muted-foreground">Entregas por CEP com rota otimizada</p>
          </div>
        </header>

        <div className="flex flex-col gap-5 px-5 pb-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {/* Origem */}
          <section className="flex flex-col gap-2">
            <Label htmlFor="origin-cep" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Ponto de partida
            </Label>
            {showOriginInput ? (
              <CepInput
                id="origin-cep"
                placeholder="CEP de origem"
                actionLabel="Definir"
                actionIcon={<SearchIcon />}
                loading={p.lookingUp === "origin"}
                onSubmit={async (cep) => {
                  const ok = await p.setOriginByCep(cep);
                  if (ok) setEditingOrigin(false);
                  return ok;
                }}
              />
            ) : (
              p.origin && (
                <div className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                    <HouseIcon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{addressLine(p.origin.address)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{formatCep(p.origin.address.cep)}</span> · {cityLine(p.origin.address)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Trocar origem" onClick={() => setEditingOrigin(true)}>
                    <PencilIcon />
                  </Button>
                </div>
              )
            )}
          </section>

          {/* Entregas */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stop-cep" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Entregas
              </Label>
              {p.stops.length > 0 && (
                <Button variant="ghost" size="xs" onClick={p.clearAll} className="text-muted-foreground">
                  <Trash2Icon /> Limpar
                </Button>
              )}
            </div>
            <MultiCepInput id="stop-cep" progress={p.bulkProgress} onSubmit={p.addStopsByCeps} />
            <div className="mt-1">
              <StopList
                stops={p.stops}
                legsByStop={p.legsByStop}
                onMove={p.moveStop}
                onRemove={p.removeStop}
                activeId={hoveredId}
                onHover={setHoveredId}
              />
            </div>
            {p.stops.length > 1 && (
              <p className="text-xs text-muted-foreground">Arraste pelas alças para mudar a ordem manualmente.</p>
            )}
          </section>
        </div>

        {/* Rodapé fixo: opções, estatísticas e ações */}
        <footer className="flex flex-col gap-4 border-t bg-card/60 px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Voltar à origem no final</span>
              <Switch checked={p.returnToOrigin} onCheckedChange={p.setReturnToOrigin} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="flex flex-col">
                Refinar (2-opt + realocação)
                <span className="text-xs text-muted-foreground">Após o vizinho mais próximo</span>
              </span>
              <Switch checked={p.improve} onCheckedChange={p.setImprove} />
            </label>
          </div>

          <Separator />

          <RouteStats route={p.route} stopCount={p.stops.length} loading={p.routing || p.optimizing} />

          {p.route?.source === "haversine" && (
            <Badge variant="secondary" className="h-auto w-full justify-start py-1 whitespace-normal">
              Servidor de rotas indisponível: distâncias estimadas em linha reta.
            </Badge>
          )}

          <div className="flex gap-2">
            <Button size="lg" className="h-10 flex-1" disabled={!canRoute || p.optimizing} onClick={p.optimize}>
              {p.optimizing ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
              Otimizar entregas
            </Button>
            {canRoute && (
              <Button
                variant="outline"
                size="icon-lg"
                className="size-10"
                aria-label="Copiar link da rota"
                title="Copiar link da rota"
                onClick={async () => {
                  const url = p.shareUrl();
                  if (!url) return;
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Link da rota copiado");
                  } catch {
                    toast.info("Copie o link", { description: url });
                  }
                }}
              >
                <LinkIcon />
              </Button>
            )}
            {canRoute && p.origin && (
              <a
                href={googleMapsUrl(p.origin, p.stops, p.returnToOrigin)}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir no Google Maps"
                title="Abrir no Google Maps"
                className={buttonVariants({ variant: "outline", size: "icon-lg", className: "size-10" })}
              >
                <ExternalLinkIcon />
              </a>
            )}
          </div>
        </footer>
      </aside>

      <main className="relative h-[42dvh] shrink-0 lg:h-auto lg:flex-1">
        <RouteMap
          origin={p.origin}
          stops={p.stops}
          geometry={p.route?.geometry ?? null}
          approximate={p.route?.source === "haversine"}
          activeId={hoveredId}
        />
        {p.routing && (
          <div className="pointer-events-none absolute top-3 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs shadow-md">
            <Loader2Icon className="size-3.5 animate-spin" /> Traçando rota…
          </div>
        )}
      </main>
    </div>
  );
}
