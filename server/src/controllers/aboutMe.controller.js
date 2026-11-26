import AboutMe from "../models/AboutMe.model.js";
import { findAboutMe, saveAboutMe, writeAboutMeAudit } from "../db/aboutMeRepository.js";

async function logAudit(user, action, entity, entityId, details) {
  try {
    await writeAboutMeAudit(user, action, entityId, details);
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
    const doc = await findAboutMe();
    return res.json({
      success: true,
      message: "About Me content retrieved successfully",
      data: doc || getDefaultAboutMeData()
    });
  } catch {
    return res.status(503).json({
      success: false,
      message: "PostgreSQL is unavailable. About Me content could not be retrieved.",
      data: null
    });
  }
}

/**
 * Admin endpoint: GET /api/v1/cms/about-me/admin
 */
export async function getAdminAboutMe(req, res) {
  try {
    const doc = await findAboutMe();
    return res.json({
      success: true,
      message: "Admin About Me content retrieved successfully",
      data: doc || getDefaultAboutMeData()
    });
  } catch {
    return res.status(503).json({
      success: false,
      message: "PostgreSQL is unavailable. About Me content could not be retrieved.",
      data: null
    });
  }
}

/**
 * Admin update: PUT /api/v1/cms/about-me or POST /api/v1/cms/about-me
 */
export async function updateAboutMe(req, res) {
  try {
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

    try {
      const updated = await saveAboutMe(updateFields);
      await logAudit(req.user, "UPDATE_ABOUT_ME", "AboutMe", "about_me_content", {
        updatedFields: Object.keys(updateFields)
      });
      return res.json({
        success: true,
        message: "About Me content updated successfully",
        data: updated
      });
    } catch {
      return res.status(503).json({
        success: false,
        message: "PostgreSQL is unavailable. About Me content was not updated.",
        data: null
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update About Me content",
      data: null
    });
  }
}
