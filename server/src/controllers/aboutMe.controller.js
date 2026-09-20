import mongoose from "mongoose";
import AboutMe from "../models/AboutMe.model.js";
import AuditLog from "../models/AuditLog.model.js";

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function requireDb(res) {
  if (isDbConnected()) return true;
  res.status(503).json({
    success: false,
    message: "MongoDB is unavailable. About Me content cannot be retrieved or updated.",
    data: null
  });
  return false;
}

async function logAudit(user, action, entity, entityId, details) {
  if (!isDbConnected()) return;
  try {
    await AuditLog.create({
      user: user?.id,
      userEmail: user?.email || "system",
      action,
      entity,
      entityId,
      details
    });
  } catch {
    // Fail silently for audit logs
  }
}

function getDefaultAboutMeData() {
  return new AboutMe().toObject();
}

/**
 * Public endpoint: GET /api/v1/cms/about-me
 */
export async function getPublicAboutMe(req, res) {
  try {
    if (!requireDb(res)) return;
    let doc = await AboutMe.findOne({ key: "about_me_content" }).lean();
    if (!doc) {
      doc = await AboutMe.create({ key: "about_me_content" });
      doc = doc.toObject();
    }
    return res.json({
      success: true,
      message: "About Me content retrieved successfully",
      data: doc
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve About Me content",
      data: getDefaultAboutMeData()
    });
  }
}

/**
 * Admin endpoint: GET /api/v1/cms/about-me/admin
 */
export async function getAdminAboutMe(req, res) {
  try {
    if (!requireDb(res)) return;
    let doc = await AboutMe.findOne({ key: "about_me_content" }).lean();
    if (!doc) {
      doc = await AboutMe.create({ key: "about_me_content" });
      doc = doc.toObject();
    }
    return res.json({
      success: true,
      message: "Admin About Me content retrieved successfully",
      data: doc
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve Admin About Me content",
      data: null
    });
  }
}

/**
 * Admin update: PUT /api/v1/cms/about-me or POST /api/v1/cms/about-me
 */
export async function updateAboutMe(req, res) {
  try {
    if (!requireDb(res)) return;
    const {
      fullName,
      designation,
      location,
      profileImage,
      quote,
      introBadge,
      introTitle,
      introSubtitle,
      aboutHeading,
      aboutParagraphs,
      visionHeading,
      visionText,
      experienceYears,
      experienceHeading,
      experienceText,
      skills,
      whatIDo,
      companyRoleHeading,
      companyRoleText,
      philosophyPillars
    } = req.body;

    const updateFields = {
      updatedBy: req.user?.id
    };

    if (fullName !== undefined) updateFields.fullName = String(fullName).trim();
    if (designation !== undefined) updateFields.designation = String(designation).trim();
    if (location !== undefined) updateFields.location = String(location).trim();
    if (profileImage !== undefined) updateFields.profileImage = String(profileImage).trim();
    if (quote !== undefined) updateFields.quote = String(quote).trim();
    if (introBadge !== undefined) updateFields.introBadge = String(introBadge).trim();
    if (introTitle !== undefined) updateFields.introTitle = String(introTitle).trim();
    if (introSubtitle !== undefined) updateFields.introSubtitle = String(introSubtitle).trim();
    if (aboutHeading !== undefined) updateFields.aboutHeading = String(aboutHeading).trim();
    if (Array.isArray(aboutParagraphs)) updateFields.aboutParagraphs = aboutParagraphs.map((p) => String(p).trim()).filter(Boolean);
    if (visionHeading !== undefined) updateFields.visionHeading = String(visionHeading).trim();
    if (visionText !== undefined) updateFields.visionText = String(visionText).trim();
    if (experienceYears !== undefined) updateFields.experienceYears = String(experienceYears).trim();
    if (experienceHeading !== undefined) updateFields.experienceHeading = String(experienceHeading).trim();
    if (experienceText !== undefined) updateFields.experienceText = String(experienceText).trim();
    if (Array.isArray(skills)) updateFields.skills = skills.map((s) => String(s).trim()).filter(Boolean);
    if (Array.isArray(whatIDo)) {
      updateFields.whatIDo = whatIDo.map((item) => ({
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
        tag: String(item.tag || "").trim()
      }));
    }
    if (companyRoleHeading !== undefined) updateFields.companyRoleHeading = String(companyRoleHeading).trim();
    if (companyRoleText !== undefined) updateFields.companyRoleText = String(companyRoleText).trim();
    if (Array.isArray(philosophyPillars)) {
      updateFields.philosophyPillars = philosophyPillars.map((item) => ({
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim()
      }));
    }

    const updated = await AboutMe.findOneAndUpdate(
      { key: "about_me_content" },
      {
        $set: updateFields,
        $setOnInsert: { key: "about_me_content" }
      },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    await logAudit(req.user, "UPDATE_ABOUT_ME", "AboutMe", "about_me_content", {
      updatedFields: Object.keys(updateFields)
    });

    return res.json({
      success: true,
      message: "About Me content updated successfully",
      data: updated
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update About Me content",
      data: null
    });
  }
}
