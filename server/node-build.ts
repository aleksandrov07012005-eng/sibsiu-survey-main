import path from "path";
import { createServer } from "./index";
import * as express from "express";
import { runMigrations } from "./db/migrate";

// Run migrations before starting the server
runMigrations().catch((err) => {
  console.error("Failed to run migrations:", err);
  // Continue anyway - migrations might have already run
});

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const __dirname = path.resolve();
const distPath = path.join(__dirname, "dist", "spa");

console.log("Looking for frontend files in:", distPath);

// Проверяем существование папки
import fs from "fs";
if (!fs.existsSync(distPath)) {
  console.error("Frontend build not found! Run 'pnpm build:client' first");
  console.log("To fix this, run: pnpm build:client");
  process.exit(1);
}

if (!fs.existsSync(path.join(distPath, "index.html"))) {
  console.error("index.html not found in build directory");
  console.log("💡 The build might be incomplete. Try: pnpm build:client");
  process.exit(1);
}

// Serve static files
app.use(express.static(distPath));

// Handle client-side routing - serve index.html for all non-API routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next(); // Пропускаем API routes
  }

  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(port, () => {
  console.log(`🚀 Production server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
  console.log(`🏥 Health: http://localhost:${port}/api/health`);
  console.log(`📁 Serving files from: ${distPath}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
