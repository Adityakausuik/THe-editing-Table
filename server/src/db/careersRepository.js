import { getPostgresPool } from "./postgres.js";
import { mapPostgresCmsRow } from "./cmsRepository.js";
import JobApplication from "../models/JobApplication.model.js";

function mapApplicationRow(row) {
  if (!row) return null;
  const { populated_job: populatedJob, ...applicationRow } = row;
  const application = mapPostgresCmsRow(JobApplication, applicationRow);
  application.jobId = populatedJob;
  return application;
}

export function buildPostgresJobApplicationsQuery({ jobId, status, search, sort = "newest" } = {}) {
  const clauses = [];
  const values = [];
  const add = (clause, value) => {
    values.push(value);
    clauses.push(clause.replace("?", `$${values.length}`));
  };
  if (jobId) add('applications."job_id" = ?', String(jobId));
  if (status && status !== "all") add('applications."status" = ?', status);
  if (search) {
    const escaped = String(search).replace(/[\\%_]/g, "\\$&");
    values.push(`%${escaped}%`);
    const parameter = `$${values.length}`;
    clauses.push(`(applications."applicant_name" ILIKE ${parameter} ESCAPE E'\\\\' OR applications."email" ILIKE ${parameter} ESCAPE E'\\\\' OR applications."phone" ILIKE ${parameter} ESCAPE E'\\\\' OR applications."position_title" ILIKE ${parameter} ESCAPE E'\\\\')`);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const direction = sort === "oldest" ? "ASC" : "DESC";
  return {
    text: `SELECT applications.*, CASE WHEN jobs."_id" IS NULL THEN NULL ELSE jsonb_build_object('_id', jobs."_id", 'title', jobs."title", 'department', jobs."department", 'location', jobs."location') END AS "populated_job" ` +
      `FROM "jobapplications" AS applications LEFT JOIN "jobs" AS jobs ON jobs."_id" = applications."job_id"${where} ORDER BY applications."created_at" ${direction} NULLS LAST`,
    values
  };
}

export async function listPostgresJobApplications(options = {}) {
  const query = buildPostgresJobApplicationsQuery(options);
  const result = await getPostgresPool().query(query.text, query.values);
  return result.rows.map(mapApplicationRow);
}

export async function getPostgresJobApplication(id) {
  const result = await getPostgresPool().query(
    `SELECT applications.*, CASE WHEN jobs."_id" IS NULL THEN NULL ELSE jsonb_build_object('_id', jobs."_id", 'title', jobs."title", 'department', jobs."department", 'location', jobs."location") END AS "populated_job" ` +
      `FROM "jobapplications" AS applications LEFT JOIN "jobs" AS jobs ON jobs."_id" = applications."job_id" WHERE applications."_id" = $1 LIMIT 1`,
    [String(id)]
  );
  return mapApplicationRow(result.rows[0]);
}

export async function getPostgresCareersStats() {
  const result = await getPostgresPool().query(
    `SELECT ` +
      `(SELECT COUNT(*)::int FROM "jobs") AS "total_jobs", ` +
      `(SELECT COUNT(*)::int FROM "jobs" WHERE "status" = 'Active') AS "active_jobs", ` +
      `(SELECT COUNT(*)::int FROM "jobapplications") AS "total_applications", ` +
      `(SELECT COUNT(*)::int FROM "jobapplications" WHERE "status" = 'New') AS "new_applications", ` +
      `(SELECT COUNT(*)::int FROM "jobapplications" WHERE "status" = 'Reviewing') AS "reviewing_applications", ` +
      `(SELECT COUNT(*)::int FROM "jobapplications" WHERE "status" = 'Shortlisted') AS "shortlisted_applications", ` +
      `(SELECT COUNT(*)::int FROM "jobapplications" WHERE "status" = 'Interview') AS "interview_applications", ` +
      `(SELECT COUNT(*)::int FROM "jobapplications" WHERE "status" = 'Selected') AS "selected_applications", ` +
      `(SELECT COUNT(*)::int FROM "jobapplications" WHERE "status" = 'Rejected') AS "rejected_applications"`
  );
  const row = result.rows[0];
  return {
    totalJobs: row.total_jobs,
    activeJobs: row.active_jobs,
    inactiveJobs: row.total_jobs - row.active_jobs,
    totalApplications: row.total_applications,
    newApplications: row.new_applications,
    reviewingApplications: row.reviewing_applications,
    shortlisted: row.shortlisted_applications,
    interview: row.interview_applications,
    hired: row.selected_applications,
    rejected: row.rejected_applications
  };
}
