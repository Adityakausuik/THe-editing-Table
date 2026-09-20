import { Navigate } from "react-router-dom";

/**
 * TeamPage is decommissioned in favor of the consolidated About Me page (/about).
 */
export default function TeamPage() {
  return <Navigate to="/about" replace />;
}
