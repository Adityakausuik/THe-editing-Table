import test from "node:test";
import assert from "node:assert/strict";
import { POSTGRES_DASHBOARD_STATS_QUERY } from "./dashboardRepository.js";

test("dashboard aggregate counts use the deployed PostgreSQL collection names", () => {
  for (const table of ["enquiries", "blogposts", "portfolioitems", "weddinggalleryitems", "teammembers", "partners"]) {
    assert.match(POSTGRES_DASHBOARD_STATS_QUERY, new RegExp(`FROM \\"${table}\\"`));
  }
  assert.match(POSTGRES_DASHBOARD_STATS_QUERY, /"status" = 'new'/);
  assert.match(POSTGRES_DASHBOARD_STATS_QUERY, /AS "total_enquiries"/);
});
