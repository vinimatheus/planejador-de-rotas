import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { env } from "./env";
import { HttpError } from "./http";
import { cepRoutes } from "./routes/cep";
import { routeRoutes } from "./routes/route";

export function buildApp() {
  const app = Fastify({ logger: { level: process.env.NODE_ENV === "test" ? "silent" : "info" } });

  app.register(cors, { origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()) });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: err.issues[0]?.message ?? "Dados inválidos",
        details: err.issues,
      });
    }
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({ error: err.message, details: err.details });
    }
    app.log.error(err);
    return reply.status(500).send({ error: "Erro interno" });
  });

  app.get("/health", async () => ({ ok: true }));
  app.register(cepRoutes);
  app.register(routeRoutes);

  return app;
}
