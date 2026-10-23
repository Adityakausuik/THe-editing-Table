import assert from "node:assert/strict";
import { test } from "node:test";
import Service from "../models/Service.model.js";
import CareersContent from "../models/CareersContent.model.js";
import Job from "../models/Job.model.js";
import Enquiry from "../models/Enquiry.model.js";
import ContactPhone from "../models/ContactPhone.model.js";
import { buildPostgresCmsFilter } from "./cmsRepository.js";

test("CMS filters parameterize category and escaped search text", () => {
  const result = buildPostgresCmsFilter(Service, {
    publicFilter: { isPublished: true },
    category: "Wedding' OR TRUE --",
    search: "%_\\' OR TRUE --"
  });

  assert.match(result.clauses, /"is_published" = \$1/);
  assert.match(result.clauses, /"category" = \$2/);
  assert.match(result.clauses, /"title" ILIKE \$3/);
  assert.doesNotMatch(result.clauses, /TRUE|Wedding/);
  assert.deepEqual(result.values, [true, "Wedding' OR TRUE --", "%\\%\\_\\\\' OR TRUE --%"]);
});

test("CMS filter omits fields absent from a model schema", () => {
  const result = buildPostgresCmsFilter(Service, { category: "All", search: "title" });
  assert.equal(result.clauses.includes('"category"'), false);
  assert.deepEqual(result.values, ["%title%"]);
});

test("public careers reads filter active jobs and the single configured content record", () => {
  const jobs = buildPostgresCmsFilter(Job, { publicFilter: { status: "Active" } });
  const content = buildPostgresCmsFilter(CareersContent, { publicFilter: { key: "careers_page_content" } });

  assert.equal(jobs.clauses, ' WHERE "status" = $1');
  assert.deepEqual(jobs.values, ["Active"]);
  assert.equal(content.clauses, ' WHERE "key" = $1');
  assert.deepEqual(content.values, ["careers_page_content"]);
});

test("admin enquiry search covers name, email, and description with bound values", () => {
  const result = buildPostgresCmsFilter(Enquiry, {
    publicFilter: { status: "new" },
    search: "client@example.com"
  });

  assert.match(result.clauses, /"status" = \$1/);
  assert.match(result.clauses, /"name" ILIKE \$2/);
  assert.match(result.clauses, /"email" ILIKE \$2/);
  assert.match(result.clauses, /"description" ILIKE \$2/);
  assert.deepEqual(result.values, ["new", "%client@example.com%"]);
});

test("contact public filter generates IS NULL for soft-deleted rows", () => {
  const result = buildPostgresCmsFilter(ContactPhone, {
    publicFilter: { status: "active", deletedAt: null }
  });

  assert.equal(result.clauses, ' WHERE "status" = $1 AND "deleted_at" IS NULL');
  assert.deepEqual(result.values, ["active"]);
});
