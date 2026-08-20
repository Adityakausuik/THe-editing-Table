import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().optional(),
  CLIENT_ORIGIN: z.string().url().optional(),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/the-editing-table"),
  JWT_SECRET: z.string().min(24).default("development-only-change-this-secret"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  TWO_FACTOR_ENCRYPTION_KEY: z.string().min(32).optional(),
  ADMIN_EMAIL: z.string().email().default("admin@theeditingtable.com"),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  ADMIN_SETUP_TOKEN: z.string().min(24).optional()
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && value.JWT_SECRET === "development-only-change-this-secret") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_SECRET"],
      message: "JWT_SECRET must be changed in production."
    });
  }
  if (value.NODE_ENV === "production" && !value.TWO_FACTOR_ENCRYPTION_KEY) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["TWO_FACTOR_ENCRYPTION_KEY"],
      message: "TWO_FACTOR_ENCRYPTION_KEY is required in production."
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  CLIENT_URL: data.CLIENT_URL || data.CLIENT_ORIGIN || "http://localhost:5173",
  CLIENT_ORIGIN: data.CLIENT_ORIGIN || data.CLIENT_URL || "http://localhost:5173"
};
