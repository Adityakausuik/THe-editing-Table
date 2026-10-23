import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import {
  createPostgresCmsRecord,
  deletePostgresCmsRecord,
  getPostgresCmsRecord,
  listPostgresCmsRecords,
  updatePostgresCmsRecord
} from "../db/cmsRepository.js";
import { getPostgresPool } from "../db/postgres.js";
import {
  getPostgresCareersStats,
  getPostgresJobApplication,
  listPostgresJobApplications
} from "../db/careersRepository.js";
import { processAndSaveResume } from "../middleware/careersUpload.js";
import CareersContent from "../models/CareersContent.model.js";
import Job from "../models/Job.model.js";
import JobApplication from "../models/JobApplication.model.js";
import { safeDeleteFile } from "../utils/fileUtils.js";
import { deleteVercelBlob, getVercelBlob, isVercelBlobUrl } from "../utils/blobStorage.js";
import { getFileStreamFromGridFS } from "../utils/gridfs.js";
import { Readable } from "node:stream";
import { isPostgresSelected } from "../config/databaseMode.js";

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function usesPostgres() {
  return isPostgresSelected();
}

async function createPostgresRecord(Model, payload) {
  const document = new Model(payload);
  await document.validate();
  return createPostgresCmsRecord(Model, document._id.toString(), document.toObject());
}

async function updatePostgresRecord(Model, id, payload) {
  const existing = await getPostgresCmsRecord(Model, id);
  if (!existing) return null;
  const document = Model.hydrate(existing);
  document.set(payload);
  await document.validate({ validateModifiedOnly: true });
  const updates = {};
  const requestedPaths = Object.keys(payload);
  for (const schemaPath of Object.keys(Model.schema.paths)) {
    if (["_id", "__v", "createdAt", "updatedAt"].includes(schemaPath)) continue;
    if (!requestedPaths.some((requested) => requested === schemaPath ||
      schemaPath.startsWith(`${requested}.`) || requested.startsWith(`${schemaPath}.`))) continue;
    let target = updates;
    const parts = schemaPath.split(".");
    for (const part of parts.slice(0, -1)) target = target[part] ||= {};
    target[parts.at(-1)] = document.get(schemaPath);
  }
  return updatePostgresCmsRecord(Model, id, updates);
}

async function requireDb(res) {
  if (isDbConnected()) return true;
  try {
    await connectDatabase();
    if (isDbConnected()) return true;
  } catch (err) {
    console.warn("[careers:requireDb] Auto-connect attempt failed:", err.message);
  }
  res.status(503).json({
    success: false,
    message: "MongoDB is unavailable. Careers data cannot be retrieved or changed.",
    data: null
  });
  return false;
}

// ==========================================
// PUBLIC CONTROLLERS
// ==========================================

export async function getPublicJobs(req, res) {
  try {
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    if (usesPostgres()) {
      if (!env.DATABASE_URL) {
        return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
      }
      const jobs = await listPostgresCmsRecords(Job, {
        publicFilter: { status: "Active" },
        orderField: "order"
      });
      return res.json({ success: true, data: jobs });
    }

    if (!isDbConnected()) {
      await connectDatabase().catch(() => {});
    }
    if (!isDbConnected()) {
      return res.json({
        success: true,
        data: []
      });
    }

    const jobs = await Job.find({ status: "Active" })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: jobs
    });
  } catch {
    if (usesPostgres() || env.VERCEL_ENV === "preview") {
      return res.status(503).json({ success: false, message: "Careers data is temporarily unavailable.", data: null });
    }
    return res.json({
      success: true,
      data: []
    });
  }
}

export async function getPublicJobById(req, res, next) {
  try {
    const { id } = req.params;
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    const job = usesPostgres()
      ? await getPostgresCmsRecord(Job, id, { status: "Active" })
      : await Job.findOne({ _id: id, status: "Active" }).lean();
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

export async function getCareersContent(req, res) {
  try {
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    if (usesPostgres()) {
      if (!env.DATABASE_URL) {
        return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
      }
      const records = await listPostgresCmsRecords(CareersContent, {
        publicFilter: { key: "careers_page_content" }
      });
      return res.json({
        success: true,
        data: records[0] || new CareersContent().toObject()
      });
    }

    if (!isDbConnected()) {
      await connectDatabase().catch(() => {});
    }
    if (!isDbConnected()) {
      return res.json({
        success: true,
        data: new CareersContent().toObject()
      });
    }

    let content = await CareersContent.findOne({ key: "careers_page_content" }).lean();
    if (!content) {
      content = await CareersContent.create({ key: "careers_page_content" });
    }

    return res.json({
      success: true,
      data: content
    });
  } catch {
    if (usesPostgres() || env.VERCEL_ENV === "preview") {
      return res.status(503).json({ success: false, message: "Careers data is temporarily unavailable.", data: null });
    }
    return res.json({
      success: true,
      data: new CareersContent().toObject()
    });
  }
}

export async function submitApplication(req, res, next) {
  try {
    if (!usesPostgres() && !await requireDb(res)) return;
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

    const payload = {
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
    };
    let application;
    try {
      application = usesPostgres()
        ? await createPostgresRecord(JobApplication, payload)
        : await JobApplication.create(payload);
    } catch (error) {
      if (usesPostgres() && isVercelBlobUrl(savedResume.url)) await deleteVercelBlob(savedResume.url).catch(() => {});
      throw error;
    }

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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { search = "", status = "all", department = "all" } = req.query;

    if (usesPostgres()) {
      const publicFilter = {};
      if (status !== "all") publicFilter.status = status;
      if (department !== "all") publicFilter.department = department;
      const jobs = await listPostgresCmsRecords(Job, {
        publicFilter,
        search: search.trim(),
        orderField: "order",
        admin: true
      });
      const jobIds = jobs.map((job) => String(job._id));
      const counts = jobIds.length
        ? await getPostgresPool().query(
          'SELECT "job_id", COUNT(*)::int AS "count" FROM "jobapplications" WHERE "job_id" = ANY($1::text[]) GROUP BY "job_id"',
          [jobIds]
        )
        : { rows: [] };
      const countMap = new Map(counts.rows.map((row) => [row.job_id, row.count]));
      return res.json({
        success: true,
        data: jobs.map((job) => ({ ...job, applicationCount: countMap.get(String(job._id)) || 0 }))
      });
    }

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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
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

    const jobData = {
      title: title.trim(),
      department: department.trim(),
      location: (location || "Mohali, Punjab • Onsite / Hybrid").trim(),
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
    };
    const job = usesPostgres()
      ? await createPostgresRecord(Job, jobData)
      : await Job.create(jobData);

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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
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

    const job = usesPostgres()
      ? await updatePostgresRecord(Job, id, updates)
      : await Job.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    const job = usesPostgres()
      ? await deletePostgresCmsRecord(Job, id)
      : await Job.findByIdAndDelete(id);
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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { id } = req.params;
    const { status } = req.body;

    const job = usesPostgres()
      ? await getPostgresCmsRecord(Job, id)
      : await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    if (status) {
      job.status = status;
    } else {
      job.status = job.status === "Active" ? "Inactive" : "Active";
    }

    if (usesPostgres()) await updatePostgresRecord(Job, id, { status: job.status });
    else await job.save();

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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { id } = req.params;
    const original = usesPostgres()
      ? await getPostgresCmsRecord(Job, id)
      : await Job.findById(id).lean();
    if (!original) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;

    original.title = `${original.title} (Copy)`;
    original.status = "Draft";

    const duplicate = usesPostgres()
      ? await createPostgresRecord(Job, original)
      : await Job.create(original);

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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { search = "", jobId = "all", status = "all", sort = "newest" } = req.query;

    if (usesPostgres()) {
      const applications = await listPostgresJobApplications({
        jobId: jobId !== "all" && mongoose.Types.ObjectId.isValid(jobId) ? jobId : undefined,
        status,
        search: search.trim(),
        sort
      });
      for (const application of applications) {
        if (application.resume?.url) application.resume.url = `/api/v1/careers/admin/applications/${application._id}/resume`;
      }
      return res.json({ success: true, data: applications });
    }

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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { id } = req.params;
    const application = usesPostgres()
      ? await getPostgresJobApplication(id)
      : await JobApplication.findById(id).populate("jobId", "title department location").lean();
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    if (usesPostgres() && application.resume?.url) {
      application.resume.url = `/api/v1/careers/admin/applications/${application._id}/resume`;
    }

    return res.json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadApplicationResume(req, res, next) {
  try {
    const application = usesPostgres()
      ? await getPostgresJobApplication(req.params.id)
      : await JobApplication.findById(req.params.id).lean();
    if (!application?.resume?.url) return res.status(404).json({ success: false, message: "Resume not found." });

    const filename = String(application.resume.originalName || application.resume.filename || "resume")
      .replace(/[\r\n"\\]/g, "_").slice(0, 180);
    res.set({
      "Content-Type": application.resume.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    });

    if (isVercelBlobUrl(application.resume.url)) {
      const blob = await getVercelBlob(application.resume.url, "private");
      if (!blob || blob.status !== 200 || !blob.stream) return res.status(404).end();
      const stream = typeof blob.stream.pipe === "function" ? blob.stream : Readable.fromWeb(blob.stream);
      return stream.pipe(res);
    }
    let file = await getFileStreamFromGridFS(application.resume.path || application.resume.url);
    if (!file && application.resume.url && application.resume.url !== application.resume.path) {
      file = await getFileStreamFromGridFS(application.resume.url);
    }
    if (!file) return res.status(404).json({ success: false, message: "Resume file is unavailable." });
    file.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function updateApplicationStatus(req, res, next) {
  try {
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["New", "Reviewing", "Shortlisted", "Interview", "Selected", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid application status." });
    }

    const application = usesPostgres()
      ? await updatePostgresRecord(JobApplication, id, { status })
      : await JobApplication.findByIdAndUpdate(id, { status }, { new: true });
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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { id } = req.params;
    const { adminNotes } = req.body;

    const application = usesPostgres()
      ? await updatePostgresRecord(JobApplication, id, { adminNotes: adminNotes || "" })
      : await JobApplication.findByIdAndUpdate(id, { adminNotes: adminNotes || "" }, { new: true });

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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { id } = req.params;
    const application = usesPostgres()
      ? await getPostgresCmsRecord(JobApplication, id)
      : await JobApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    // Safely delete uploaded resume file
    if (!usesPostgres() && application.resume?.url) {
      safeDeleteFile(application.resume.url);
    }

    if (usesPostgres()) await deletePostgresCmsRecord(JobApplication, id);
    else await JobApplication.findByIdAndDelete(id);

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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    if (usesPostgres()) {
      return res.json({ success: true, data: await getPostgresCareersStats() });
    }
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
    if (env.VERCEL_ENV === "preview" && !usesPostgres()) {
      return res.status(503).json({ success: false, message: "Careers database is not configured.", data: null });
    }
    const { hero, whyJoinUs, cta } = req.body;

    if (usesPostgres()) {
      const existingRows = await listPostgresCmsRecords(CareersContent, { publicFilter: { key: "careers_page_content" } });
      const current = existingRows[0] || new CareersContent({ key: "careers_page_content" }).toObject();
      if (hero) current.hero = { ...current.hero, ...hero };
      if (Array.isArray(whyJoinUs)) current.whyJoinUs = whyJoinUs;
      if (cta) current.cta = { ...current.cta, ...cta };
      const content = existingRows[0]
        ? await updatePostgresRecord(CareersContent, existingRows[0]._id, current)
        : await createPostgresRecord(CareersContent, current);
      return res.json({ success: true, message: "Careers page content updated successfully.", data: content });
    }

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
