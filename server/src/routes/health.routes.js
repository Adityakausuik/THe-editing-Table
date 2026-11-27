import { Router } from "express";
import { neonConfig } from "@neondatabase/serverless";
import { env } from "../config/env.js";
import { checkPostgresConnection, inspectPostgresSchema, ensurePostgresSchema, getLastPostgresError } from "../db/postgres.js";
import { isPostgresAuthEnabled } from "../config/databaseMode.js";
import { findPostgresAuthUserByEmail, getPostgresGlobalSecurityPolicy } from "../db/authRepository.js";
import { bootstrapPostgresDatabase } from "../config/bootstrap.js";
import { checkRedisHealth } from "../config/redis.js";

const router = Router();

export function buildHealthReadiness({
  postgresStatus = "connected",
  schemaStatus = "ready",
  postgresAuthEnabled = true,
  mediaStorageReady = true,
  cronConfigured = true
} = {}) {
  const services = {
    database: postgresStatus === "connected",
    schema: schemaStatus === "ready",
    authentication: Boolean(postgresAuthEnabled),
    publicMediaStorage: Boolean(mediaStorageReady),
    privateResumeStorage: Boolean(mediaStorageReady),
    scheduledMaintenance: Boolean(cronConfigured)
  };
  return {
    status: Object.values(services).every(Boolean) ? "ok" : "degraded",
    services
  };
}

router.get("/", async (req, res) => {
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
      postgresStatus = error.code === "DATABASE_URL_MISSING" ? "not_configured" : "unavailable";
    }
  }

  const mediaStorageReady = postgresStatus === "connected" && schemaStatus === "ready";

  const readiness = buildHealthReadiness({
    postgresStatus,
    schemaStatus,
    postgresAuthEnabled: isPostgresAuthEnabled(),
    mediaStorageReady,
    cronConfigured: Boolean(env.CRON_SECRET)
  });

  if (postgresStatus === "connected") {
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
        engine: "postgresql",
        status: postgresStatus
      },
      postgresql: {
        status: postgresStatus,
        schemaStatus,
        missingTables,
        configured: Boolean(env.DATABASE_URL),
        readyForTraffic: readiness.status === "ok",
        neonMediaStorageConfigured: Boolean(env.DATABASE_URL),
        error: getLastPostgresError() ? getLastPostgresError().message : null,
        errorCode: getLastPostgresError() ? getLastPostgresError().code : null
      },
      diagnostics: {
        serverVersion: "1.0.3-audit",
        wsConfigured: Boolean(neonConfig.webSocketConstructor),
        fetchFallbackActive: Boolean(neonConfig.poolQueryViaFetch),
        dbHost: env.DATABASE_URL ? new URL(env.DATABASE_URL.replace("postgresql://", "http://")).host : null,
        dbDatabase: env.DATABASE_URL ? new URL(env.DATABASE_URL.replace("postgresql://", "http://")).pathname : null
      },
      adminUser: adminInfo,
      securityPolicy: policyInfo,
      redis: await checkRedisHealth(),
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    }
  });
});

router.get("/redis", async (req, res) => {
  const health = await checkRedisHealth();
  res.json({
    success: true,
    message: "Redis cache health status",
    data: health
  });
});

export default router;
