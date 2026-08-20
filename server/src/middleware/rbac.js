import { ROLE_HIERARCHY } from "../../../shared/constants.js";

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions", data: null });
    }

    return next();
  };
}

export function requireMinimumRole(minimumRole) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role || (ROLE_HIERARCHY[role] ?? 0) < (ROLE_HIERARCHY[minimumRole] ?? 0)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions", data: null });
    }

    return next();
  };
}
