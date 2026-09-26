import { z } from "zod";

/** CEP brasileiro: aceita "01310-100" ou "01310100" e normaliza para 8 dígitos. */
export const cepSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().length(8, "CEP deve ter 8 dígitos"));

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const addressSchema = z.object({
  cep: z.string().length(8),
  street: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  coordinates: coordinatesSchema,
  /** De onde vieram as coordenadas (precisão varia). */
  geocodeSource: z.enum(["brasilapi", "nominatim-street", "nominatim-city"]),
});
export type Address = z.infer<typeof addressSchema>;

/** Ponto nomeado usado nas requisições de rota. */
export const waypointSchema = z.object({
  id: z.string().min(1),
  coordinates: coordinatesSchema,
});
export type Waypoint = z.infer<typeof waypointSchema>;

export const MAX_STOPS = 40;

export const optimizeRequestSchema = z.object({
  origin: waypointSchema,
  stops: z.array(waypointSchema).min(1, "Adicione ao menos uma entrega").max(MAX_STOPS),
  /** Voltar para a origem ao final (circuito fechado). */
  returnToOrigin: z.boolean().default(false),
  /** Aplica refinamento 2-opt depois do vizinho mais próximo. */
  improve: z.boolean().default(false),
});
export type OptimizeRequest = z.input<typeof optimizeRequestSchema>;

export const routeRequestSchema = z.object({
  origin: waypointSchema,
  /** Paradas já na ordem desejada. */
  stops: z.array(waypointSchema).min(1).max(MAX_STOPS),
  returnToOrigin: z.boolean().default(false),
});
export type RouteRequest = z.input<typeof routeRequestSchema>;

export const legSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  distance: z.number(), // metros
  duration: z.number(), // segundos
});
export type Leg = z.infer<typeof legSchema>;

export const routeResponseSchema = z.object({
  /** IDs das paradas na ordem de visita (sem a origem). */
  order: z.array(z.string()),
  distance: z.number(),
  duration: z.number(),
  legs: z.array(legSchema),
  /** Polilinha [lat, lng] para desenhar no mapa. */
  geometry: z.array(z.tuple([z.number(), z.number()])),
  /** "osrm" = ruas reais; "haversine" = linha reta estimada (OSRM indisponível). */
  source: z.enum(["osrm", "haversine"]),
});
export type RouteResponse = z.infer<typeof routeResponseSchema>;

export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/**
 * Extrai vários CEPs de um texto livre (vírgula, espaço, ponto e vírgula ou
 * quebra de linha). Retorna os válidos sem repetição, na ordem digitada,
 * e os trechos que não parecem CEP.
 */
export function parseCepList(text: string): { valid: string[]; invalid: string[] } {
  const tokens = text
    .split(/[\s,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    const parsed = cepSchema.safeParse(token);
    if (!parsed.success || !/^\d{5}-?\d{3}$/.test(token.replace(/\./g, ""))) {
      invalid.push(token);
    } else if (!valid.includes(parsed.data)) {
      valid.push(parsed.data);
    }
  }
  return { valid, invalid };
}
