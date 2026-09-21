import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";
import { API_PREFIX } from "../../shared/constants.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { rejectUnsafeInput } from "./middleware/requestSecurity.js";
import healthRoutes from "./routes/health.routes.js";
import enquiryRoutes from "./routes/enquiry.routes.js";
import authRoutes from "./routes/auth.routes.js";
import securityRoutes from "./routes/security.routes.js";
import cmsRoutes from "./routes/cms.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import heroSlideRoutes from "./routes/heroSlide.routes.js";
import { adminVideoShowcaseRouter, publicVideoShowcaseRouter } from "./routes/videoShowcase.routes.js";
import { adminPhotoShowcaseRouter, publicPhotoShowcaseRouter } from "./routes/photoShowcase.routes.js";
import { adminContactRouter, publicContactRouter } from "./routes/contact.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import careersRoutes from "./routes/careers.routes.js";
import { ensureUploadDirectories, resolveUploadsDirectory } from "./utils/fileUtils.js";
import { sanitizeStudio } from "./utils/sanitizeStudio.js";
import {
  beginTwoFactorSetup,
  login,
  resetDefaultAdmin,
  resendEmailOtp,
  verifyEmailOtp,
  verifyLoginTwoFactor,
  verifyTwoFactorSetup
} from "./controllers/auth.controller.js";

const explicitOrigins = new Set([
  env.CLIENT_ORIGIN,
  env.CLIENT_URL,
  ...(env.NODE_ENV === "production" ? [] : ["http://127.0.0.1:5173", "http://localhost:5173"])
].filter(Boolean));

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (explicitOrigins.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname === "theeditingtable.com" || hostname.endsWith(".theeditingtable.com")) return true;
    if (hostname.endsWith(".vercel.app")) return true;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  } catch {
    return false;
  }
  return false;
}

export function createApp() {
  ensureUploadDirectories();
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(compression());
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }
        const error = new Error(`CORS origin not allowed: ${origin}`);
        error.status = 403;
        callback(error);
      },
      credentials: true
    })
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(cookieParser());
  app.use(rejectUnsafeInput);

  // ─── Debug route (temporary, BEFORE URL normalizer) ───
  app.all(["/api/debug", "/debug"], (req, res) => {
    return res.json({
      success: true,
      message: "Pre-normalizer debug (raw Vercel values)",
      debug: {
        url: req.url,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path,
        method: req.method,
        vercelHeaders: {
          "x-vercel-original-path": req.headers["x-vercel-original-path"] || null,
          "x-matched-path": req.headers["x-matched-path"] || null,
          "x-forwarded-uri": req.headers["x-forwarded-uri"] || null,
          "x-original-url": req.headers["x-original-url"] || null,
          "x-vercel-id": req.headers["x-vercel-id"] || null
        },
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Normalize request URLs so both /api/... and stripped /... route properly in serverless
  app.use((req, res, next) => {
    // On Vercel serverless, req.url may be "/api/index.js" (the rewrite destination)
    // instead of the actual client-requested path. We need to recover the real path.
    const candidates = [
      req.headers["x-vercel-original-path"],
      req.headers["x-forwarded-uri"],
      req.headers["x-original-url"],
      // x-matched-path may be the rewrite dest, but check it last
      req.originalUrl,
      req.url
    ].filter(Boolean);

    // Find the best candidate: prefer one that looks like a real API path, not an internal rewrite
    let resolvedUrl = req.url;
    for (const candidate of candidates) {
      const clean = candidate.split("?")[0];
      // Skip internal rewrite destinations
      if (clean.includes("index.js") || clean.includes("index.html")) continue;
      resolvedUrl = clean;
      break;
    }

    // Apply the resolved URL
    if (resolvedUrl !== req.url) {
      req.url = resolvedUrl;
    }

    // Ensure the URL has the /api prefix for our Express routes
    if (
      !req.url.startsWith("/api/") &&
      req.url !== "/api" &&
      !req.url.startsWith("/uploads") &&
      !req.url.startsWith("/health")
    ) {
      req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
    }
    next();
  });

  // ─── Debug route (temporary, AFTER URL normalizer) ───
  app.all("/api/debug-resolved", (req, res) => {
    return res.json({
      success: true,
      message: "Post-normalizer debug (after URL transformation)",
      debug: {
        url: req.url,
        originalUrl: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Auto-connect to database in serverless runtime environments
  app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1 && env.NODE_ENV !== "test") {
      try {
        await connectDatabase();
      } catch {
        // Non-blocking: individual controllers that require DB will handle 503 if DB is down
      }
    }
    next();
  });

  app.use(API_PREFIX, (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const plain = JSON.parse(JSON.stringify(body));
        return originalJson(sanitizeStudio(plain));
      } catch {
        return originalJson(sanitizeStudio(body));
      }
    };
    next();
  });

  // Static uploads directory with caching headers for media assets
  const staticUploadsDir = resolveUploadsDirectory();
  app.use(
    "/uploads",
    express.static(staticUploadsDir, {
      etag: true,
      maxAge: "30d",
      lastModified: true,
      fallthrough: true,
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      }
    })
  );

  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  // Direct top-level bindings to guarantee 100% resolution on Vercel Serverless
  const directResetPaths = [
    "/api/v1/auth/reset-admin",
    "/api/auth/reset-admin",
    "/v1/auth/reset-admin",
    "/auth/reset-admin",
    "/reset-admin",
    "/api/v1/auth/reset",
    "/api/auth/reset",
    "/v1/auth/reset",
    "/auth/reset",
    "/reset"
  ];
  directResetPaths.forEach((path) => {
    app.all(path, resetDefaultAdmin);
  });

  const directLoginPaths = [
    "/api/v1/auth/login",
    "/api/auth/login",
    "/v1/auth/login",
    "/auth/login",
    "/login"
  ];
  directLoginPaths.forEach((path) => {
    app.post(path, login);
  });

  const directVerifyPaths = [
    "/api/v1/auth/2fa/verify",
    "/api/auth/2fa/verify",
    "/v1/auth/2fa/verify",
    "/auth/2fa/verify"
  ];
  directVerifyPaths.forEach((path) => {
    app.post(path, verifyLoginTwoFactor);
  });

  const directOtpVerifyPaths = [
    "/api/v1/auth/2fa/otp/verify",
    "/api/auth/2fa/otp/verify",
    "/v1/auth/2fa/otp/verify",
    "/auth/2fa/otp/verify",
    "/api/v1/auth/2fa/verify-otp",
    "/api/auth/2fa/verify-otp",
    "/v1/auth/2fa/verify-otp",
    "/auth/2fa/verify-otp",
    "/api/v1/auth/otp/verify",
    "/api/auth/otp/verify",
    "/v1/auth/otp/verify",
    "/auth/otp/verify"
  ];
  directOtpVerifyPaths.forEach((path) => {
    app.post(path, verifyEmailOtp);
  });

  const directOtpResendPaths = [
    "/api/v1/auth/2fa/otp/resend",
    "/api/auth/2fa/otp/resend",
    "/v1/auth/2fa/otp/resend",
    "/auth/2fa/otp/resend",
    "/api/v1/auth/2fa/resend-otp",
    "/api/auth/2fa/resend-otp",
    "/v1/auth/2fa/resend-otp",
    "/auth/2fa/resend-otp",
    "/api/v1/auth/otp/resend",
    "/api/auth/otp/resend",
    "/v1/auth/otp/resend",
    "/auth/otp/resend"
  ];
  directOtpResendPaths.forEach((path) => {
    app.post(path, resendEmailOtp);
  });

  const directSetupBeginPaths = [
    "/api/v1/auth/2fa/setup/begin",
    "/api/auth/2fa/setup/begin",
    "/v1/auth/2fa/setup/begin",
    "/auth/2fa/setup/begin"
  ];
  directSetupBeginPaths.forEach((path) => {
    app.post(path, beginTwoFactorSetup);
  });

  const directSetupVerifyPaths = [
    "/api/v1/auth/2fa/setup/verify",
    "/api/auth/2fa/setup/verify",
    "/v1/auth/2fa/setup/verify",
    "/auth/2fa/setup/verify"
  ];
  directSetupVerifyPaths.forEach((path) => {
    app.post(path, verifyTwoFactorSetup);
  });

  app.use("/health", healthRoutes);
  app.use(`${API_PREFIX}/health`, healthRoutes);
  app.use(`${API_PREFIX}/v1/auth`, authRoutes);
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use("/v1/auth", authRoutes);
  app.use("/auth", authRoutes);
  app.use(`${API_PREFIX}/v1/security`, securityRoutes);
  app.use(`${API_PREFIX}/v1/upload`, uploadRoutes);
  app.use(`${API_PREFIX}/v1/cms/hero-slides`, heroSlideRoutes);
  app.use(`${API_PREFIX}/v1/cms`, cmsRoutes);
  app.use(`${API_PREFIX}/v1/media`, mediaRoutes);
  app.use(`${API_PREFIX}/v1/enquiries`, enquiryRoutes);
  app.use(`${API_PREFIX}/enquiries`, enquiryRoutes);
  app.use(`${API_PREFIX}/v1/reviews`, reviewRoutes);

  // Video Showcase Routes
  app.use(`${API_PREFIX}/v1/video-showcase`, publicVideoShowcaseRouter);
  app.use(`${API_PREFIX}/video-showcase`, publicVideoShowcaseRouter);
  app.use(`${API_PREFIX}/v1/admin/video-showcase`, adminVideoShowcaseRouter);
  app.use(`${API_PREFIX}/admin/video-showcase`, adminVideoShowcaseRouter);

  // Photo Showcase Routes
  app.use(`${API_PREFIX}/v1/photo-showcase`, publicPhotoShowcaseRouter);
  app.use(`${API_PREFIX}/photo-showcase`, publicPhotoShowcaseRouter);
  app.use(`${API_PREFIX}/v1/admin/photo-showcase`, adminPhotoShowcaseRouter);
  app.use(`${API_PREFIX}/admin/photo-showcase`, adminPhotoShowcaseRouter);

  // Contact Info Routes (Public & Admin)
  app.use(`${API_PREFIX}/v1/contact`, publicContactRouter);
  app.use(`${API_PREFIX}/contact`, publicContactRouter);
  app.use(`${API_PREFIX}/v1/admin/contact`, adminContactRouter);
  app.use(`${API_PREFIX}/admin/contact`, adminContactRouter);

  // Careers & Job Applications Routes (Public & Admin)
  app.use(`${API_PREFIX}/v1/careers`, careersRoutes);
  app.use(`${API_PREFIX}/careers`, careersRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;
