import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import mongoose from "mongoose";
import net from "node:net";

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();

    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the existing dev server or run: npm run kill:ports`);
      }
      reject(error);
    });

    probe.once("listening", () => {
      probe.close(resolve);
    });

    probe.listen(port);
  });
}

function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    server.once("listening", () => {
      console.log(`API listening on http://127.0.0.1:${port}`);
      resolve(server);
    });

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the existing backend or run: npm run kill:ports`);
      }
      reject(error);
    });
  });
}

async function bootstrap() {
  const port = Number(env.PORT);
  await assertPortAvailable(port);
  await connectDatabase();

  const app = createApp();
  const server = await listen(app, port);

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down API.`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  if (error.code !== "EADDRINUSE") {
    console.error("Failed to start API:", error.message);
  }
  process.exit(1);
});
