import express from "express";
import cors from "cors";
import helmet from "helmet";
import client from "prom-client";
import { runMigrations } from "./db/migrate";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const globalAny = globalThis as any;

const register: client.Registry =
  globalAny.__sibsiuPromRegister || new client.Registry();

if (!globalAny.__sibsiuPromRegister) {
  globalAny.__sibsiuPromRegister = register;
  client.collectDefaultMetrics({ register, prefix: "sibsiu_" });
}

let httpRequestDurationSeconds = register.getSingleMetric(
  "sibsiu_http_request_duration_seconds",
) as client.Histogram<string> | undefined;

if (!httpRequestDurationSeconds) {
  httpRequestDurationSeconds = new client.Histogram({
    name: "sibsiu_http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  });

  register.registerMetric(httpRequestDurationSeconds);
}
import cookieParser from "cookie-parser";
import { handleDemo } from "./routes/demo";
import surveysRouter from "./routes/surveys";
import questionnairesRouter from "./routes/questionnaires";
import programsRouter from "./routes/programs";
import graphqlRouter from "./routes/graphql";
import authRouter from "./routes/auth";
import accessRouter from "./routes/access";
import { attachSession } from "./middleware/auth";

export function createServer() {
  const app = express();

  runMigrations().catch((err) => {
    console.error("Migration error (non-blocking):", err);
  });

  // Trust proxy - required for secure cookies behind HTTPS load balancer
  app.set("trust proxy", 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "'unsafe-inline'"],
      },
    },
  }));
  app.use(
    cors({
      credentials: true,
      origin: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachSession);

  app.use((req, res, next) => {
    const end = httpRequestDurationSeconds.startTimer({
      method: req.method,
      route: req.path,
    });
    res.on("finish", () => {
      end({ status_code: res.statusCode });
    });
    next();
  });

  const clientPath = path.resolve(__dirname, '../../dist/spa');
  app.use(express.static(clientPath));
  app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next(); // не трогаем API
      res.sendFile(path.join(clientPath, 'index.html'));
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      message: "Server is running",
    });
  });

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });

  app.get("/api/demo", handleDemo);

  app.use("/api/auth", authRouter);
  app.use("/api/surveys", surveysRouter);
  app.use("/api/questionnaires", questionnairesRouter);
  app.use("/api/programs", programsRouter);
  app.use("/api/access", accessRouter);
  app.use("/api/graphql", graphqlRouter);

  app.use("/api", (req, res) => {
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.originalUrl}`,
    });
  });

  return app;
}
