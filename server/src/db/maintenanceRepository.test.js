import test from "node:test";
import assert from "node:assert/strict";
import { buildExpiredRowsDeleteQuery, cleanupExpiredPostgresRecords } from "./maintenanceRepository.js";

test("expired-row cleanup SQL uses an allowlisted table and bounded locking batches", () => {
  const query = buildExpiredRowsDeleteQuery("sessions", 250);
  assert.match(query.text, /SELECT ctid FROM sessions WHERE expires_at <= \$1 ORDER BY expires_at LIMIT \$2 FOR UPDATE SKIP LOCKED/);
  assert.match(query.text, /DELETE FROM sessions AS target USING expired WHERE target\.ctid = expired\.ctid/);
  assert.throws(() => buildExpiredRowsDeleteQuery('sessions; DROP TABLE "users"'), /Unsupported expiration table/);
  assert.throws(() => buildExpiredRowsDeleteQuery("sessions", 0), /batch size/);
});

test("expiration cleanup removes records in bounded batches and reports table counts", async () => {
  const calls = [];
  const batches = new Map([
    ["emailotps", [2]],
    ["sessions", [3, 1]],
    ["trusteddevices", [0]],
    ["media_upload_sessions", [1]]
  ]);
  const pool = {
    async query(sql, values) {
      const table = ["emailotps", "sessions", "trusteddevices", "media_upload_sessions"].find((name) => sql.includes(`FROM ${name} WHERE`));
      calls.push({ table, values });
      const next = batches.get(table);
      return { rowCount: next.shift() };
    }
  };
  const now = new Date("2026-10-19T00:00:00Z");
  const deleted = await cleanupExpiredPostgresRecords({ pool, now, batchSize: 3 });

  assert.deepEqual(deleted, { emailotps: 2, sessions: 4, trusteddevices: 0, media_upload_sessions: 1 });
  assert.equal(calls.length, 5);
  assert.ok(calls.every((call) => call.values[0] === now && call.values[1] === 3));
});
