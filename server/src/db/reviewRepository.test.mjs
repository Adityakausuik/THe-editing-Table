import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPublicReviewFilter } from "./reviewRepository.js";

test("public review filters parameterize values and escape LIKE wildcards", () => {
  const result = buildPublicReviewFilter({ rating: "5", projectType: "Wedding", search: "%_\\' OR TRUE --" });
  assert.match(result.where, /"rating" = \$1/);
  assert.match(result.where, /"project_type" = \$2/);
  assert.match(result.where, /"title" ILIKE \$3/);
  assert.doesNotMatch(result.where, /Wedding|TRUE/);
  assert.deepEqual(result.values, [5, "Wedding", "%\\%\\_\\\\' OR TRUE --%"]);
});

test("review search without optional filters remains parameterized", () => {
  const result = buildPublicReviewFilter({ search: "bride", rating: undefined, projectType: "All" });
  assert.match(result.where, /"status" = 'approved'/);
  assert.match(result.where, /ILIKE \$1/);
  assert.deepEqual(result.values, ["%bride%"]);
});
