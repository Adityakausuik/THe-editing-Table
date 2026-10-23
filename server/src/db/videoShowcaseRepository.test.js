import test from "node:test";
import assert from "node:assert/strict";
import { buildPostgresVideoAdminListQuery } from "./videoShowcaseRepository.js";

test("video showcase admin listing parameterizes filters and escapes LIKE metacharacters", () => {
  const query = buildPostgresVideoAdminListQuery({
    search: "home%_\\film",
    category: "Wedding",
    sourceType: "upload",
    status: "active",
    featured: "false",
    isTrash: true,
    page: 3,
    limit: 20
  });

  assert.match(query.count.text, /"deleted_at" IS NOT NULL/);
  assert.match(query.count.text, /"is_active" = TRUE/);
  assert.match(query.count.text, /"is_featured" = FALSE/);
  assert.match(query.count.text, /"category" = \$1/);
  assert.match(query.count.text, /"source_type" = \$2/);
  assert.match(query.count.text, /ILIKE \$3/);
  assert.doesNotMatch(query.count.text, /home%_\\film/);
  assert.deepEqual(query.count.values, ["Wedding", "upload", "%home\\%\\_\\\\film%"]);
  assert.match(query.list.text, /ORDER BY "order" ASC, "created_at" DESC NULLS LAST LIMIT \$4 OFFSET \$5/);
  assert.deepEqual(query.list.values, ["Wedding", "upload", "%home\\%\\_\\\\film%", 20, 40]);
});

test("video showcase admin listing clamps pagination and only uses allowlisted sort columns", () => {
  const query = buildPostgresVideoAdminListQuery({ page: 0, limit: 9999, sort: "views; DROP TABLE users" });

  assert.match(query.list.text, /ORDER BY "order" ASC, "created_at" DESC NULLS LAST/);
  assert.match(query.list.text, /LIMIT \$1 OFFSET \$2/);
  assert.deepEqual(query.list.values, [250, 0]);
  assert.equal(query.page, 1);
  assert.equal(query.limit, 250);
});
