import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { cepSchema } from "@router-map/shared";
import { lookupCep } from "../services/cep";

export async function cepRoutes(app: FastifyInstance) {
  app.get("/cep/:cep", async (req) => {
    const { cep } = z.object({ cep: cepSchema }).parse(req.params);
    return lookupCep(cep);
  });
}
