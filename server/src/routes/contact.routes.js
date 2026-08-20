import { Router } from "express";
import {
  createAdminEmail,
  createAdminOffice,
  createAdminPhone,
  createAdminWorkingHours,
  deleteAdminEmail,
  deleteAdminOffice,
  deleteAdminPhone,
  deleteAdminWorkingHours,
  getAdminEmails,
  getAdminOffices,
  getAdminPhones,
  getAdminSettings,
  getAdminWorkingHours,
  getPublicContactInfo,
  reorderAdminEmails,
  reorderAdminOffices,
  reorderAdminPhones,
  reorderAdminWorkingHours,
  updateAdminEmail,
  updateAdminOffice,
  updateAdminPhone,
  updateAdminSettings,
  updateAdminWorkingHours
} from "../controllers/contact.controller.js";
import { authenticate } from "../middleware/auth.js";

export const publicContactRouter = Router();
export const adminContactRouter = Router();

// Public route
publicContactRouter.get("/", getPublicContactInfo);

// Protected admin routes
adminContactRouter.use(authenticate);

// Settings
adminContactRouter.get("/settings", getAdminSettings);
adminContactRouter.put("/settings", updateAdminSettings);

// Phones
adminContactRouter.get("/phones", getAdminPhones);
adminContactRouter.post("/phones", createAdminPhone);
adminContactRouter.patch("/phones/reorder", reorderAdminPhones);
adminContactRouter.put("/phones/:id", updateAdminPhone);
adminContactRouter.delete("/phones/:id", deleteAdminPhone);

// Emails
adminContactRouter.get("/emails", getAdminEmails);
adminContactRouter.post("/emails", createAdminEmail);
adminContactRouter.patch("/emails/reorder", reorderAdminEmails);
adminContactRouter.put("/emails/:id", updateAdminEmail);
adminContactRouter.delete("/emails/:id", deleteAdminEmail);

// Offices
adminContactRouter.get("/offices", getAdminOffices);
adminContactRouter.post("/offices", createAdminOffice);
adminContactRouter.patch("/offices/reorder", reorderAdminOffices);
adminContactRouter.put("/offices/:id", updateAdminOffice);
adminContactRouter.delete("/offices/:id", deleteAdminOffice);

// Working Hours
adminContactRouter.get("/hours", getAdminWorkingHours);
adminContactRouter.post("/hours", createAdminWorkingHours);
adminContactRouter.patch("/hours/reorder", reorderAdminWorkingHours);
adminContactRouter.put("/hours/:id", updateAdminWorkingHours);
adminContactRouter.delete("/hours/:id", deleteAdminWorkingHours);
