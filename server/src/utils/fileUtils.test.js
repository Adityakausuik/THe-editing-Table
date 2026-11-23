import test from "node:test";
import assert from "node:assert/strict";
import { shouldDeleteManagedBlob } from "./fileUtils.js";

test("managed Blob objects remain available to the Mongo rollback source during PostgreSQL mode", () => {
  assert.equal(shouldDeleteManagedBlob({ postgresSelected: true }), false);
  assert.equal(shouldDeleteManagedBlob({ postgresSelected: true, allowPostgresDeletion: true }), true);
  assert.equal(shouldDeleteManagedBlob({ postgresSelected: false }), true);
});
