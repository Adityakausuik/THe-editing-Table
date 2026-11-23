import { getPostgresPool } from "./postgres.js";

const JSON_COLUMNS = new Set(["about_paragraphs", "skills", "what_i_do", "philosophy_pillars"]);
const fieldToColumn = (field) => field.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

export function fromPostgresAboutMe(row) {
  if (!row) return null;
  return {
    _id: row._id,
    key: row.key,
    fullName: row.full_name,
    designation: row.designation,
    location: row.location,
    profileImage: row.profile_image,
    quote: row.quote,
    introBadge: row.intro_badge,
    introTitle: row.intro_title,
    introSubtitle: row.intro_subtitle,
    aboutHeading: row.about_heading,
    aboutParagraphs: row.about_paragraphs,
    visionHeading: row.vision_heading,
    visionText: row.vision_text,
    experienceYears: row.experience_years,
    experienceHeading: row.experience_heading,
    experienceText: row.experience_text,
    skills: row.skills,
    whatIDo: row.what_ido,
    companyRoleHeading: row.company_role_heading,
    companyRoleText: row.company_role_text,
    philosophyPillars: row.philosophy_pillars,
    updatedBy: row.updated_by,
    __v: row.__v,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function findAboutMe(key = "about_me_content") {
  const result = await getPostgresPool().query(
    'SELECT * FROM "aboutmes" WHERE "key" = $1 LIMIT 1',
    [key]
  );
  return fromPostgresAboutMe(result.rows[0]);
}

export async function saveAboutMe(updateFields, key = "about_me_content") {
  const values = [key];
  const columns = ['"key"'];
  const placeholders = ["$1"];
  const updates = [];

  for (const [field, value] of Object.entries(updateFields)) {
    const column = fieldToColumn(field);
    const index = values.push(JSON_COLUMNS.has(column) ? JSON.stringify(value) : value);
    columns.push(`"${column}"`);
    placeholders.push(JSON_COLUMNS.has(column) ? `$${index}::jsonb` : `$${index}`);
    updates.push(`"${column}" = EXCLUDED."${column}"`);
  }
  updates.push('"updated_at" = now()', '"__v" = "aboutmes"."__v" + 1');

  const result = await getPostgresPool().query(
    `INSERT INTO "aboutmes" (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) ` +
      `ON CONFLICT ("key") DO UPDATE SET ${updates.join(", ")} RETURNING *`,
    values
  );
  return fromPostgresAboutMe(result.rows[0]);
}

export async function writeAboutMeAudit(user, action, entityId, details) {
  await getPostgresPool().query(
    `INSERT INTO "auditlogs" ("user", "user_email", "role", "action", "entity", "entity_id", "details", "result") ` +
      `VALUES ($1, $2, $3, $4, 'AboutMe', $5, $6::jsonb, 'success')`,
    [user?.id || null, user?.email || "system", user?.role || "system", action, entityId, JSON.stringify(details)]
  );
}
