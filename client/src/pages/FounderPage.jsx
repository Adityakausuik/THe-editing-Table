import { Navigate } from "react-router-dom";

/**
 * FounderPage is decommissioned in favor of the consolidated About Me page (/about).
 */
export default function FounderPage() {
  return <Navigate to="/about" replace />;
}
