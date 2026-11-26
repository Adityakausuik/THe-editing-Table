import test from "node:test";
import assert from "node:assert/strict";
import { isPostgresAuthEnabled, isPostgresSelected } from "./databaseMode.js";

test("PostgreSQL is always selected as the only application database", () => {
  assert.equal(isPostgresSelected(), true);
  assert.equal(isPostgresAuthEnabled(), true);
  assert.equal(isPostgresSelected({}), true);
  assert.equal(isPostgresAuthEnabled({}), true);
});
