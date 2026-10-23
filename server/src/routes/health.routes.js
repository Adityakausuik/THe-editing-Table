import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.model.js";
import SecurityPolicy from "../models/SecurityPolicy.model.js";
import { env } from "../config/env.js";
import { checkPostgresConnection } from "../db/postgres.js";
import { isPostgresAuthEnabled, isPostgresSelected } from "../config/databaseMode.js";
import { isBlobStorageConfigured } from "../utils/blobStorage.js";
import { connectGridFs, isGridFsConfigured, isGridFsConnected } from "../config/gridfsDb.js";

const router = Router();

export function buildHealthReadiness({ postgresSelected, postgresStatus, mongoConnected, postgresAuthEnabled, mediaStorageReady, publicBlobConfigured, privateBlobConfigured, cronConfigured }) {
  if (!postgresSelected) {
    return {
      status: mongoConnected ? "ok" : "degraded",
      services: { database: mongoConnected }
    };
  }

  const services = {
    database: postgresStatus === "connected",
    authentication: Boolean(postgresAuthEnabled),
    publicMediaStorage: Boolean(publicBlobConfigured || mediaStorageReady),
    privateResumeStorage: Boolean(privateBlobConfigured || mediaStorageReady),
    scheduledMaintenance: Boolean(cronConfigured)
  };
  return {
    status: Object.values(services).every(Boolean) ? "ok" : "degraded",
    services
  };
}

router.get("/", async (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  const postgresSelected = isPostgresSelected();
  let postgresStatus = env.DATABASE_URL ? "unavailable" : "not_configured";
  let adminInfo = null;
  let policyInfo = null;

  if (env.DATABASE_URL) {
    try {
      postgresStatus = (await checkPostgresConnection()) ? "connected" : "unavailable";
    } catch (error) {
      // Keep provider details and credentials out of the public health response.
      postgresStatus = error.code === "DATABASE_URL_MISSING" ? "not_configured" : "unavailable";
    }
  }

  if (postgresSelected && !isBlobStorageConfigured("public") && isGridFsConfigured() && !isGridFsConnected()) {
    await connectGridFs().catch(() => {});
  }

  const readiness = buildHealthReadiness({
    postgresSelected,
    postgresStatus,
    mongoConnected: connected,
    postgresAuthEnabled: isPostgresAuthEnabled(),
    mediaStorageReady: isGridFsConnected(),
    publicBlobConfigured: isBlobStorageConfigured("public"),
    privateBlobConfigured: isBlobStorageConfigured("private"),
    cronConfigured: Boolean(env.CRON_SECRET)
  });

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
      status: readiness.status,
      readiness: readiness.services,
      activeDatabase: {
        engine: postgresSelected ? "postgresql" : "mongodb",
        status: postgresSelected ? postgresStatus : connected ? "connected" : "disconnected"
      },
      mongodb: {
        status: connected ? "connected" : "disconnected",
        readyState: mongoose.connection.readyState,
        dbName: mongoose.connection.name || null
      },
      postgresql: {
        status: postgresStatus,
        configured: Boolean(env.DATABASE_URL),
        readyForTraffic: postgresSelected && readiness.status === "ok"
      },
      adminUser: adminInfo,
      securityPolicy: policyInfo,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
