import type { FastifyInstance } from "fastify";
import { optimizeOrder, optimizeRequestSchema, routeRequestSchema } from "@router-map/shared";
import { buildRoute, distanceMatrix } from "../services/osrm";

export async function routeRoutes(app: FastifyInstance) {
  /** Otimiza a ordem das entregas (TSP) e já devolve a rota traçada. */
  app.post("/routes/optimize", async (req) => {
    const { origin, stops, returnToOrigin, improve } = optimizeRequestSchema.parse(req.body);

    const points = [origin, ...stops].map((w) => w.coordinates);
    const { matrix } = await distanceMatrix(points);
    // Índices da matriz: 0 = origem, 1..n = stops[0..n-1]
    const order = optimizeOrder(matrix, { returnToStart: returnToOrigin, improve });
    const ordered = order.map((i) => stops[i - 1]!);

    return buildRoute(origin, ordered, returnToOrigin);
  });

  /** Traça a rota respeitando a ordem enviada (usado após arrastar e soltar). */
  app.post("/routes", async (req) => {
    const { origin, stops, returnToOrigin } = routeRequestSchema.parse(req.body);
    return buildRoute(origin, stops, returnToOrigin);
  });
}
