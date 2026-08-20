import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireMinimumRole, requireRole } from "../middleware/rbac.js";
import {
  getDashboardStats,
  servicesCMS,
  portfolioCMS,
  weddingGalleryCMS,
  collaborationsCMS,
  blogCMS,
  teamCMS,
  partnersCMS,
  getEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
  getSiteSettings,
  getAdminSiteSettings,
  updateSiteSetting,
  getAuditLogs,
  getUsers,
  createUser,
  deleteUser
} from "../controllers/cms.controller.js";

const router = Router();

// Helper to register standard REST CRUD routes for a module
function registerModuleRoutes(modulePath, controller) {
  // Public Endpoint
  router.get(`/${modulePath}`, controller.getAll);

  // Admin Endpoints
  router.get(`/${modulePath}/admin`, authenticate, controller.getAdmin);
  router.post(`/${modulePath}`, authenticate, requireMinimumRole("editor"), controller.create);
  router.put(`/${modulePath}/reorder`, authenticate, requireMinimumRole("editor"), controller.reorder);
  router.post(`/${modulePath}/bulk-delete`, authenticate, requireMinimumRole("editor"), controller.bulkDelete);
  router.put(`/${modulePath}/:id`, authenticate, requireMinimumRole("editor"), controller.update);
  router.patch(`/${modulePath}/:id`, authenticate, requireMinimumRole("editor"), controller.update);
  router.patch(`/${modulePath}/:id/status`, authenticate, requireMinimumRole("editor"), controller.updateStatus);
  router.delete(`/${modulePath}/:id`, authenticate, requireMinimumRole("editor"), controller.delete);
  router.get(`/${modulePath}/:id`, controller.getOne);
}

// Public Settings Read Endpoint
router.get("/settings/admin", authenticate, requireMinimumRole("admin"), getAdminSiteSettings);
router.get("/settings", getSiteSettings);

// Register Module Routes
registerModuleRoutes("services", servicesCMS);
registerModuleRoutes("portfolio", portfolioCMS);
registerModuleRoutes("wedding-gallery", weddingGalleryCMS);
registerModuleRoutes("collaborations", collaborationsCMS);
registerModuleRoutes("blog", blogCMS);
registerModuleRoutes("team", teamCMS);
registerModuleRoutes("partners", partnersCMS);

// Overview Dashboard Stats
router.get("/stats", authenticate, getDashboardStats);

// Enquiries Management
router.get("/enquiries", authenticate, getEnquiries);
router.patch("/enquiries/:id/status", authenticate, requireMinimumRole("editor"), updateEnquiryStatus);
router.delete("/enquiries/:id", authenticate, requireMinimumRole("editor"), deleteEnquiry);

// Site Settings
router.post("/settings", authenticate, requireMinimumRole("admin"), updateSiteSetting);

// Audit Logs & User Management
router.get("/audit-logs", authenticate, requireRole("superadmin"), getAuditLogs);
router.get("/users", authenticate, requireRole("superadmin"), getUsers);
router.post("/users", authenticate, requireRole("superadmin"), createUser);
router.delete("/users/:id", authenticate, requireRole("superadmin"), deleteUser);

export default router;
