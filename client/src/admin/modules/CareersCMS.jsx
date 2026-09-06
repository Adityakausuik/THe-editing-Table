/* global confirm, console, URLSearchParams */
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Layers,
  Link as LinkIcon,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";

const JOB_STATUSES = ["Active", "Draft", "Closed", "Inactive"];
const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Internship", "Contract", "Freelance"];
const APP_STATUSES = ["New", "Reviewing", "Shortlisted", "Interview", "Selected", "Rejected"];

export default function CareersCMS() {
  const [activeTab, setActiveTab] = useState("jobs"); // "jobs" | "applications" | "content"

  // Overview Stats
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    inactiveJobs: 0,
    totalApplications: 0,
    newApplications: 0,
    reviewingApplications: 0,
    shortlisted: 0,
    interview: 0,
    hired: 0,
    rejected: 0
  });

  // Jobs State
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobSaving, setJobSaving] = useState(false);

  // Job Form Data
  const [jobForm, setJobForm] = useState({
    title: "",
    department: "Post-Production",
    location: "Mohali, Punjab • Studio / Hybrid",
    employmentType: "Full Time",
    experience: "2+ Years",
    salary: "Competitive / Based on Portfolio",
    description: "",
    responsibilities: "",
    requiredSkills: "",
    preferredSkills: "",
    benefits: "",
    deadline: "",
    status: "Active",
    order: 0
  });

  // Applications State
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [appJobFilter, setAppJobFilter] = useState("all");
  const [appSort, setAppSort] = useState("newest");
  const [activeApp, setActiveApp] = useState(null);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [appNoteSaving, setAppNoteSaving] = useState(false);
  const [currentAppNotes, setCurrentAppNotes] = useState("");

  // Page Content State
  const [pageContent, setPageContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [cardForm, setCardForm] = useState({
    id: "",
    title: "",
    description: "",
    icon: "Sparkles",
    active: true
  });

  // Common UI State
  const [toastMsg, setToastMsg] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/careers/admin/stats");
      if (res.data) setStats(res.data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    setErrorMessage("");
    try {
      const res = await apiFetch("/api/v1/careers/admin/jobs");
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setErrorMessage(err.message || "Failed to fetch jobs.");
    } finally {
      setJobsLoading(false);
    }
  }, []);

  // Fetch Applications
  const fetchApplications = useCallback(async () => {
    setAppsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (appSearch) params.append("search", appSearch);
      if (appStatusFilter !== "all") params.append("status", appStatusFilter);
      if (appJobFilter !== "all") params.append("jobId", appJobFilter);
      if (appSort) params.append("sort", appSort);

      const res = await apiFetch(`/api/v1/careers/admin/applications?${params.toString()}`);
      setApplications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setErrorMessage(err.message || "Failed to fetch applications.");
    } finally {
      setAppsLoading(false);
    }
  }, [appSearch, appStatusFilter, appJobFilter, appSort]);

  // Fetch Page Content
  const fetchContent = useCallback(async () => {
    setContentLoading(true);
    setErrorMessage("");
    try {
      const res = await apiFetch("/api/v1/careers/admin/content");
      setPageContent(res.data || null);
    } catch (err) {
      setErrorMessage(err.message || "Failed to load page content.");
    } finally {
      setContentLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchStats();
    fetchJobs();
  }, [fetchStats, fetchJobs]);

  useEffect(() => {
    if (activeTab === "applications") {
      fetchApplications();
    } else if (activeTab === "content") {
      fetchContent();
    }
  }, [activeTab, fetchApplications, fetchContent]);

  // ==========================================
  // JOB ACTIONS
  // ==========================================
  const openJobModal = (job = null) => {
    setEditingJob(job);
    if (job) {
      setJobForm({
        title: job.title || "",
        department: job.department || "Post-Production",
        location: job.location || "Mohali, Punjab • Studio / Hybrid",
        employmentType: job.employmentType || "Full Time",
        experience: job.experience || "2+ Years",
        salary: job.salary || "Competitive",
        description: job.description || "",
        responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.join("\n") : "",
        requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills.join(", ") : "",
        preferredSkills: Array.isArray(job.preferredSkills) ? job.preferredSkills.join(", ") : "",
        benefits: Array.isArray(job.benefits) ? job.benefits.join("\n") : "",
        deadline: job.deadline || "",
        status: job.status || "Active",
        order: job.order || 0
      });
    } else {
      setJobForm({
        title: "",
        department: "Post-Production",
        location: "Mohali, Punjab • Studio / Hybrid",
        employmentType: "Full Time",
        experience: "2+ Years",
        salary: "Competitive / Based on Portfolio",
        description: "",
        responsibilities: "",
        requiredSkills: "",
        preferredSkills: "",
        benefits: "",
        deadline: "",
        status: "Active",
        order: jobs.length
      });
    }
    setJobModalOpen(true);
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (!jobForm.title.trim()) {
      setErrorMessage("Job title is required.");
      return;
    }
    setJobSaving(true);
    setErrorMessage("");
    try {
      const isNew = !editingJob;
      const url = isNew
        ? "/api/v1/careers/admin/jobs"
        : `/api/v1/careers/admin/jobs/${editingJob._id}`;
      const method = isNew ? "POST" : "PATCH";

      await apiFetch(url, {
        method,
        body: JSON.stringify(jobForm)
      });

      showToast(`Job vacancy ${isNew ? "created" : "updated"} successfully!`);
      setJobModalOpen(false);
      fetchJobs();
      fetchStats();
    } catch (err) {
      setErrorMessage(err.message || "Failed to save job vacancy.");
    } finally {
      setJobSaving(false);
    }
  };

  const handleDeleteJob = async (job) => {
    if (!confirm(`Are you sure you want to permanently delete the vacancy "${job.title}"?`)) return;
    try {
      await apiFetch(`/api/v1/careers/admin/jobs/${job._id}`, { method: "DELETE" });
      showToast("Job vacancy deleted.");
      fetchJobs();
      fetchStats();
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete job.");
    }
  };

  const handleToggleJobStatus = async (job) => {
    const nextStatus = job.status === "Active" ? "Inactive" : "Active";
    try {
      await apiFetch(`/api/v1/careers/admin/jobs/${job._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      setJobs((prev) =>
        prev.map((item) => (item._id === job._id ? { ...item, status: nextStatus } : item))
      );
      showToast(`Vacancy marked as ${nextStatus}.`);
      fetchStats();
    } catch (err) {
      setErrorMessage(err.message || "Failed to change job status.");
    }
  };

  const handleDuplicateJob = async (job) => {
    try {
      await apiFetch(`/api/v1/careers/admin/jobs/${job._id}/duplicate`, { method: "POST" });
      showToast(`Vacancy duplicated as Draft.`);
      fetchJobs();
      fetchStats();
    } catch (err) {
      setErrorMessage(err.message || "Failed to duplicate job.");
    }
  };

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchesSearch =
        !jobSearch ||
        [j.title, j.department, j.location].some((field) =>
          String(field || "").toLowerCase().includes(jobSearch.toLowerCase())
        );
      const matchesStatus = jobStatusFilter === "all" || j.status === jobStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, jobSearch, jobStatusFilter]);

  // ==========================================
  // APPLICATION ACTIONS
  // ==========================================
  const openAppDetails = (app) => {
    setActiveApp(app);
    setCurrentAppNotes(app.adminNotes || "");
    setAppModalOpen(true);
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await apiFetch(`/api/v1/careers/admin/applications/${appId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      setApplications((prev) =>
        prev.map((item) => (item._id === appId ? { ...item, status: newStatus } : item))
      );
      if (activeApp && activeApp._id === appId) {
        setActiveApp((prev) => ({ ...prev, status: newStatus }));
      }
      showToast(`Application status updated to ${newStatus}.`);
      fetchStats();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update status.");
    }
  };

  const handleSaveAppNotes = async () => {
    if (!activeApp) return;
    setAppNoteSaving(true);
    try {
      await apiFetch(`/api/v1/careers/admin/applications/${activeApp._id}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ adminNotes: currentAppNotes })
      });
      setActiveApp((prev) => ({ ...prev, adminNotes: currentAppNotes }));
      setApplications((prev) =>
        prev.map((item) =>
          item._id === activeApp._id ? { ...item, adminNotes: currentAppNotes } : item
        )
      );
      showToast("Internal notes saved.");
    } catch (err) {
      setErrorMessage(err.message || "Failed to save notes.");
    } finally {
      setAppNoteSaving(false);
    }
  };

  const handleDeleteApp = async (appId) => {
    if (!confirm("Are you sure you want to delete this applicant record?")) return;
    try {
      await apiFetch(`/api/v1/careers/admin/applications/${appId}`, { method: "DELETE" });
      setApplications((prev) => prev.filter((item) => item._id !== appId));
      if (activeApp?._id === appId) setAppModalOpen(false);
      showToast("Application deleted.");
      fetchStats();
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete application.");
    }
  };

  // ==========================================
  // PAGE CONTENT ACTIONS
  // ==========================================
  const handleSaveContent = async () => {
    if (!pageContent) return;
    setContentSaving(true);
    try {
      await apiFetch("/api/v1/careers/admin/content", {
        method: "PUT",
        body: JSON.stringify(pageContent)
      });
      showToast("Careers page content updated successfully!");
    } catch (err) {
      setErrorMessage(err.message || "Failed to save content.");
    } finally {
      setContentSaving(false);
    }
  };

  const openCardModal = (card = null) => {
    setEditingCard(card);
    if (card) {
      setCardForm({ ...card });
    } else {
      setCardForm({
        id: `card-${Date.now()}`,
        title: "",
        description: "",
        icon: "Sparkles",
        active: true
      });
    }
    setCardModalOpen(true);
  };

  const handleSaveCard = (e) => {
    e.preventDefault();
    if (!cardForm.title.trim()) return;

    setPageContent((prev) => {
      const list = [...(prev?.whyJoinUs || [])];
      if (editingCard) {
        const idx = list.findIndex((c) => c.id === editingCard.id);
        if (idx !== -1) list[idx] = cardForm;
      } else {
        list.push(cardForm);
      }
      return { ...prev, whyJoinUs: list };
    });
    setCardModalOpen(false);
  };

  const handleDeleteCard = (cardId) => {
    setPageContent((prev) => ({
      ...prev,
      whyJoinUs: (prev?.whyJoinUs || []).filter((c) => c.id !== cardId)
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[rgb(72,125,72)] px-5 py-3 text-sm text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-rose-600 hover:text-rose-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sage-border pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">
            STUDIO RECRUITMENT
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-forest mt-1">Careers Management</h1>
          <p className="text-xs sm:text-sm text-sage-muted mt-1">
            Manage public job vacancies, review incoming candidate portfolios and resumes, and configure page content.
          </p>
        </div>

        <a
          href="/careers"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-sage-border bg-sage-card px-4 py-2 text-xs font-medium text-forest hover:border-[rgb(72,125,72)]/40 transition-colors shadow-soft shrink-0 self-start sm:self-auto"
        >
          <span>View Public Page</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* ==========================================
          DASHBOARD METRIC CARDS
      ========================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-sage-border bg-sage-card p-3 sm:p-4 shadow-soft">
          <span className="text-[11px] font-medium text-sage-muted block">Total Jobs</span>
          <span className="font-serif text-2xl font-bold text-forest mt-1 block">
            {stats.totalJobs}
          </span>
        </div>
        <div className="rounded-2xl border border-sage-border bg-sage-card p-3 sm:p-4 shadow-soft">
          <span className="text-[11px] font-medium text-emerald-700 block">Active Jobs</span>
          <span className="font-serif text-2xl font-bold text-emerald-700 mt-1 block">
            {stats.activeJobs}
          </span>
        </div>
        <div className="rounded-2xl border border-sage-border bg-sage-card p-3 sm:p-4 shadow-soft">
          <span className="text-[11px] font-medium text-sage-muted block">Inactive</span>
          <span className="font-serif text-2xl font-bold text-sage-muted mt-1 block">
            {stats.inactiveJobs}
          </span>
        </div>
        <div className="rounded-2xl border border-sage-border bg-sage-card p-3 sm:p-4 shadow-soft">
          <span className="text-[11px] font-medium text-site block">Applications</span>
          <span className="font-serif text-2xl font-bold text-site mt-1 block">
            {stats.totalApplications}
          </span>
        </div>
        <div className="rounded-2xl border border-sage-border bg-sage-card p-3 sm:p-4 shadow-soft">
          <span className="text-[11px] font-medium text-amber-700 block">New</span>
          <span className="font-serif text-2xl font-bold text-amber-700 mt-1 block">
            {stats.newApplications}
          </span>
        </div>
        <div className="rounded-2xl border border-sage-border bg-sage-card p-3 sm:p-4 shadow-soft">
          <span className="text-[11px] font-medium text-blue-700 block">Shortlisted</span>
          <span className="font-serif text-2xl font-bold text-blue-700 mt-1 block">
            {stats.shortlisted}
          </span>
        </div>
        <div className="rounded-2xl border border-sage-border bg-sage-card p-3 sm:p-4 shadow-soft">
          <span className="text-[11px] font-medium text-rose-700 block">Rejected</span>
          <span className="font-serif text-2xl font-bold text-rose-700 mt-1 block">
            {stats.rejected}
          </span>
        </div>
        <div className="rounded-2xl border border-sage-border bg-sage-card p-3 sm:p-4 shadow-soft">
          <span className="text-[11px] font-medium text-emerald-800 block">Hired</span>
          <span className="font-serif text-2xl font-bold text-emerald-800 mt-1 block">
            {stats.hired}
          </span>
        </div>
      </div>

      {/* ==========================================
          TAB NAVIGATION
      ========================================== */}
      <div className="flex items-center gap-2 border-b border-sage-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
            activeTab === "jobs"
              ? "bg-[rgb(72,125,72)] text-white shadow-sm"
              : "text-sage-muted hover:text-forest hover:bg-sage-card"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Job Openings ({jobs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("applications")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
            activeTab === "applications"
              ? "bg-[rgb(72,125,72)] text-white shadow-sm"
              : "text-sage-muted hover:text-forest hover:bg-sage-card"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Candidate Applications ({stats.totalApplications})</span>
          {stats.newApplications > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white font-bold">
              {stats.newApplications}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
            activeTab === "content"
              ? "bg-[rgb(72,125,72)] text-white shadow-sm"
              : "text-sage-muted hover:text-forest hover:bg-sage-card"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Page Content & CMS</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: JOB VACANCIES MANAGEMENT
      ========================================== */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search jobs by title or department..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="field-luxury text-xs pl-10"
                />
              </div>

              <select
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
                className="field-luxury text-xs w-36"
              >
                <option value="all">All Statuses</option>
                {JOB_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => openJobModal()}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] px-5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-[#7C9B69] transition-all shrink-0 w-full sm:w-auto justify-center"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Vacancy</span>
            </button>
          </div>

          {jobsLoading ? (
            <div className="p-12 text-center text-xs text-sage-muted">Loading job vacancies...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-3xl border border-sage-border bg-sage-card p-12 text-center text-sage-muted text-xs">
              No vacancies match your criteria.
            </div>
          ) : (
            <div className="rounded-3xl border border-sage-border bg-sage-card overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sage-secondary/50 border-b border-sage-border text-forest font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Job Title & Department</th>
                      <th className="p-4">Type & Location</th>
                      <th className="p-4">Experience</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Applicants</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage-border">
                    {filteredJobs.map((job) => (
                      <tr key={job._id} className="hover:bg-sage-secondary/20 transition-colors">
                        <td className="p-4">
                          <div className="font-serif text-sm font-medium text-forest">{job.title}</div>
                          <span className="text-[11px] text-site font-medium">{job.department}</span>
                        </td>
                        <td className="p-4">
                          <div>{job.employmentType}</div>
                          <span className="text-[11px] text-sage-muted">{job.location}</span>
                        </td>
                        <td className="p-4 text-sage-muted">{job.experience}</td>
                        <td className="p-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              job.status === "Active"
                                ? "bg-emerald-100 text-emerald-800"
                                : job.status === "Draft"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="rounded-full bg-sage-bg px-2 py-0.5 text-xs font-semibold text-forest border border-sage-border">
                            {job.applicationCount || 0}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Status */}
                            <button
                              type="button"
                              onClick={() => handleToggleJobStatus(job)}
                              title={job.status === "Active" ? "Deactivate" : "Activate"}
                              className="rounded-lg p-1.5 text-sage-muted hover:bg-sage-secondary/50 hover:text-forest transition-colors"
                            >
                              {job.status === "Active" ? (
                                <ToggleRight className="h-4 w-4 text-emerald-700" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-zinc-400" />
                              )}
                            </button>

                            {/* Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateJob(job)}
                              title="Duplicate Vacancy"
                              className="rounded-lg p-1.5 text-sage-muted hover:bg-sage-secondary/50 hover:text-forest transition-colors"
                            >
                              <Copy className="h-4 w-4" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => openJobModal(job)}
                              title="Edit Vacancy"
                              className="rounded-lg p-1.5 text-sage-muted hover:bg-sage-secondary/50 hover:text-forest transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteJob(job)}
                              title="Delete Vacancy"
                              className="rounded-lg p-1.5 text-sage-muted hover:bg-rose-100 hover:text-rose-700 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 2: APPLICATION MANAGEMENT
      ========================================== */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search applicant, email, phone..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  className="field-luxury text-xs pl-10"
                />
              </div>

              {/* Status Filter */}
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="field-luxury text-xs w-36"
              >
                <option value="all">All Statuses</option>
                {APP_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Position Filter */}
              <select
                value={appJobFilter}
                onChange={(e) => setAppJobFilter(e.target.value)}
                className="field-luxury text-xs w-44"
              >
                <option value="all">All Positions</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={appSort}
                onChange={(e) => setAppSort(e.target.value)}
                className="field-luxury text-xs w-32"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              <button
                type="button"
                onClick={fetchApplications}
                className="p-2.5 rounded-full border border-sage-border bg-sage-card text-sage-muted hover:text-forest"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {appsLoading ? (
            <div className="p-12 text-center text-xs text-sage-muted">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="rounded-3xl border border-sage-border bg-sage-card p-12 text-center text-sage-muted text-xs">
              No applications match your criteria.
            </div>
          ) : (
            <div className="rounded-3xl border border-sage-border bg-sage-card overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sage-secondary/50 border-b border-sage-border text-forest font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Applicant</th>
                      <th className="p-4">Target Position</th>
                      <th className="p-4">Applied Date</th>
                      <th className="p-4">Resume</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage-border">
                    {applications.map((app) => (
                      <tr key={app._id} className="hover:bg-sage-secondary/20 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-forest">{app.applicantName}</div>
                          <div className="text-[11px] text-sage-muted">{app.email}</div>
                          <div className="text-[11px] text-sage-muted">{app.phone}</div>
                        </td>
                        <td className="p-4 font-medium text-site">{app.positionTitle}</td>
                        <td className="p-4 text-sage-muted">
                          {new Date(app.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="p-4">
                          {app.resume?.url ? (
                            <a
                              href={mediaUrl(app.resume.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-site hover:underline font-medium"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-zinc-400">None</span>
                          )}
                        </td>
                        <td className="p-4">
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app._id, e.target.value)}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold border-none cursor-pointer ${
                              app.status === "New"
                                ? "bg-amber-100 text-amber-800"
                                : app.status === "Shortlisted"
                                ? "bg-blue-100 text-blue-800"
                                : app.status === "Interview"
                                ? "bg-purple-100 text-purple-800"
                                : app.status === "Selected"
                                ? "bg-emerald-100 text-emerald-800"
                                : app.status === "Rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-zinc-100 text-zinc-800"
                            }`}
                          >
                            {APP_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openAppDetails(app)}
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-site bg-sage-bg border border-sage-border hover:bg-sage-card transition-colors"
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteApp(app._id)}
                              className="rounded-lg p-1 text-sage-muted hover:text-rose-700 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: PAGE CONTENT MANAGEMENT
      ========================================== */}
      {activeTab === "content" && (
        <div className="space-y-8">
          {contentLoading ? (
            <div className="p-12 text-center text-xs text-sage-muted">Loading content settings...</div>
          ) : pageContent ? (
            <div className="space-y-8">
              {/* Section A: Hero Settings */}
              <div className="rounded-3xl border border-sage-border bg-sage-card p-6 sm:p-8 shadow-soft space-y-4">
                <h2 className="font-serif text-xl text-forest font-medium">Hero Section Content</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-forest">Hero Badge Tag</label>
                    <input
                      type="text"
                      value={pageContent.hero?.badge || ""}
                      onChange={(e) =>
                        setPageContent({
                          ...pageContent,
                          hero: { ...pageContent.hero, badge: e.target.value }
                        })
                      }
                      className="field-luxury text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-forest">Main Heading</label>
                    <input
                      type="text"
                      value={pageContent.hero?.heading || ""}
                      onChange={(e) =>
                        setPageContent({
                          ...pageContent,
                          hero: { ...pageContent.hero, heading: e.target.value }
                        })
                      }
                      className="field-luxury text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-forest">Hero Description</label>
                    <textarea
                      rows={2}
                      value={pageContent.hero?.description || ""}
                      onChange={(e) =>
                        setPageContent({
                          ...pageContent,
                          hero: { ...pageContent.hero, description: e.target.value }
                        })
                      }
                      className="field-luxury text-xs resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Why Join Us Cards */}
              <div className="rounded-3xl border border-sage-border bg-sage-card p-6 sm:p-8 shadow-soft space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-xl text-forest font-medium">
                      Why Join Us Cards ({pageContent.whyJoinUs?.length || 0})
                    </h2>
                    <p className="text-xs text-sage-muted mt-0.5">
                      Configure the benefit cards displayed on the public Careers page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCardModal()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(72,125,72)] px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#7C9B69] transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Card</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(pageContent.whyJoinUs || []).map((card) => (
                    <div
                      key={card.id}
                      className="relative rounded-2xl border border-sage-border bg-sage-bg p-5 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-site uppercase tracking-wider">
                            {card.icon}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              card.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                            }`}
                          >
                            {card.active ? "Active" : "Hidden"}
                          </span>
                        </div>
                        <h4 className="font-serif text-base text-forest font-medium">{card.title}</h4>
                        <p className="text-xs text-sage-muted leading-relaxed line-clamp-3">
                          {card.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-4 border-t border-sage-border/60 mt-4">
                        <button
                          type="button"
                          onClick={() => openCardModal(card)}
                          className="rounded-lg p-1 text-sage-muted hover:text-forest"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="rounded-lg p-1 text-sage-muted hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section C: Final CTA Settings */}
              <div className="rounded-3xl border border-sage-border bg-sage-card p-6 sm:p-8 shadow-soft space-y-4">
                <h2 className="font-serif text-xl text-forest font-medium">Final CTA Section</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-forest">CTA Heading</label>
                    <input
                      type="text"
                      value={pageContent.cta?.heading || ""}
                      onChange={(e) =>
                        setPageContent({
                          ...pageContent,
                          cta: { ...pageContent.cta, heading: e.target.value }
                        })
                      }
                      className="field-luxury text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-forest">Button Text</label>
                    <input
                      type="text"
                      value={pageContent.cta?.buttonText || ""}
                      onChange={(e) =>
                        setPageContent({
                          ...pageContent,
                          cta: { ...pageContent.cta, buttonText: e.target.value }
                        })
                      }
                      className="field-luxury text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-forest">CTA Description</label>
                    <textarea
                      rows={2}
                      value={pageContent.cta?.description || ""}
                      onChange={(e) =>
                        setPageContent({
                          ...pageContent,
                          cta: { ...pageContent.cta, description: e.target.value }
                        })
                      }
                      className="field-luxury text-xs resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Save All Content Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={contentSaving}
                  onClick={handleSaveContent}
                  className="rounded-full bg-[rgb(72,125,72)] px-8 py-3 text-xs font-medium text-white shadow-sm hover:bg-[#7C9B69] transition-all disabled:opacity-60"
                >
                  {contentSaving ? "Saving Settings..." : "Save Careers Content"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ==========================================
          MODAL: JOB CREATE / EDIT
      ========================================== */}
      {jobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-sage-border bg-sage-card p-6 sm:p-8 shadow-2xl z-10 my-8 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setJobModalOpen(false)}
              className="absolute right-5 top-5 p-1 rounded-full text-sage-muted hover:text-forest"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-serif text-2xl text-forest font-medium mb-1">
              {editingJob ? "Edit Job Vacancy" : "Create New Job Vacancy"}
            </h3>
            <p className="text-xs text-sage-muted mb-6">
              Fill out all details for this position. Active jobs will display immediately on the public website.
            </p>

            <form onSubmit={handleSaveJob} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-forest">
                    Job Title <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g. Senior Colorist & DaVinci Resolve Artist"
                    className="field-luxury text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-forest">
                    Department <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    placeholder="e.g. Post-Production"
                    className="field-luxury text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-forest">Employment Type</label>
                  <select
                    value={jobForm.employmentType}
                    onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                    className="field-luxury text-xs"
                  >
                    {EMPLOYMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-forest">Experience Required</label>
                  <input
                    type="text"
                    value={jobForm.experience}
                    onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
                    placeholder="e.g. 3+ Years"
                    className="field-luxury text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-forest">Location</label>
                  <input
                    type="text"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="e.g. Mohali, Punjab • Studio / Hybrid"
                    className="field-luxury text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-forest">Salary / Compensation</label>
                  <input
                    type="text"
                    value={jobForm.salary}
                    onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })}
                    placeholder="e.g. Competitive / Based on Portfolio"
                    className="field-luxury text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-forest">Status</label>
                  <select
                    value={jobForm.status}
                    onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })}
                    className="field-luxury text-xs"
                  >
                    {JOB_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-forest">
                    Short Description <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Provide an overview of the role and what the candidate will be doing..."
                    className="field-luxury text-xs resize-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-forest">
                    Key Responsibilities (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={jobForm.responsibilities}
                    onChange={(e) => setJobForm({ ...jobForm, responsibilities: e.target.value })}
                    placeholder="Lead color grading sessions...&#10;Develop film print looks...&#10;Collaborate with directors..."
                    className="field-luxury text-xs resize-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-forest">
                    Required Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={jobForm.requiredSkills}
                    onChange={(e) => setJobForm({ ...jobForm, requiredSkills: e.target.value })}
                    placeholder="DaVinci Resolve, ACES, Film Emulation, Shot Matching"
                    className="field-luxury text-xs"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-forest">
                    Benefits & Perks (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={jobForm.benefits}
                    onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                    placeholder="Apple XDR reference suite&#10;Annual equipment stipend&#10;Flexible hybrid working"
                    className="field-luxury text-xs resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-sage-border mt-4">
                <button
                  type="button"
                  onClick={() => setJobModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-medium text-sage-muted hover:text-forest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={jobSaving}
                  className="rounded-full bg-[rgb(72,125,72)] px-6 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-[#7C9B69] transition-all disabled:opacity-60"
                >
                  {jobSaving ? "Saving..." : editingJob ? "Update Vacancy" : "Create Vacancy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: APPLICATION DETAILS
      ========================================== */}
      {appModalOpen && activeApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-sage-border bg-sage-card p-6 sm:p-8 shadow-2xl z-10 my-8 max-h-[90vh] overflow-y-auto space-y-6">
            <button
              type="button"
              onClick={() => setAppModalOpen(false)}
              className="absolute right-5 top-5 p-1 rounded-full text-sage-muted hover:text-forest"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-site">
                APPLICANT PROFILE
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-forest font-medium mt-1">
                {activeApp.applicantName}
              </h3>
              <p className="text-xs text-sage-muted">
                Applied for <span className="font-semibold text-forest">{activeApp.positionTitle}</span> on{" "}
                {new Date(activeApp.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-sage-bg border border-sage-border text-xs">
              <div className="flex items-center gap-2 text-forest">
                <Mail className="h-4 w-4 text-site" />
                <a href={`mailto:${activeApp.email}`} className="hover:underline">
                  {activeApp.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-forest">
                <Phone className="h-4 w-4 text-site" />
                <a href={`tel:${activeApp.phone}`} className="hover:underline">
                  {activeApp.phone}
                </a>
              </div>
              {activeApp.portfolio && (
                <div className="flex items-center gap-2 text-forest">
                  <LinkIcon className="h-4 w-4 text-site" />
                  <a
                    href={activeApp.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>Portfolio / Reel</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {activeApp.linkedin && (
                <div className="flex items-center gap-2 text-forest">
                  <ExternalLink className="h-4 w-4 text-site" />
                  <a
                    href={activeApp.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    LinkedIn Profile
                  </a>
                </div>
              )}
            </div>

            {/* Resume File */}
            {activeApp.resume?.url && (
              <div className="flex items-center justify-between p-4 rounded-2xl border border-[rgb(72,125,72)]/30 bg-[rgb(72,125,72)]/10">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-site" />
                  <div>
                    <div className="text-xs font-semibold text-forest">
                      {activeApp.resume.originalName || activeApp.resume.filename}
                    </div>
                    <div className="text-[11px] text-sage-muted">
                      {(activeApp.resume.size / 1024).toFixed(1)} KB • {activeApp.resume.mimeType}
                    </div>
                  </div>
                </div>
                <a
                  href={mediaUrl(activeApp.resume.url)}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(72,125,72)] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C9B69] transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Resume</span>
                </a>
              </div>
            )}

            {/* Cover Letter */}
            {activeApp.coverLetter && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-forest block">
                  Cover Letter / Message
                </span>
                <p className="text-xs sm:text-sm text-sage-muted whitespace-pre-wrap rounded-2xl bg-sage-bg p-4 border border-sage-border leading-relaxed">
                  {activeApp.coverLetter}
                </p>
              </div>
            )}

            {/* Status Change Selector */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-forest block">
                Application Status
              </span>
              <div className="flex flex-wrap gap-2">
                {APP_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(activeApp._id, st)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      activeApp.status === st
                        ? "bg-[rgb(72,125,72)] text-white shadow-sm"
                        : "bg-sage-bg border border-sage-border text-sage-muted hover:text-forest"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-forest block">
                Internal Evaluation Notes
              </span>
              <textarea
                rows={3}
                value={currentAppNotes}
                onChange={(e) => setCurrentAppNotes(e.target.value)}
                placeholder="Add private evaluation notes, interview feedback, or salary expectations..."
                className="field-luxury text-xs resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={appNoteSaving}
                  onClick={handleSaveAppNotes}
                  className="rounded-full border border-sage-border bg-sage-bg px-4 py-1.5 text-xs font-medium text-forest hover:border-[rgb(72,125,72)] transition-all"
                >
                  {appNoteSaving ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-sage-border">
              <button
                type="button"
                onClick={() => handleDeleteApp(activeApp._id)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Application</span>
              </button>

              <button
                type="button"
                onClick={() => setAppModalOpen(false)}
                className="rounded-full bg-sage-secondary px-6 py-2 text-xs font-medium text-forest hover:bg-sage-secondary/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: WHY JOIN US CARD EDIT
      ========================================== */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-sage-border bg-sage-card p-6 shadow-2xl z-10 space-y-4">
            <h3 className="font-serif text-xl text-forest font-medium">
              {editingCard ? "Edit Card" : "Add Why Join Us Card"}
            </h3>

            <form onSubmit={handleSaveCard} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-forest">Card Title</label>
                <input
                  type="text"
                  required
                  value={cardForm.title}
                  onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                  className="field-luxury text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-forest">Icon Name</label>
                <select
                  value={cardForm.icon}
                  onChange={(e) => setCardForm({ ...cardForm, icon: e.target.value })}
                  className="field-luxury text-xs"
                >
                  <option value="Users">Users</option>
                  <option value="Film">Film</option>
                  <option value="Sparkles">Sparkles</option>
                  <option value="Heart">Heart</option>
                  <option value="TrendingUp">TrendingUp</option>
                  <option value="Briefcase">Briefcase</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-forest">Card Description</label>
                <textarea
                  rows={3}
                  required
                  value={cardForm.description}
                  onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                  className="field-luxury text-xs resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cardActive"
                  checked={cardForm.active}
                  onChange={(e) => setCardForm({ ...cardForm, active: e.target.checked })}
                  className="rounded border-sage-border text-[rgb(72,125,72)]"
                />
                <label htmlFor="cardActive" className="text-xs text-forest">
                  Active (visible on website)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-sage-border mt-3">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-sage-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[rgb(72,125,72)] px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#7C9B69]"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
