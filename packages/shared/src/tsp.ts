/**
 * Heurísticas para o Problema do Caixeiro Viajante (TSP).
 *
 * `matrix[i][j]` é o custo (distância ou tempo) de ir de i até j.
 * O índice 0 é sempre a origem; o retorno são os índices das paradas
 * na ordem de visita, sem incluir a origem.
 */

function cost(matrix: number[][], i: number, j: number): number {
  return matrix[i]?.[j] ?? Number.POSITIVE_INFINITY;
}

/**
 * Vizinho mais próximo: a partir da origem, vai sempre para a parada
 * ainda não visitada mais próxima. O(n²), sem garantia de ótimo.
 */
export function nearestNeighbor(matrix: number[][], start = 0): number[] {
  const n = matrix.length;
  const visited = new Set<number>([start]);
  const order: number[] = [];
  let current = start;

  while (visited.size < n) {
    let best = -1;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      const c = cost(matrix, current, j);
      if (c < bestCost || best === -1) {
        best = j;
        bestCost = c;
      }
    }
    visited.add(best);
    order.push(best);
    current = best;
  }
  return order;
}

/** Custo total de um percurso que sai de `start` e passa por `order`. */
export function tourCost(
  matrix: number[][],
  order: number[],
  start = 0,
  returnToStart = false,
): number {
  let total = 0;
  let prev = start;
  for (const i of order) {
    total += cost(matrix, prev, i);
    prev = i;
  }
  if (returnToStart) total += cost(matrix, prev, start);
  return total;
}

/**
 * Busca local sobre a rota do vizinho mais próximo. Aplica, enquanto houver
 * ganho, dois movimentos:
 *  - 2-opt: inverte um trecho da rota (desfaz cruzamentos);
 *  - realocação (or-opt): tira uma parada do lugar e a insere em outra posição.
 * Recalcula o custo completo, então funciona com matrizes assimétricas (ruas de mão única).
 */
export function localSearch(
  matrix: number[][],
  order: number[],
  start = 0,
  returnToStart = false,
  maxIterations = 1000,
): number[] {
  let best = [...order];
  let bestCost = tourCost(matrix, best, start, returnToStart);
  let improved = true;
  let iterations = 0;

  const tryCandidate = (candidate: number[]) => {
    const c = tourCost(matrix, candidate, start, returnToStart);
    if (c + 1e-9 < bestCost) {
      best = candidate;
      bestCost = c;
      improved = true;
    }
  };

  while (improved && iterations++ < maxIterations) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        tryCandidate([...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)]);
      }
    }
    for (let i = 0; i < best.length; i++) {
      for (let j = 0; j < best.length; j++) {
        if (i === j) continue;
        const candidate = [...best];
        const [moved] = candidate.splice(i, 1);
        candidate.splice(j, 0, moved!);
        tryCandidate(candidate);
      }
    }
  }
  return best;
}

export function optimizeOrder(
  matrix: number[][],
  opts: { returnToStart?: boolean; improve?: boolean } = {},
): number[] {
  const order = nearestNeighbor(matrix, 0);
  return opts.improve ? localSearch(matrix, order, 0, opts.returnToStart ?? false) : order;
}
