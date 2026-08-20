import { Enquiry } from "../models/Enquiry.model.js";
import { validateEnquiryInput } from "../validators/enquiry.validator.js";

export async function createEnquiry(req, res, next) {
  try {
    const { isValid, errors } = validateEnquiryInput(req.body);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        data: { errors }
      });
    }

    const { name, email, phone, service, budget, deliveryDate, referenceUrl, description } = req.body;

    // Rate limiting / Duplicate prevention check (e.g. within 2 minutes)
    const recentDuplicate = await Enquiry.findOne({
      email: email.toLowerCase().trim(),
      service: service.trim(),
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
    });

    if (recentDuplicate) {
      return res.status(429).json({
        success: false,
        message: "An identical enquiry was submitted recently. Please wait a moment before submitting again.",
        data: null
      });
    }

    const enquiry = await Enquiry.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : "",
      service: service.trim(),
      budget: budget ? budget.trim() : "Discuss after scope",
      deliveryDate: deliveryDate ? deliveryDate.trim() : "",
      referenceUrl: referenceUrl ? referenceUrl.trim() : "",
      description: description.trim()
    });

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
