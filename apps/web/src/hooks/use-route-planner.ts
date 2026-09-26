"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type RouteResponse,
  cepSchema,
  formatCep,
  formatDistance,
  MAX_STOPS,
  parseCepList,
} from "@router-map/shared";
import { toast } from "sonner";
import { ApiRequestError, api } from "@/lib/api";
import { type Stop, toWaypoint } from "@/lib/types";

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : "Algo deu errado. Tente novamente.";

/** Assinatura da rota para saber se ela ainda corresponde à ordem atual. */
const signatureOf = (origin: Stop | null, stops: Stop[], returnToOrigin: boolean) =>
  origin ? [origin.id, ...stops.map((s) => s.id), returnToOrigin ? "loop" : "open"].join("|") : "";

export function useRoutePlanner() {
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [returnToOrigin, setReturnToOrigin] = useState(false);
  const [improve, setImprove] = useState(true);
  const [route, setRoute] = useState<(RouteResponse & { signature: string }) | null>(null);
  const [routing, setRouting] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [lookingUp, setLookingUp] = useState<"origin" | "stop" | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const signature = signatureOf(origin, stops, returnToOrigin);
  const currentRoute = route?.signature === signature ? route : null;

  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  const fetchStop = useCallback(async (cep: string): Promise<Stop> => {
    const address = await api.lookupCep(cep);
    return { id: crypto.randomUUID(), address };
  }, []);

  const setOriginByCep = useCallback(
    async (raw: string) => {
      const parsed = cepSchema.safeParse(raw);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "CEP inválido");
        return false;
      }
      setLookingUp("origin");
      try {
        const stop = await fetchStop(parsed.data);
        if (stop.address.geocodeSource === "nominatim-city") {
          toast.warning("Origem localizada só pelo centro da cidade", { description: "Posição aproximada." });
        }
        setOrigin(stop);
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setLookingUp(null);
      }
    },
    [fetchStop],
  );

  /**
   * Adiciona um ou vários CEPs, na ordem digitada, pulando os que já estão na lista.
   * Devolve os CEPs que não entraram (inexistentes ou com falha) para voltarem ao campo.
   */
  const addStopsByCeps = useCallback(
    async (ceps: string[]): Promise<string[]> => {
      const existing = new Set(stopsRef.current.map((s) => s.address.cep));
      const fresh = ceps.filter((c) => !existing.has(c));
      const skipped = ceps.length - fresh.length;
      const room = MAX_STOPS - stopsRef.current.length;
      const queue = fresh.slice(0, Math.max(0, room));
      const overLimit = fresh.slice(queue.length);

      const notFound: string[] = [];
      const errored: string[] = [];
      const approximate: string[] = [];
      let added = 0;

      setLookingUp("stop");
      // Um por vez: preserva a ordem digitada e respeita o limite do geocodificador.
      for (const [i, cep] of queue.entries()) {
        setBulkProgress({ done: i, total: queue.length });
        try {
          const stop = await fetchStop(cep);
          if (stop.address.geocodeSource === "nominatim-city") approximate.push(formatCep(cep));
          setStops((prev) => [...prev, stop]);
          added++;
        } catch (err) {
          if (err instanceof ApiRequestError && err.status === 404) notFound.push(cep);
          else errored.push(cep);
        }
      }
      setBulkProgress(null);
      setLookingUp(null);

      const list = (items: string[]) =>
        items.slice(0, 5).map(formatCep).join(", ") + (items.length > 5 ? ` e mais ${items.length - 5}` : "");
      const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

      if (added > 1) toast.success(`${plural(added, "entrega adicionada", "entregas adicionadas")}`);
      if (notFound.length) {
        toast.error(`${plural(notFound.length, "CEP não existe", "CEPs não existem")} nos Correios`, {
          description: `${list(notFound)}. Eles voltaram para o campo para você corrigir.`,
          duration: 10_000,
        });
      }
      if (errored.length) {
        toast.error(`Falha ao buscar ${plural(errored.length, "CEP", "CEPs")}`, {
          description: `${list(errored)}. Tente adicionar de novo em instantes.`,
          duration: 10_000,
        });
      }
      if (approximate.length) {
        toast.warning("Localizados só pelo centro da cidade", { description: list(approximate) });
      }
      if (skipped) toast.info(`${plural(skipped, "CEP já estava", "CEPs já estavam")} na lista`);
      if (overLimit.length) toast.error(`Limite de ${MAX_STOPS} entregas: ${overLimit.length} ficaram de fora`);

      return [...notFound, ...errored, ...overLimit];
    },
    [fetchStop],
  );

  const removeStop = useCallback((id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const moveStop = useCallback((from: number, to: number) => {
    setStops((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setStops([]);
    setRoute(null);
  }, []);

  // Traça a rota automaticamente na ordem atual sempre que algo muda.
  useEffect(() => {
    if (!origin || stops.length === 0) return;
    if (route?.signature === signature) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setRouting(true);
      try {
        const res = await api.route(
          { origin: toWaypoint(origin), stops: stops.map(toWaypoint), returnToOrigin },
          controller.signal,
        );
        setRoute({ ...res, signature });
      } catch (err) {
        if (!controller.signal.aborted) toast.error(errorMessage(err));
      } finally {
        if (!controller.signal.aborted) setRouting(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [origin, stops, returnToOrigin, signature, route?.signature]);

  const optimize = useCallback(async () => {
    if (!origin || stops.length === 0) return;
    abortRef.current?.abort();
    setOptimizing(true);
    const before = currentRoute?.distance;
    try {
      const res = await api.optimize({
        origin: toWaypoint(origin),
        stops: stops.map(toWaypoint),
        returnToOrigin,
        improve,
      });
      const byId = new Map(stops.map((s) => [s.id, s]));
      const ordered = res.order.map((id) => byId.get(id)).filter((s): s is Stop => Boolean(s));
      setStops(ordered);
      setRoute({ ...res, signature: signatureOf(origin, ordered, returnToOrigin) });

      const saved = before !== undefined ? before - res.distance : 0;
      if (saved > 50) {
        toast.success(`Rota otimizada: ${formatDistance(saved)} a menos`);
      } else if (before !== undefined) {
        toast.success("Rota otimizada", { description: "A ordem atual já era a mais curta encontrada." });
      } else {
        toast.success("Rota otimizada");
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setOptimizing(false);
      setRouting(false);
    }
  }, [origin, stops, returnToOrigin, improve, currentRoute?.distance]);

  /** Link que recria esta rota: ?origem=…&entregas=…,…&volta=1 */
  const shareUrl = useCallback(() => {
    if (!origin) return null;
    const params = new URLSearchParams({ origem: origin.address.cep });
    if (stops.length) params.set("entregas", stops.map((s) => s.address.cep).join(","));
    if (returnToOrigin) params.set("volta", "1");
    return `${window.location.origin}${window.location.pathname}?${params}`;
  }, [origin, stops, returnToOrigin]);

  // Carrega uma rota vinda de link compartilhado (uma vez só, inclusive no Strict Mode).
  const loadedFromUrl = useRef(false);
  const pendingOptimize = useRef(false);
  useEffect(() => {
    if (loadedFromUrl.current) return;
    loadedFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const originCep = params.get("origem");
    const stopCeps = parseCepList(params.get("entregas") ?? "").valid;
    if (params.get("volta") === "1") setReturnToOrigin(true);
    pendingOptimize.current = params.get("otimizar") === "1";
    void (async () => {
      if (originCep) await setOriginByCep(originCep);
      if (stopCeps.length) await addStopsByCeps(stopCeps);
    })();
  }, [setOriginByCep, addStopsByCeps]);

  useEffect(() => {
    if (!pendingOptimize.current || lookingUp || !origin || stops.length === 0) return;
    pendingOptimize.current = false;
    void optimize();
  }, [lookingUp, origin, stops.length, optimize]);

  const legsByStop = useMemo(() => {
    const map = new Map<string, { distance: number; duration: number }>();
    currentRoute?.legs.forEach((l) => map.set(l.toId, l));
    return map;
  }, [currentRoute]);

  return {
    origin,
    stops,
    route: currentRoute,
    legsByStop,
    returnToOrigin,
    setReturnToOrigin,
    improve,
    setImprove,
    routing,
    optimizing,
    lookingUp,
    bulkProgress,
    setOriginByCep,
    addStopsByCeps,
    removeStop,
    moveStop,
    clearAll,
    shareUrl,
    optimize,
  };
}
