import { getPostgresPool } from "./postgres.js";

export function buildRecentEnquiryDuplicateQuery(email, service, since) {
  return {
    text: 'SELECT "_id" FROM "enquiries" WHERE "email" = $1 AND "service" = $2 AND "created_at" >= $3 ORDER BY "created_at" DESC LIMIT 1',
    values: [email, service, since]
  };
}

export async function findRecentPostgresEnquiry(email, service, since) {
  const query = buildRecentEnquiryDuplicateQuery(email, service, since);
  const result = await getPostgresPool().query(query.text, query.values);
  return result.rows[0] || null;
}

export async function createPostgresEnquiry(enquiry) {
  const result = await getPostgresPool().query(
    `INSERT INTO "enquiries" ("name", "email", "phone", "service", "budget", "delivery_date", "reference_url", "description", "created_at", "updated_at") ` +
      `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now()) RETURNING "_id", "created_at"`,
    [
      enquiry.name,
      enquiry.email,
      enquiry.phone,
      enquiry.service,
      enquiry.budget,
      enquiry.deliveryDate,
      enquiry.referenceUrl,
      enquiry.description
    ]
  );
  return { _id: result.rows[0]._id, createdAt: result.rows[0].created_at };
}
