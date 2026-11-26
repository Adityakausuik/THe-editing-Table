import assert from "node:assert/strict";
import test from "node:test";
import { createId, isValidId } from "./ids.js";

test("text IDs retain the legacy 24-character hexadecimal representation", () => {
  const id = createId();
  assert.match(id, /^[a-f\d]{24}$/);
  assert.equal(isValidId(id), true);
});

test("text ID validation rejects malformed or non-string values", () => {
  for (const value of [null, 123, "", "not-an-id", "undefined", "null", "[object Object]", "g".repeat(24), "a".repeat(23)]) {
    assert.equal(isValidId(value), false);
  }
  // Accepts standard UUIDs and 32-char hex IDs alongside 24-char IDs
  assert.equal(isValidId("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isValidId("a".repeat(32)), true);
  assert.equal(isValidId("b".repeat(24)), true);
});
