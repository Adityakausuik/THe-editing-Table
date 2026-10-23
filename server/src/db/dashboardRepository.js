import { getPostgresPool } from "./postgres.js";
import AuditLog from "../models/AuditLog.model.js";
import Enquiry from "../models/Enquiry.model.js";
import { mapPostgresCmsRow } from "./cmsRepository.js";

export const POSTGRES_DASHBOARD_STATS_QUERY = `SELECT
  (SELECT COUNT(*) FROM "enquiries")::integer AS "total_enquiries",
  (SELECT COUNT(*) FROM "enquiries" WHERE "status" = 'new')::integer AS "new_enquiries",
  (SELECT COUNT(*) FROM "blogposts")::integer AS "total_blog_posts",
  (SELECT COUNT(*) FROM "portfolioitems")::integer AS "total_portfolio_items",
  (SELECT COUNT(*) FROM "weddinggalleryitems")::integer AS "total_gallery_items",
  (SELECT COUNT(*) FROM "teammembers")::integer AS "total_team_members",
  (SELECT COUNT(*) FROM "partners")::integer AS "total_partners"`;

export async function getPostgresDashboardData() {
  const pool = getPostgresPool();
  const [statsResult, logsResult, enquiriesResult] = await Promise.all([
    pool.query(POSTGRES_DASHBOARD_STATS_QUERY),
    pool.query('SELECT * FROM "auditlogs" ORDER BY "created_at" DESC NULLS LAST LIMIT 10'),
    pool.query('SELECT * FROM "enquiries" ORDER BY "created_at" DESC NULLS LAST LIMIT 5')
  ]);
  const stats = statsResult.rows[0] || {};
  return {
    stats: {
      totalEnquiries: Number(stats.total_enquiries || 0),
      newEnquiries: Number(stats.new_enquiries || 0),
      totalBlogPosts: Number(stats.total_blog_posts || 0),
      totalPortfolioItems: Number(stats.total_portfolio_items || 0),
      totalGalleryItems: Number(stats.total_gallery_items || 0),
      totalTeamMembers: Number(stats.total_team_members || 0),
      totalPartners: Number(stats.total_partners || 0)
    },
    recentLogs: logsResult.rows.map((row) => mapPostgresCmsRow(AuditLog, row)),
    recentEnquiries: enquiriesResult.rows.map((row) => mapPostgresCmsRow(Enquiry, row))
  };
}
