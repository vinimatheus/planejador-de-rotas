import { test } from "node:test";
import assert from "node:assert/strict";
import { localSearch, nearestNeighbor, optimizeOrder, tourCost } from "./tsp";
import { cepSchema } from "./schemas";

// Pontos numa reta: 0 (origem) em x=0, depois x=5, 1, 3, 10.
const xs = [0, 5, 1, 3, 10];
const line = xs.map((a) => xs.map((b) => Math.abs(a - b)));

test("vizinho mais próximo percorre a reta em ordem", () => {
  assert.deepEqual(nearestNeighbor(line), [2, 3, 1, 4]);
});

test("uma única parada", () => {
  assert.deepEqual(nearestNeighbor([[0, 7], [7, 0]]), [1]);
});

test("busca local nunca piora o vizinho mais próximo", () => {
  // Matriz em que o vizinho mais próximo cai numa armadilha clássica.
  const pts = [[0, 0], [1, 0], [-1.1, 0], [2.5, 0], [-3, 0]] as const;
  const m = pts.map(([ax, ay]) => pts.map(([bx, by]) => Math.hypot(ax - bx, ay - by)));
  const nn = nearestNeighbor(m);
  const opt = localSearch(m, nn);
  assert.ok(tourCost(m, opt) <= tourCost(m, nn));
  assert.equal(new Set(opt).size, pts.length - 1);
});

test("optimizeOrder retorna todas as paradas uma vez", () => {
  const order = optimizeOrder(line, { improve: true, returnToStart: true });
  assert.deepEqual([...order].sort(), [1, 2, 3, 4]);
});

test("cepSchema normaliza e valida", () => {
  assert.equal(cepSchema.parse("01310-100"), "01310100");
  assert.equal(cepSchema.safeParse("123").success, false);
});

test("busca local melhora a rota do vizinho mais próximo", () => {
  // Origem em 0; paradas em 1, -2 e 3. O vizinho mais próximo faz
  // 0 → 1 → 3 → -2 (custo 8); o ótimo é 0 → -2 → 1 → 3 (custo 7).
  const ps = [0, 1, -2, 3];
  const m = ps.map((a) => ps.map((b) => Math.abs(a - b)));
  assert.equal(tourCost(m, nearestNeighbor(m)), 8);
  assert.equal(tourCost(m, optimizeOrder(m, { improve: true })), 7);
});

test("circuito fechado considera a volta para a origem", () => {
  const ps = [0, -1, 2, 3, 4];
  const m = ps.map((a) => ps.map((b) => Math.abs(a - b)));
  const order = optimizeOrder(m, { improve: true, returnToStart: true });
  assert.equal(tourCost(m, order, 0, true), 10);
});

test("parseCepList separa válidos, remove repetidos e aponta inválidos", async () => {
  const { parseCepList } = await import("./schemas");
  const r = parseCepList("01310-100, 04538133\n01310100; 123 02011-000 abc");
  assert.deepEqual(r.valid, ["01310100", "04538133", "02011000"]);
  assert.deepEqual(r.invalid, ["123", "abc"]);
});
