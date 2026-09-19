import { Navigate } from "react-router-dom";

/**
 * Deprecated HeroCMS:
 * The Homepage Hero Section has been redesigned into a minimal, luxury logo-only presentation.
 * Hero photo, description, and slider fields have been retired in accordance with brand identity.
 */
export default function HeroCMS() {
  return <Navigate to="/admin/dashboard" replace />;
}
