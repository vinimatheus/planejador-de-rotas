import {
  type Address,
  type OptimizeRequest,
  type RouteRequest,
  type RouteResponse,
  addressSchema,
  apiErrorSchema,
  routeResponseSchema,
} from "@router-map/shared";
import type { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ApiRequestError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function request<S extends z.ZodType>(
  schema: S,
  path: string,
  init?: RequestInit,
): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiRequestError("API indisponível. Ela está rodando na porta 3333?");
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiRequestError(parsed.success ? parsed.data.error : `Erro HTTP ${res.status}`, res.status);
  }
  return schema.parse(body);
}

export const api = {
  lookupCep: (cep: string): Promise<Address> =>
    request(addressSchema, `/cep/${cep}`),

  optimize: (body: OptimizeRequest, signal?: AbortSignal): Promise<RouteResponse> =>
    request(routeResponseSchema, "/routes/optimize", {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    }),

  route: (body: RouteRequest, signal?: AbortSignal): Promise<RouteResponse> =>
    request(routeResponseSchema, "/routes", { method: "POST", body: JSON.stringify(body), signal }),
};
