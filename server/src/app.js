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
      credentials: true,
      optionsSuccessStatus: 204
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

  // Normalize request URLs so both /api/... and stripped /... route properly in serverless
  app.use((req, res, next) => {
    const rawUrl = req.url || "";
    let cleanPath = rawUrl;

    // If Vercel rewrote to internal file destination like /api/index.js, recover from originalUrl or headers
    if (cleanPath.includes("index.js") || cleanPath.includes("index.html")) {
      const candidates = [
        req.headers["x-vercel-original-path"],
        req.headers["x-forwarded-uri"],
        req.headers["x-original-url"],
        req.originalUrl
      ].filter(Boolean);

      for (const candidate of candidates) {
        if (!candidate.includes("index.js") && !candidate.includes("index.html")) {
          cleanPath = candidate;
          break;
        }
      }
    }

    // Separate path and query string
    const [pathOnly, queryString] = cleanPath.split("?");
    let normalized = pathOnly;

    // Fix double /api/api/ if present
    while (normalized.startsWith("/api/api/")) {
      normalized = normalized.slice(4);
    }

    // Ensure /api prefix for API routes (skip static uploads, health)
    if (
      !normalized.startsWith("/api/") &&
      normalized !== "/api" &&
      !normalized.startsWith("/uploads") &&
      !normalized.startsWith("/health")
    ) {
      normalized = `/api${normalized.startsWith("/") ? "" : "/"}${normalized}`;
    }

    req.url = queryString ? `${normalized}?${queryString}` : normalized;
    next();
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

  app.get("/api", (req, res) => {
    res.json({
      success: true,
      name: "The Editing Table API",
      status: "online",
      version: "1.0.0",
      timestamp: new Date().toISOString()
    });
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
