import type { Address, Coordinates } from "@router-map/shared";
import { env } from "../env";
import { HttpError, fetchJson } from "../http";
import { TtlCache } from "./cache";

type BrasilApiCep = {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  location?: { coordinates?: { latitude?: string; longitude?: string } };
};

type ViaCep = {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean | string;
};

type NominatimResult = { lat: string; lon: string };

const cache = new TtlCache<Address>(24 * 60 * 60 * 1000);

/** Nominatim permite no máximo 1 requisição por segundo: serializa as chamadas. */
let nominatimQueue: Promise<unknown> = Promise.resolve();
function throttledNominatim(params: Record<string, string>): Promise<NominatimResult[]> {
  const run = nominatimQueue.then(() => {
    const url = new URL("/search", env.NOMINATIM_URL);
    url.search = new URLSearchParams({
      format: "jsonv2",
      limit: "1",
      countrycodes: "br",
      ...params,
    }).toString();
    return fetchJson<NominatimResult[]>(url.toString(), {
      headers: { "User-Agent": env.NOMINATIM_USER_AGENT, "Accept-Language": "pt-BR" },
    });
  });
  // A próxima chamada espera 1,1 s depois desta, sem atrasar a resposta atual.
  nominatimQueue = run
    .catch(() => undefined)
    .then(() => new Promise((r) => setTimeout(r, 1100)));
  return run;
}

function parseCoords(lat?: string, lng?: string): Coordinates | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (!lat || !lng || !Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

type BaseAddress = Omit<Address, "coordinates" | "geocodeSource"> & {
  coordinates?: Coordinates | null;
};

async function fromBrasilApi(cep: string): Promise<BaseAddress | null> {
  try {
    const d = await fetchJson<BrasilApiCep>(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    return {
      cep,
      street: d.street ?? "",
      neighborhood: d.neighborhood ?? "",
      city: d.city,
      state: d.state,
      coordinates: parseCoords(
        d.location?.coordinates?.latitude,
        d.location?.coordinates?.longitude,
      ),
    };
  } catch (err) {
    if (err instanceof HttpError && err.statusCode === 404) return null;
    return null; // cai no ViaCEP
  }
}

async function fromViaCep(cep: string): Promise<BaseAddress | null> {
  try {
    const d = await fetchJson<ViaCep>(`https://viacep.com.br/ws/${cep}/json/`);
    if (d.erro) return null;
    return {
      cep,
      street: d.logradouro,
      neighborhood: d.bairro,
      city: d.localidade,
      state: d.uf,
    };
  } catch {
    return null;
  }
}

/**
 * Ordem de precisão: rua via Nominatim → coordenadas da BrasilAPI (às vezes
 * são só o centro da cidade) → centro da cidade via Nominatim.
 */
async function geocode(base: BaseAddress): Promise<Pick<Address, "coordinates" | "geocodeSource">> {
  if (base.street) {
    const [hit] = await throttledNominatim({
      street: base.street,
      city: base.city,
      state: base.state,
      country: "Brasil",
    }).catch(() => []);
    const coords = parseCoords(hit?.lat, hit?.lon);
    if (coords) return { coordinates: coords, geocodeSource: "nominatim-street" };
  }
  if (base.coordinates) return { coordinates: base.coordinates, geocodeSource: "brasilapi" };

  const [hit] = await throttledNominatim({ city: base.city, state: base.state, country: "Brasil" });
  const coords = parseCoords(hit?.lat, hit?.lon);
  if (coords) return { coordinates: coords, geocodeSource: "nominatim-city" };
  throw new HttpError(422, "Não foi possível localizar este CEP no mapa");
}

/** Busca o endereço do CEP e as coordenadas para plotar no mapa. */
export async function lookupCep(cep: string): Promise<Address> {
  const cached = cache.get(cep);
  if (cached) return cached;

  const base = (await fromBrasilApi(cep)) ?? (await fromViaCep(cep));
  if (!base) throw new HttpError(404, "CEP não encontrado");

  const located = await geocode(base);

  const address: Address = {
    cep,
    street: base.street,
    neighborhood: base.neighborhood,
    city: base.city,
    state: base.state,
    ...located,
  };
  cache.set(cep, address);
  return address;
}
