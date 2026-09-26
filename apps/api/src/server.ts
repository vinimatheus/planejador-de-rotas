import { buildApp } from "./app";
import { env } from "./env";

const app = buildApp();

app.listen({ port: env.PORT, host: env.HOST }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
