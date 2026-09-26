import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
// Força o fallback em linha reta: os testes não dependem de rede.
process.env.OSRM_URL = "http://127.0.0.1:9";

const { buildApp } = await import("./app");

const sp = (id: string, lat: number, lng: number) => ({ id, coordinates: { lat, lng } });

test("CEP inválido retorna 400", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "GET", url: "/cep/123" });
  assert.equal(res.statusCode, 400);
});

test("otimiza a ordem pelo vizinho mais próximo", async () => {
  const app = buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/routes/optimize",
    payload: {
      origin: sp("o", -23.55, -46.63),
      stops: [sp("longe", -23.7, -46.63), sp("perto", -23.56, -46.63), sp("meio", -23.6, -46.63)],
    },
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.deepEqual(body.order, ["perto", "meio", "longe"]);
  assert.equal(body.source, "haversine");
  assert.equal(body.legs.length, 3);
});

test("rota sem paradas retorna 400", async () => {
  const app = buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/routes",
    payload: { origin: sp("o", 0, 0), stops: [] },
  });
  assert.equal(res.statusCode, 400);
});
