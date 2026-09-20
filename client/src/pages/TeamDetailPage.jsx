import { Navigate } from "react-router-dom";

/**
 * TeamDetailPage is decommissioned in favor of the consolidated About Me page (/about).
 */
export default function TeamDetailPage() {
  return <Navigate to="/about" replace />;
}
