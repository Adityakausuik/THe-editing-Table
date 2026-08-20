import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.json({
    success: true,
    message: "API health retrieved successfully",
    data: {
      status: "ok",
      mongodb: {
        status: connected ? "connected" : "disconnected",
        readyState: mongoose.connection.readyState
      },
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
