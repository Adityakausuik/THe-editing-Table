import test from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedCronRequest } from "./cronAuth.js";

test("cron endpoint authorization requires a configured Bearer secret and compares safely", () => {
  const secret = "a-secret-value-long-enough";
  assert.equal(isAuthorizedCronRequest(`Bearer ${secret}`, secret), true);
  assert.equal(isAuthorizedCronRequest(secret, secret), false);
  assert.equal(isAuthorizedCronRequest("Bearer wrong-secret", secret), false);
  assert.equal(isAuthorizedCronRequest(`Bearer ${secret}`, undefined), false);
  assert.equal(isAuthorizedCronRequest(undefined, secret), false);
});
