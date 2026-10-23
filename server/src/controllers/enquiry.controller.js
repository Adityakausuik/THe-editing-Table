import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { createPostgresEnquiry, findRecentPostgresEnquiry } from "../db/enquiryRepository.js";
import { Enquiry } from "../models/Enquiry.model.js";
import { validateEnquiryInput } from "../validators/enquiry.validator.js";
import { isPostgresSelected } from "../config/databaseMode.js";

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export async function createEnquiry(req, res, next) {
  try {
    const { isValid, errors, normalizedData } = validateEnquiryInput(req.body);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        data: { errors }
      });
    }

    const usePostgres = isPostgresSelected();
    if (env.VERCEL_ENV === "preview" && !usePostgres) {
      return res.status(503).json({
        success: false,
        message: "Database service is temporarily offline. Please reach out via email or phone while we reconnect.",
        data: null
      });
    }

    if (!usePostgres && !isDbConnected()) {
      await connectDatabase().catch(() => {});
    }

    if (!usePostgres && !isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database service is temporarily offline. Please reach out via email or phone while we reconnect.",
        data: null
      });
    }

    const { name, email, phone, service, budget, deliveryDate, referenceUrl, description } = normalizedData;

    // Rate limiting / Duplicate prevention check (e.g. within 2 minutes)
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedService = service.trim();
    const cutoff = new Date(Date.now() - 2 * 60 * 1000);
    const recentDuplicate = usePostgres
      ? await findRecentPostgresEnquiry(normalizedEmail, normalizedService, cutoff)
      : await Enquiry.findOne({ email: normalizedEmail, service: normalizedService, createdAt: { $gte: cutoff } });

    if (recentDuplicate) {
      return res.status(429).json({
        success: false,
        message: "An identical enquiry was submitted recently. Please wait a moment before submitting again.",
        data: null
      });
    }

    const enquiryData = {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : "",
      service: normalizedService,
      budget: budget ? budget.trim() : "Discuss after scope",
      deliveryDate: deliveryDate ? deliveryDate.trim() : "",
      referenceUrl: referenceUrl ? referenceUrl.trim() : "",
      description: description.trim()
    };
    const enquiry = usePostgres
      ? await createPostgresEnquiry(enquiryData)
      : await Enquiry.create(enquiryData);

    return res.status(201).json({
      success: true,
      message: "Your enquiry has been received successfully! Our creative director will respond within 24 hours.",
      data: {
        id: enquiry._id,
        createdAt: enquiry.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}
