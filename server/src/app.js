import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { API_PREFIX } from "../../shared/constants.js";
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
import { ensureUploadDirectories, UPLOADS_DIR } from "./utils/fileUtils.js";

const allowedOrigins = new Set([
  env.CLIENT_ORIGIN,
  env.CLIENT_URL,
  ...(env.NODE_ENV === "production" ? [] : ["http://127.0.0.1:5173", "http://localhost:5173"])
].filter(Boolean));

export function createApp() {
  ensureUploadDirectories();
  const app = express();

  app.disable("x-powered-by");
  app.use(compression());
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
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

  app.use(API_PREFIX, (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // Static uploads directory with caching headers for media assets
  app.use(
    "/uploads",
    express.static(UPLOADS_DIR, {
      etag: true,
      maxAge: "30d",
      lastModified: true,
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      }
    })
  );

  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  app.use("/health", healthRoutes);
  app.use(`${API_PREFIX}/health`, healthRoutes);
  app.use(`${API_PREFIX}/v1/auth`, authRoutes);
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
