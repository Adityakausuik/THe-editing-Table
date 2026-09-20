import { Navigate } from "react-router-dom";

/**
 * TeamCMS is decommissioned in favor of AboutMeCMS.
 * Cleanly redirects any direct navigations to /admin/about-me.
 */
export default function TeamCMS() {
  return <Navigate to="/admin/about-me" replace />;
}
