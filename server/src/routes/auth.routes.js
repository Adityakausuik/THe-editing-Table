import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  beginTwoFactorSetup,
  getMe,
  initializeAdmin,
  login,
  logout,
  verifyLoginTwoFactor,
  verifyTwoFactorSetup
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Please try again later.", data: null }
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many security verification attempts. Please try again later.", data: null }
});

router.post("/login", authLimiter, login);
router.post("/2fa/verify", verificationLimiter, verifyLoginTwoFactor);
router.post("/2fa/setup/begin", verificationLimiter, beginTwoFactorSetup);
router.post("/2fa/setup/verify", verificationLimiter, verifyTwoFactorSetup);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);
router.post("/security/2fa/setup/begin", authenticate, verificationLimiter, beginTwoFactorSetup);
router.post("/security/2fa/setup/verify", authenticate, verificationLimiter, verifyTwoFactorSetup);
router.post("/initialize-admin", authLimiter, initializeAdmin);

export default router;
