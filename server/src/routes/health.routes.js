import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.model.js";
import SecurityPolicy from "../models/SecurityPolicy.model.js";

const router = Router();

router.get("/", async (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  let adminInfo = null;
  let policyInfo = null;

  if (connected) {
    try {
      const admin = await User.findOne({ email: "admin@theeditingtable.com" }).lean();
      if (admin) {
        adminInfo = {
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          twoFactorDisabled: !admin.twoFactor?.enabled && !admin.twoFactor?.required,
          isLocked: Boolean(admin.accountLockUntil && admin.accountLockUntil > new Date())
        };
      }
      const policy = await SecurityPolicy.findOne({ key: "global" }).lean();
      if (policy) {
        policyInfo = {
          requireAdmin2FA: policy.requireAdmin2FA,
          requireUser2FA: policy.requireUser2FA,
          maxFailedAttempts: policy.maxFailedAttempts
        };
      }
    } catch {
      // Non-blocking
    }
  }

  res.json({
    success: true,
    message: "API health retrieved successfully",
    data: {
      status: "ok",
      mongodb: {
        status: connected ? "connected" : "disconnected",
        readyState: mongoose.connection.readyState,
        dbName: mongoose.connection.name || null
      },
      adminUser: adminInfo,
      securityPolicy: policyInfo,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
