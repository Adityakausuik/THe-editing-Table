import assert from "node:assert/strict";
import { test } from "node:test";
import { fromPostgresAboutMe } from "./aboutMeRepository.js";

test("About Me Postgres rows map to the API's camelCase shape", () => {
  const row = fromPostgresAboutMe({
    _id: "507f1f77bcf86cd799439011",
    key: "about_me_content",
    full_name: "Test Name",
    about_paragraphs: ["One", "Two"],
    what_ido: [{ title: "Editing", description: "Careful work", tag: "POST" }],
    philosophy_pillars: [{ title: "Care", description: "Every frame" }],
    updated_by: "507f1f77bcf86cd799439012",
    __v: 3,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-02-01T00:00:00.000Z")
  });

  assert.equal(row._id, "507f1f77bcf86cd799439011");
  assert.equal(row.fullName, "Test Name");
  assert.deepEqual(row.aboutParagraphs, ["One", "Two"]);
  assert.deepEqual(row.whatIDo, [{ title: "Editing", description: "Careful work", tag: "POST" }]);
  assert.equal(row.updatedBy, "507f1f77bcf86cd799439012");
  assert.equal(row.__v, 3);
});

test("About Me Postgres row mapping preserves a missing record", () => {
  assert.equal(fromPostgresAboutMe(undefined), null);
});
