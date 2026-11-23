import assert from "node:assert/strict";
import test from "node:test";
import { buildPostgresJobApplicationsQuery } from "./careersRepository.js";

test("careers application list uses bound filters, escaped search and selected sort order", () => {
  const query = buildPostgresJobApplicationsQuery({
    jobId: "507f1f77bcf86cd799439011",
    status: "Reviewing",
    search: "A%_\\B",
    sort: "oldest"
  });

  assert.match(query.text, /applications\."job_id" = \$1/);
  assert.match(query.text, /applications\."status" = \$2/);
  assert.match(query.text, /applications\."applicant_name" ILIKE \$3/);
  assert.match(query.text, /applications\."email" ILIKE \$3/);
  assert.match(query.text, /LEFT JOIN "jobs"/);
  assert.match(query.text, /ORDER BY applications\."created_at" ASC/);
  assert.deepEqual(query.values, ["507f1f77bcf86cd799439011", "Reviewing", "%A\\%\\_\\\\B%"]);
});
