export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** fetch com timeout que devolve JSON ou lança HttpError. */
export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 10_000, ...rest } = init;
  const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    throw new HttpError(res.status, `Falha em ${new URL(url).host}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
