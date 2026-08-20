import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.js";
import { requireMinimumRole, requireRole } from "../middleware/rbac.js";
import {
  changePassword,
  disableOwnTwoFactor,
  getManagedUsers,
  getOwnSecurity,
  getSecurityAuditLogs,
  getSecurityPolicy,
  regenerateRecoveryCodes,
  resetUserTwoFactor,
  revokeDevice,
  revokeOtherSessions,
  revokeSession,
  revokeUserSessions,
  unlockUser,
  updateSecurityPolicy,
  updateUserSecurityRequirement
} from "../controllers/security.controller.js";

const router = Router();
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many security requests. Try again later.", data: null }
});

router.use(authenticate);
router.get("/me", getOwnSecurity);
router.post("/password", sensitiveLimiter, changePassword);
router.post("/recovery-codes", sensitiveLimiter, regenerateRecoveryCodes);
router.post("/2fa/disable", sensitiveLimiter, disableOwnTwoFactor);
router.delete("/devices/:id", sensitiveLimiter, revokeDevice);
router.delete("/sessions/:id", sensitiveLimiter, revokeSession);
router.post("/sessions/revoke-others", sensitiveLimiter, revokeOtherSessions);

router.get("/admin/users", requireMinimumRole("admin"), getManagedUsers);
router.patch("/admin/users/:id/requirement", requireMinimumRole("admin"), sensitiveLimiter, updateUserSecurityRequirement);
router.post("/admin/users/:id/reset-2fa", requireMinimumRole("admin"), sensitiveLimiter, resetUserTwoFactor);
router.post("/admin/users/:id/revoke-sessions", requireMinimumRole("admin"), sensitiveLimiter, revokeUserSessions);
router.post("/admin/users/:id/unlock", requireMinimumRole("admin"), sensitiveLimiter, unlockUser);

router.get("/policy", requireRole("superadmin"), getSecurityPolicy);
router.put("/policy", requireRole("superadmin"), sensitiveLimiter, updateSecurityPolicy);
router.get("/audit-logs", requireRole("superadmin"), getSecurityAuditLogs);

export default router;
