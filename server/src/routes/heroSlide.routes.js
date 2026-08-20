import { Router } from "express";
import {
  createHeroSlide,
  deleteHeroSlide,
  getAdminHeroSlides,
  getPublicHeroSlides,
  reorderHeroSlides,
  updateHeroSlide
} from "../controllers/heroSlide.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireMinimumRole } from "../middleware/rbac.js";

const router = Router();

// PUBLIC ENDPOINT
router.get("/", getPublicHeroSlides);

// ADMIN SPECIFIC ENDPOINTS (Must precede generic parameter routes)
router.get("/admin", authenticate, getAdminHeroSlides);
router.patch("/admin/reorder", authenticate, requireMinimumRole("editor"), reorderHeroSlides);
router.put("/admin/reorder", authenticate, requireMinimumRole("editor"), reorderHeroSlides);
router.post("/admin", authenticate, requireMinimumRole("editor"), createHeroSlide);

// ADMIN GENERIC PARAMETER ENDPOINTS
router.patch("/admin/:id", authenticate, requireMinimumRole("editor"), updateHeroSlide);
router.delete("/admin/:id", authenticate, requireMinimumRole("editor"), deleteHeroSlide);

export default router;
