import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { REQUIRED_POSTGRES_TABLES } from "./postgres.js";

test("PostgreSQL readiness contract matches every table declared by migration 0001", async () => {
  const sql = await readFile(new URL("../../migrations/0001_initial_postgres_schema.sql", import.meta.url), "utf8");
  const declaredTables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+"?([a-z_]+)"?\s*\(/gi)]
    .map((match) => match[1].toLowerCase())
    .sort();

  assert.deepEqual([...REQUIRED_POSTGRES_TABLES].sort(), declaredTables);
});
