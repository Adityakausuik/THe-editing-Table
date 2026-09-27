import mongoose from "mongoose";
import { env } from "./env.js";
import { bootstrapDatabase } from "./bootstrap.js";

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

  // If connection dropped or failed previously, invalidate the stale promise
  if (mongoose.connection.readyState !== 2) {
    cachedConnection = null;
  }

  if (!cachedConnection) {
    cachedConnection = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        bufferCommands: false
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
