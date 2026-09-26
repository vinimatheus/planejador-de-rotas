import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().default(3333),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  OSRM_URL: z.url().default("https://router.project-osrm.org"),
  NOMINATIM_URL: z.url().default("https://nominatim.openstreetmap.org"),
  NOMINATIM_USER_AGENT: z.string().default("router-map/1.0 (dev)"),
});

export const env = envSchema.parse(process.env);
