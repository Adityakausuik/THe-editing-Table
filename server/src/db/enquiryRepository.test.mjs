import assert from "node:assert/strict";
import test from "node:test";
import { buildRecentEnquiryDuplicateQuery } from "./enquiryRepository.js";

test("enquiry duplicate check parameterizes normalized input and cutoff", () => {
  const since = new Date("2026-10-16T00:00:00.000Z");
  const query = buildRecentEnquiryDuplicateQuery("client@example.com", "Wedding Films", since);

  assert.match(query.text, /"email" = \$1/);
  assert.match(query.text, /"service" = \$2/);
  assert.match(query.text, /"created_at" >= \$3/);
  assert.deepEqual(query.values, ["client@example.com", "Wedding Films", since]);
});
