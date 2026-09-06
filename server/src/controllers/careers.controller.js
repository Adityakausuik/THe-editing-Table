import mongoose from "mongoose";
import { processAndSaveResume } from "../middleware/careersUpload.js";
import CareersContent from "../models/CareersContent.model.js";
import Job from "../models/Job.model.js";
import JobApplication from "../models/JobApplication.model.js";
import { safeDeleteFile } from "../utils/fileUtils.js";

// ==========================================
// PUBLIC CONTROLLERS
// ==========================================

export async function getPublicJobs(req, res, next) {
  try {
    const jobs = await Job.find({ status: "Active" })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicJobById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    const job = await Job.findOne({ _id: id, status: "Active" }).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: "Job vacancy not found or no longer active." });
    }

    return res.json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
}

export async function getCareersContent(req, res, next) {
  try {
    let content = await CareersContent.findOne({ key: "careers_page_content" }).lean();
    if (!content) {
      content = await CareersContent.create({ key: "careers_page_content" });
    }

    return res.json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
}

export async function submitApplication(req, res, next) {
  try {
    const {
      jobId,
      positionTitle,
      applicantName,
      email,
      phone,
      portfolio,
      linkedin,
      coverLetter
    } = req.body;

    if (!applicantName?.trim()) {
      return res.status(400).json({ success: false, message: "Full Name is required." });
    }
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: "Email Address is required." });
    }
    if (!phone?.trim()) {
      return res.status(400).json({ success: false, message: "Phone Number is required." });
    }
    if (!positionTitle?.trim()) {
      return res.status(400).json({ success: false, message: "Position is required." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload your resume (PDF, DOC, or DOCX)." });
    }

    // Save resume file safely
    const savedResume = await processAndSaveResume(req.file);

    const validJobId = jobId && mongoose.Types.ObjectId.isValid(jobId) ? jobId : null;

    const application = await JobApplication.create({
      jobId: validJobId,
      positionTitle: positionTitle.trim(),
      applicantName: applicantName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      portfolio: (portfolio || "").trim(),
      linkedin: (linkedin || "").trim(),
      coverLetter: (coverLetter || "").trim(),
      resume: {
        url: savedResume.url,
        filename: savedResume.filename,
        originalName: savedResume.originalName,
        size: savedResume.size,
        mimeType: savedResume.mimeType
      },
      status: "New"
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully! Our talent team will review your portfolio and get in touch.",
      data: application
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// ADMIN CONTROLLERS (PROTECTED)
// ==========================================

export async function getAdminJobs(req, res, next) {
  try {
    const { search = "", status = "all", department = "all" } = req.query;

    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (department !== "all") {
      filter.department = department;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ title: regex }, { department: regex }, { location: regex }, { description: regex }];
    }

    const jobs = await Job.find(filter).sort({ order: 1, createdAt: -1 }).lean();

    // Attach application counts for each job
    const jobIds = jobs.map((j) => j._id);
    const counts = await JobApplication.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } }
    ]);

    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const jobsWithCounts = jobs.map((job) => ({
      ...job,
      applicationCount: countMap.get(job._id.toString()) || 0
    }));

    return res.json({
      success: true,
      data: jobsWithCounts
    });
  } catch (error) {
    next(error);
  }
}

export async function createJob(req, res, next) {
  try {
    const {
      title,
      department,
      location,
      employmentType,
      experience,
      salary,
      description,
      responsibilities,
      requiredSkills,
      preferredSkills,
      benefits,
      deadline,
      status,
      order
    } = req.body;

    if (!title?.trim() || !department?.trim() || !description?.trim()) {
      return res.status(400).json({ success: false, message: "Title, Department, and Description are required." });
    }

    const job = await Job.create({
      title: title.trim(),
      department: department.trim(),
      location: (location || "Mohali, Punjab • Studio / Hybrid").trim(),
      employmentType: employmentType || "Full Time",
      experience: (experience || "2+ Years").trim(),
      salary: (salary || "Competitive").trim(),
      description: description.trim(),
      responsibilities: Array.isArray(responsibilities) ? responsibilities : (responsibilities ? responsibilities.split("\n").filter(Boolean) : []),
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : (requiredSkills ? requiredSkills.split(",").map((s) => s.trim()).filter(Boolean) : []),
      preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : (preferredSkills ? preferredSkills.split(",").map((s) => s.trim()).filter(Boolean) : []),
      benefits: Array.isArray(benefits) ? benefits : (benefits ? benefits.split("\n").filter(Boolean) : []),
      deadline: (deadline || "").trim(),
      status: status || "Active",
      order: Number(order) || 0
    });

    return res.status(201).json({
      success: true,
      message: "Job vacancy created successfully.",
      data: job
    });
  } catch (error) {
    next(error);
  }
}

export async function updateJob(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    const updates = { ...req.body };

    if (typeof updates.responsibilities === "string") {
      updates.responsibilities = updates.responsibilities.split("\n").filter(Boolean);
    }
    if (typeof updates.requiredSkills === "string") {
      updates.requiredSkills = updates.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (typeof updates.preferredSkills === "string") {
      updates.preferredSkills = updates.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (typeof updates.benefits === "string") {
      updates.benefits = updates.benefits.split("\n").filter(Boolean);
    }

    const job = await Job.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!job) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    return res.json({
      success: true,
      message: "Job vacancy updated successfully.",
      data: job
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteJob(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    const job = await Job.findByIdAndDelete(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    return res.json({
      success: true,
      message: "Job vacancy deleted successfully."
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleJobStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    if (status) {
      job.status = status;
    } else {
      job.status = job.status === "Active" ? "Inactive" : "Active";
    }

    await job.save();

    return res.json({
      success: true,
      message: `Job status updated to ${job.status}.`,
      data: job
    });
  } catch (error) {
    next(error);
  }
}

export async function duplicateJob(req, res, next) {
  try {
    const { id } = req.params;
    const original = await Job.findById(id).lean();
    if (!original) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;

    original.title = `${original.title} (Copy)`;
    original.status = "Draft";

    const duplicate = await Job.create(original);

    return res.status(201).json({
      success: true,
      message: "Job duplicated successfully as Draft.",
      data: duplicate
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminApplications(req, res, next) {
  try {
    const { search = "", jobId = "all", status = "all", sort = "newest" } = req.query;

    const filter = {};

    if (jobId !== "all" && mongoose.Types.ObjectId.isValid(jobId)) {
      filter.jobId = jobId;
    }

    if (status !== "all") {
      filter.status = status;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { applicantName: regex },
        { email: regex },
        { phone: regex },
        { positionTitle: regex }
      ];
    }

    const sortOrder = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const applications = await JobApplication.find(filter)
      .sort(sortOrder)
      .populate("jobId", "title department")
      .lean();

    return res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    next(error);
  }
}

export async function getApplicationById(req, res, next) {
  try {
    const { id } = req.params;
    const application = await JobApplication.findById(id).populate("jobId", "title department location").lean();
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    return res.json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
}

export async function updateApplicationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["New", "Reviewing", "Shortlisted", "Interview", "Selected", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid application status." });
    }

    const application = await JobApplication.findByIdAndUpdate(id, { status }, { new: true });
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    return res.json({
      success: true,
      message: `Status updated to ${status}.`,
      data: application
    });
  } catch (error) {
    next(error);
  }
}

export async function updateApplicationNotes(req, res, next) {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const application = await JobApplication.findByIdAndUpdate(
      id,
      { adminNotes: adminNotes || "" },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    return res.json({
      success: true,
      message: "Internal notes saved.",
      data: application
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteApplication(req, res, next) {
  try {
    const { id } = req.params;
    const application = await JobApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    // Safely delete uploaded resume file
    if (application.resume?.url) {
      safeDeleteFile(application.resume.url);
    }

    await JobApplication.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Application deleted successfully."
    });
  } catch (error) {
    next(error);
  }
}

export async function getCareersStats(req, res, next) {
  try {
    const [
      totalJobs,
      activeJobs,
      inactiveJobs,
      totalApplications,
      newApplications,
      reviewingApplications,
      shortlistedApplications,
      interviewApplications,
      selectedApplications,
      rejectedApplications
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: "Active" }),
      Job.countDocuments({ status: { $ne: "Active" } }),
      JobApplication.countDocuments(),
      JobApplication.countDocuments({ status: "New" }),
      JobApplication.countDocuments({ status: "Reviewing" }),
      JobApplication.countDocuments({ status: "Shortlisted" }),
      JobApplication.countDocuments({ status: "Interview" }),
      JobApplication.countDocuments({ status: "Selected" }),
      JobApplication.countDocuments({ status: "Rejected" })
    ]);

    return res.json({
      success: true,
      data: {
        totalJobs,
        activeJobs,
        inactiveJobs,
        totalApplications,
        newApplications,
        reviewingApplications,
        shortlisted: shortlistedApplications,
        interview: interviewApplications,
        hired: selectedApplications,
        rejected: rejectedApplications
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCareersContent(req, res, next) {
  try {
    const { hero, whyJoinUs, cta } = req.body;

    let content = await CareersContent.findOne({ key: "careers_page_content" });
    if (!content) {
      content = new CareersContent({ key: "careers_page_content" });
    }

    if (hero) content.hero = { ...content.hero, ...hero };
    if (Array.isArray(whyJoinUs)) content.whyJoinUs = whyJoinUs;
    if (cta) content.cta = { ...content.cta, ...cta };

    await content.save();

    return res.json({
      success: true,
      message: "Careers page content updated successfully.",
      data: content
    });
  } catch (error) {
    next(error);
  }
}
