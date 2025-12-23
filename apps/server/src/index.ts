import "dotenv/config";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { server } from "./config";
import { authRouter } from "./routes/auth";
import { debugRouter } from "./routes/debug";
import { filesRouter } from "./routes/files";
import { jobsRouter } from "./routes/jobs";
import { pipelineRouter } from "./routes/pipeline";
import { queuesRouter } from "./routes/queues";
import { reelsRouter } from "./routes/reels/index";
import { templatesRouter } from "./routes/templates";
import { trendsRouter } from "./routes/trends";
import { trimRouter } from "./routes/trim";
import { video } from "./routes/video";
import { closeAllQueues, initAllWorkers } from "./services/queues";

const app = new OpenAPIHono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: server.corsOrigin,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    credentials: true,
  })
);

// Register OpenAPI documentation route
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Trender API",
    description:
      "API for video analysis, Instagram scraping, and AI video generation.",
  },
});

// Register security scheme for OpenAPI
app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// Swagger UI
app.get(
  "/reference",
  apiReference({
    theme: "purple",
    layout: "modern",
    url: "/doc",
  })
);

app.route("/api/video", video);
app.route("/api/reels", reelsRouter);
app.route("/api/templates", templatesRouter);
app.route("/api/trends", trendsRouter);
app.route("/api/files", filesRouter);
app.route("/api/queues", queuesRouter);
app.route("/api/pipeline", pipelineRouter);
app.route("/api/jobs", jobsRouter);
app.route("/api/trim", trimRouter);
app.route("/api/debug", debugRouter);
app.route("/api/v1/auth", authRouter);

// Scene-based analysis and generation
const scenesRouter = await import("./routes/scenes");
app.route("/api/scenes", scenesRouter.default);

app.get("/", (c) => c.text("OK"));

// Initialize workers on startup
initAllWorkers();

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  console.log(`\n[Server] Received ${signal}, starting graceful shutdown...`);

  try {
    await closeAllQueues();
    console.log("[Server] Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("[Server] Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
