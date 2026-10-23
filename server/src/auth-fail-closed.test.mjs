import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
const [{ login, resetDefaultAdmin }, { authenticate }, { signAccessToken }] = await Promise.all([
  import("./controllers/auth.controller.js"),
  import("./middleware/auth.js"),
  import("./lib/jwt.js")
]);

function responseDouble() {
  return {
    statusCode: 200,
    body: null,
    cookies: [],
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    cookie(...args) { this.cookies.push(args); return this; },
    clearCookie(...args) { this.cookies.push(args); return this; }
  };
}

test("login fails closed without a connected authentication database", async () => {
  const res = responseDouble();
  await login({ body: { email: "admin@theeditingtable.com", password: "anything" } }, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.success, false);
  assert.equal(res.cookies.length, 0);
});

test("retired admin reset endpoint never returns or writes default credentials", async () => {
  const res = responseDouble();
  await resetDefaultAdmin({}, res);

  assert.equal(res.statusCode, 410);
  assert.equal(res.body.success, false);
  assert.doesNotMatch(JSON.stringify(res.body), /admin@theeditingtable\.com/i);
  assert.equal(res.body.data, null);
});

test("signed emergency fallback sessions are rejected", async () => {
  const token = signAccessToken({
    type: "access",
    id: "000000000000000000000001",
    role: "superadmin",
    sid: "fallback-session-123"
  });
  const res = responseDouble();
  let nextCalled = false;
  await authenticate({ get: () => `Bearer ${token}`, cookies: {} }, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});
