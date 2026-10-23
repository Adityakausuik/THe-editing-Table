import test from "node:test";
import assert from "node:assert/strict";
import { buildPostgresPhotoAdminListQuery } from "./photoShowcaseRepository.js";

test("photo showcase admin listing parameterizes filters and paginates consistently", () => {
  const query = buildPostgresPhotoAdminListQuery({
    search: "venue%_name",
    category: "Wedding",
    status: "active",
    isTrash: true,
    page: 3,
    limit: 20
  });

  assert.match(query.count.text, /"deleted_at" IS NOT NULL/);
  assert.match(query.count.text, /"is_active" = TRUE/);
  assert.match(query.count.text, /"category" = \$1/);
  assert.match(query.count.text, /ILIKE \$2/);
  assert.doesNotMatch(query.count.text, /venue%_name/);
  assert.deepEqual(query.count.values, ["Wedding", "%venue\\%\\_name%"]);
  assert.match(query.list.text, /ORDER BY "order" ASC, "created_at" DESC NULLS LAST LIMIT \$3 OFFSET \$4/);
  assert.deepEqual(query.list.values, ["Wedding", "%venue\\%\\_name%", 20, 40]);
});

test("photo showcase list clamps invalid page sizes and supports the non-trash filter", () => {
  const query = buildPostgresPhotoAdminListQuery({ page: -4, limit: 9999, isTrash: false });

  assert.match(query.count.text, /"deleted_at" IS NULL/);
  assert.deepEqual(query.list.values, [250, 0]);
  assert.equal(query.page, 1);
  assert.equal(query.limit, 250);
});
