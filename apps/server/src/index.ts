import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { monitorRoutes } from "./routes/monitors";
import { channelRoutes } from "./routes/channels";
import { initScheduler, stopAll } from "./scheduler";

const port = Number(process.env.PORT ?? 3000);

const app = new Elysia()
  .use(cors())
  .use(monitorRoutes)
  .use(channelRoutes)
  .get("/api/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .listen(port);

console.log(`Spidey server running at http://localhost:${port}`);

// Start all active monitors' cron jobs
initScheduler().catch((err) => {
  console.error("Failed to initialise scheduler:", err);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  stopAll();
  process.exit(0);
});

export type App = typeof app;
