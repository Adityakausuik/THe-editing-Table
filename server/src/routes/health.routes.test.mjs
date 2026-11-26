import assert from "node:assert/strict";
import test from "node:test";
import { buildHealthReadiness } from "./health.routes.js";

const postgresReady = {
  postgresStatus: "connected",
  schemaStatus: "ready",
  postgresAuthEnabled: true,
  mediaStorageReady: true,
  cronConfigured: true
};

test("PostgreSQL readiness requires database, auth, media storage, and cron configuration", () => {
  assert.deepEqual(buildHealthReadiness(postgresReady), {
    status: "ok",
    services: {
      database: true,
      schema: true,
      authentication: true,
      publicMediaStorage: true,
      privateResumeStorage: true,
      scheduledMaintenance: true
    }
  });

  for (const setting of ["postgresStatus", "schemaStatus", "postgresAuthEnabled", "mediaStorageReady", "cronConfigured"]) {
    const incomplete = { ...postgresReady, [setting]: setting === "postgresStatus" || setting === "schemaStatus" ? "unavailable" : false };
    assert.equal(buildHealthReadiness(incomplete).status, "degraded", `${setting} must gate readiness`);
  }
});
