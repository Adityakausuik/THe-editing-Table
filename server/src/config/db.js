import mongoose from "mongoose";
import { env } from "./env.js";

// Disable command buffering globally so queries fail-fast when DB is offline instead of hanging for 10s
mongoose.set("bufferCommands", false);

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (env.NODE_ENV === "test") {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
      bufferCommands: false
    });
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }

  return mongoose.connection;
}
