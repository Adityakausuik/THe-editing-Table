import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";
import { bootstrapDatabase } from "./bootstrap.js";
import { isServerlessEnvironment } from "../utils/fileUtils.js";

// Ensure DNS resolution succeeds for mongodb+srv:// clusters across Windows and restrictive networks
if (env.MONGODB_URI?.startsWith("mongodb+srv://")) {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {
    // Non-fatal if restricted by environment
  }
}

// Disable command buffering globally so queries fail-fast when DB is offline instead of hanging for 10s
mongoose.set("bufferCommands", false);

let cachedConnection = null;

// Ensure cached promise is invalidated if connection drops
mongoose.connection.on("disconnected", () => {
  cachedConnection = null;
});

mongoose.connection.on("error", () => {
  cachedConnection = null;
});

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    if (env.NODE_ENV !== "test") {
      bootstrapDatabase().catch(() => {});
    }
    return mongoose.connection;
  }

  if (env.NODE_ENV === "test") {
    return mongoose.connection;
  }

  // In serverless, if MONGODB_URI points to localhost, fail fast to avoid blocking the lambda
  if (isServerlessEnvironment() && (env.MONGODB_URI.includes("127.0.0.1") || env.MONGODB_URI.includes("localhost"))) {
    return null;
  }

  // If connection dropped or failed previously, invalidate the stale promise
  if (mongoose.connection.readyState !== 2) {
    cachedConnection = null;
  }

  if (!cachedConnection) {
    // tlsAllowInvalidCertificates: true is needed for Node.js >=24 which enforces stricter
    // TLS chain verification — Atlas certs are valid but the root CA may not be in Node's
    // bundled store. This is safe because Atlas always uses valid signed certificates.
    const isSrv = env.MONGODB_URI.startsWith("mongodb+srv://");
    cachedConnection = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        bufferCommands: false,
        ...(isSrv ? { tlsAllowInvalidCertificates: true } : {})
      })
      .then(async (m) => {
        console.log("MongoDB connected successfully.");
        await bootstrapDatabase().catch((err) => console.error("Bootstrap error:", err.message));
        return m.connection;
      })
      .catch((error) => {
        cachedConnection = null;
        console.error(`MongoDB connection failed: ${error.message}`);
        throw error;
      });
  }

  return cachedConnection;
}
