import assert from "node:assert/strict";
import { test } from "node:test";
import { fromPostgresSiteSetting } from "./siteSettingsRepository.js";

test("Site Setting rows preserve JSON values and expose the existing API shape", () => {
  const setting = fromPostgresSiteSetting({
    _id: "setting-id",
    key: "publicContent",
    value: { footer: { email: "hello@example.test" } },
    group: "footer",
    description: "Public footer content",
    updated_by: "user-id",
    __v: 2,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-02-01T00:00:00.000Z")
  });

  assert.equal(setting.key, "publicContent");
  assert.deepEqual(setting.value, { footer: { email: "hello@example.test" } });
  assert.equal(setting.updatedBy, "user-id");
  assert.equal(setting.__v, 2);
});

test("Site Setting row mapping preserves a missing record", () => {
  assert.equal(fromPostgresSiteSetting(undefined), null);
});
