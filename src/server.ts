import "dotenv/config";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { ZodError } from "zod";
import { pool } from "./db";
import { authRoutes } from "./routes/auth";
import { campaignsRoutes } from "./routes/campaigns";
import { charactersRoutes } from "./routes/characters";
import { chatRoutes } from "./routes/chat";
import { dashboardRoutes } from "./routes/dashboard";
import { diceRoutes } from "./routes/dice";
import { locationsRoutes } from "./routes/locations";
import { npcsRoutes } from "./routes/npcs";
import { pluginsRoutes } from "./routes/plugins";
import { scenesRoutes } from "./routes/scenes";
import { sessionLogsRoutes } from "./routes/sessionLogs";

const app = Fastify({
  logger: true
});

const corsOrigins = (
  process.env.CORS_ORIGIN ??
  process.env.FRONTEND_URL ??
  "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.register(cors, {
  origin: corsOrigins,
  credentials: true
});

app.register(cookie, {
  secret: process.env.AUTH_COOKIE_SECRET ?? "dev-cookie-secret-change-me"
});

app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: "Validation error",
      issues: error.issues
    });
  }

  if (error instanceof Error && error.name === "Unauthorized") {
    return reply.code(401).send({
      error: error.message
    });
  }

  if (error instanceof Error && error.name === "Forbidden") {
    return reply.code(403).send({
      error: error.message
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

app.register(authRoutes);
app.register(campaignsRoutes);
app.register(dashboardRoutes);
app.register(charactersRoutes);
app.register(chatRoutes);
app.register(diceRoutes);
app.register(locationsRoutes);
app.register(npcsRoutes);
app.register(pluginsRoutes);
app.register(scenesRoutes);
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
