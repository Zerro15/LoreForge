import "dotenv/config";
import Fastify from "fastify";
import { ZodError } from "zod";
import { pool } from "./db";
import { campaignsRoutes } from "./routes/campaigns";
import { charactersRoutes } from "./routes/characters";
import { chatRoutes } from "./routes/chat";
import { pluginsRoutes } from "./routes/plugins";
import { sessionLogsRoutes } from "./routes/sessionLogs";

const app = Fastify({
  logger: true
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: "Validation error",
      issues: error.issues
    });
  }

  app.log.error(error);

  return reply.code(500).send({
    error: "Internal server error"
  });
});

app.get("/health", async () => ({
  ok: true,
  service: "loreforge-api"
}));

app.register(campaignsRoutes);
app.register(charactersRoutes);
app.register(chatRoutes);
app.register(pluginsRoutes);
app.register(sessionLogsRoutes);

async function start() {
  const port = Number(process.env.PORT ?? 3001);

  await app.listen({
    port,
    host: "0.0.0.0"
  });
}

async function shutdown(signal: string) {
  app.log.info({ signal }, "Shutting down LoreForge API");
  await app.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});

