import { createPostgresEnquiry, findRecentPostgresEnquiry } from "../db/enquiryRepository.js";
import { validateEnquiryInput } from "../validators/enquiry.validator.js";
import { isPostgresSelected } from "../config/databaseMode.js";
import { checkPostgresConnection } from "../db/postgres.js";

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

    // Enquiries are purely stored in Neon PostgreSQL.

    const postgresReady = await checkPostgresConnection().catch(() => false);
    if (!postgresReady) {
      return res.status(503).json({
        success: false,
        code: "DATABASE_UNAVAILABLE",
        message: "Database service is temporarily offline. Please reach out via email or phone while we reconnect.",
        data: null
      });
    }

    const { name, email, phone, service, budget, deliveryDate, referenceUrl, description } = normalizedData;

    // Rate limiting / Duplicate prevention check (e.g. within 2 minutes)
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedService = service.trim();
    const cutoff = new Date(Date.now() - 2 * 60 * 1000);
    const recentDuplicate = await findRecentPostgresEnquiry(normalizedEmail, normalizedService, cutoff);

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
    const enquiry = await createPostgresEnquiry(enquiryData);

    return res.status(201).json({
      success: true,
      message: "Your enquiry has been received successfully! Our creative director will respond within 24 hours.",
      data: {
        _id: enquiry._id ?? enquiry.id,
        id: enquiry._id ?? enquiry.id,
        createdAt: enquiry.createdAt
      }
    });
  } catch (err) {
    if (isPostgresSelected() && err?.code === "42P01") {
      return res.status(503).json({
        success: false,
        code: "DATABASE_SCHEMA_UNAVAILABLE",
        message: "The inquiry service is not ready yet. Please try again shortly.",
        data: null
      });
    }
    next(err);
  }
}
