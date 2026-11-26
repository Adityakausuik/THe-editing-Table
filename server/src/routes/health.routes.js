import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.model.js";
import SecurityPolicy from "../models/SecurityPolicy.model.js";
import { env } from "../config/env.js";
import { checkPostgresConnection, inspectPostgresSchema, ensurePostgresSchema } from "../db/postgres.js";
import { isPostgresAuthEnabled, isPostgresSelected } from "../config/databaseMode.js";
import { isBlobStorageConfigured } from "../utils/blobStorage.js";
import { connectGridFs, isGridFsConfigured, isGridFsConnected } from "../config/gridfsDb.js";
import { findPostgresAuthUserByEmail, getPostgresGlobalSecurityPolicy } from "../db/authRepository.js";
import { bootstrapPostgresDatabase } from "../config/bootstrap.js";

const router = Router();

export function buildHealthReadiness({ postgresSelected, postgresStatus, schemaStatus, mongoConnected, postgresAuthEnabled, mediaStorageReady, publicBlobConfigured, privateBlobConfigured, cronConfigured }) {
  if (!postgresSelected) {
    return {
      status: mongoConnected ? "ok" : "degraded",
      services: { database: mongoConnected }
    };
  }

  const services = {
    database: postgresStatus === "connected",
    schema: schemaStatus === "ready",
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
  let schemaStatus = "unavailable";
  let missingTables = [];
  let adminInfo = null;
  let policyInfo = null;

  if (env.DATABASE_URL) {
    try {
      postgresStatus = (await checkPostgresConnection()) ? "connected" : "unavailable";
      if (postgresStatus === "connected") {
        const schema = await ensurePostgresSchema();
        schemaStatus = schema.status;
        missingTables = schema.missingTables;
        await bootstrapPostgresDatabase().catch(() => {});
      }
    } catch (error) {
      // Keep provider details and credentials out of the public health response.
      postgresStatus = error.code === "DATABASE_URL_MISSING" ? "not_configured" : "unavailable";
    }
  }

  // GridFS is a legacy rollback path and must not be opened by PostgreSQL
  // Preview requests. Media readiness is provided by the explicitly configured
  // blob stores once those credentials are provisioned.
  if (!postgresSelected && !isBlobStorageConfigured("public") && isGridFsConfigured() && !isGridFsConnected()) {
    await connectGridFs().catch(() => {});
  }

  const mediaStorageReady = postgresSelected && postgresStatus === "connected" && schemaStatus === "ready";

  const readiness = buildHealthReadiness({
    postgresSelected,
    postgresStatus,
    schemaStatus,
    mongoConnected: connected,
    postgresAuthEnabled: isPostgresAuthEnabled(),
    mediaStorageReady,
    publicBlobConfigured: isBlobStorageConfigured("public"),
    privateBlobConfigured: isBlobStorageConfigured("private"),
    cronConfigured: Boolean(env.CRON_SECRET)
  });

  if (postgresSelected && isPostgresAuthEnabled() && postgresStatus === "connected") {
    try {
      const admin = await findPostgresAuthUserByEmail("admin@theeditingtable.com");
      if (admin) {
        adminInfo = {
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          twoFactorDisabled: !admin.twoFactor?.enabled && !admin.twoFactor?.required,
          isLocked: Boolean(admin.accountLockUntil && admin.accountLockUntil > new Date())
        };
      }
      const policy = await getPostgresGlobalSecurityPolicy();
      if (policy) {
        policyInfo = {
          requireAdmin2FA: policy.requireAdmin2FA,
          requireUser2FA: policy.requireUser2FA,
          maxFailedAttempts: policy.maxFailedAttempts
        };
      }
    } catch {
      // Readiness stays available even when optional auth metadata is absent.
    }
  } else if (connected) {
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
        status: postgresSelected ? "disabled" : connected ? "connected" : "disconnected",
        readyState: postgresSelected ? 0 : mongoose.connection.readyState,
        dbName: postgresSelected ? null : mongoose.connection.name || null
      },
      postgresql: {
        status: postgresStatus,
        schemaStatus: postgresSelected ? schemaStatus : "not_selected",
        missingTables: postgresSelected ? missingTables : [],
        configured: Boolean(env.DATABASE_URL),
        readyForTraffic: postgresSelected && readiness.status === "ok",
        neonMediaStorageConfigured: postgresSelected && Boolean(env.DATABASE_URL)
      },
      adminUser: adminInfo,
      securityPolicy: policyInfo,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
