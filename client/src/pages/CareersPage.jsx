/* global FormData, console */
import { AnimatePresence, m } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Film,
  Heart,
  MapPin,
  Send,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button.jsx";
import Container from "../components/ui/Container.jsx";
import SectionHeading from "../components/ui/SectionHeading.jsx";
import { apiFetch } from "../lib/api.js";

const ICON_MAP = {
  Users,
  Film,
  Sparkles,
  Heart,
  TrendingUp,
  Briefcase,
  Clock
};

export default function CareersPage() {
  const [jobs, setJobs] = useState([]);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDept, setSelectedDept] = useState("All");
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Application Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState({
    applicantName: "",
    email: "",
    phone: "",
    positionTitle: "",
    jobId: "",
    portfolio: "",
    linkedin: "",
    coverLetter: ""
  });
  const [resumeFile, setResumeFile] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [jobsRes, contentRes] = await Promise.all([
          apiFetch("/api/v1/careers/jobs"),
          apiFetch("/api/v1/careers/content")
        ]);
        setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);
        setContent(contentRes.data || null);
      } catch (err) {
        console.error("Failed to fetch careers data:", err);
        setError("Unable to load current career opportunities. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const departments = useMemo(() => {
    const set = new Set(jobs.map((j) => j.department).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (selectedDept === "All") return jobs;
    return jobs.filter((j) => j.department === selectedDept);
  }, [jobs, selectedDept]);

  const openApplyModal = (job = null) => {
    setSelectedJob(job);
    setFormData({
      applicantName: "",
      email: "",
      phone: "",
      positionTitle: job ? job.title : "General Application / Spontaneous",
      jobId: job ? job._id : "",
      portfolio: "",
      linkedin: "",
      coverLetter: ""
    });
    setResumeFile(null);
    setSubmitSuccess(false);
    setSubmitError("");
    setModalOpen(true);
  };

  const closeApplyModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("File size exceeds 10MB limit. Please upload a smaller document.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "doc", "docx"].includes(ext || "")) {
      setSubmitError("Please upload a PDF, DOC, or DOCX document.");
      return;
    }

    setSubmitError("");
    setResumeFile(file);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!formData.applicantName.trim()) {
      setSubmitError("Please provide your full name.");
      return;
    }
    if (!formData.email.trim()) {
      setSubmitError("Please provide your email address.");
      return;
    }
    if (!formData.phone.trim()) {
      setSubmitError("Please provide your phone number.");
      return;
    }
    if (!resumeFile) {
      setSubmitError("Please attach your resume document (PDF, DOC, or DOCX).");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const data = new FormData();
      data.append("applicantName", formData.applicantName.trim());
      data.append("email", formData.email.trim());
      data.append("phone", formData.phone.trim());
      data.append("positionTitle", formData.positionTitle.trim());
      if (formData.jobId) data.append("jobId", formData.jobId);
      if (formData.portfolio) data.append("portfolio", formData.portfolio.trim());
      if (formData.linkedin) data.append("linkedin", formData.linkedin.trim());
      if (formData.coverLetter) data.append("coverLetter", formData.coverLetter.trim());
      data.append("resume", resumeFile);

      await apiFetch("/api/v1/careers/apply", {
        method: "POST",
        body: data
      });

      setSubmitSuccess(true);
    } catch (err) {
      console.error("Submission failed:", err);
      setSubmitError(err.message || "Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const heroHeading = content?.hero?.heading || "Build Your Career With Us";
  const heroDesc =
    content?.hero?.description ||
    "Join our passionate team of visionary colorists, editors, retouching artists, and creative technologists crafting timeless visual stories for premier studios worldwide.";
  const heroBadge = content?.hero?.badge || "JOIN OUR CREATIVE STUDIO";

  const whyJoinUsCards = (content?.whyJoinUs || []).filter((c) => c.active !== false);

  const ctaHeading = content?.cta?.heading || "Don't See the Right Opening?";
  const ctaDesc =
    content?.cta?.description ||
    "We are always on the lookout for exceptional talent. Submit your portfolio and resume to join our talent roster.";
  const ctaButtonText = content?.cta?.buttonText || "Send Your Resume";

  return (
    <div className="min-h-screen bg-sage-bg text-forest pt-28 pb-20 selection:bg-[rgb(72,125,72)]/20">
      <Container className="space-y-24 sm:space-y-32">
        {/* ==========================================
            1. HERO SECTION
        ========================================== */}
        <section className="text-center max-w-4xl mx-auto space-y-6 pt-6 sm:pt-12">
          <m.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-site backdrop-blur-md shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-site" />
            <span>{heroBadge}</span>
          </m.div>

          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-forest leading-[1.08]"
          >
            {heroHeading}
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-sage-muted font-normal leading-relaxed max-w-2xl mx-auto"
          >
            {heroDesc}
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="pt-2 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="#open-positions"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] px-7 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:bg-[#7C9B69] hover:shadow-sage active:scale-[0.98]"
            >
              <span>Explore Vacancies</span>
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => openApplyModal()}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card/80 px-7 py-3 text-sm font-medium text-forest backdrop-blur-sm transition-all duration-300 hover:border-[rgb(72,125,72)] hover:bg-sage-card hover:text-site active:scale-[0.98]"
            >
              <span>Send Your Resume</span>
              <Send className="h-4 w-4" />
            </button>
          </m.div>
        </section>

        {/* ==========================================
            2. WHY JOIN US SECTION
        ========================================== */}
        <section className="space-y-12">
          <SectionHeading
            label="CULTURE & BENEFITS"
            title="Why Build Your Craft at The Editing Table"
            text="We provide an inspiring environment designed to help creative post-production artists flourish."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {whyJoinUsCards.map((card, idx) => {
              const IconComp = ICON_MAP[card.icon] || Sparkles;
              return (
                <m.div
                  key={card.id || idx}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className="group relative rounded-3xl border border-sage-border bg-sage-card/90 p-8 shadow-soft backdrop-blur-md transition-all duration-500 hover:border-[rgb(72,125,72)]/40 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(72,125,72)]/10 text-site transition-transform duration-500 group-hover:scale-110 group-hover:bg-[rgb(72,125,72)] group-hover:text-white">
                    <IconComp className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl text-forest font-medium tracking-tight mb-3">
                    {card.title}
                  </h3>
                  <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
                    {card.description}
                  </p>
                </m.div>
              );
            })}
          </div>
        </section>

        {/* ==========================================
            3. OPEN POSITIONS SECTION
        ========================================== */}
        <section id="open-positions" className="space-y-10 scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-sage-border pb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-site">
                CURRENT VACANCIES
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-forest mt-2">
                Open Positions
              </h2>
            </div>

            {/* Department Filter Pills */}
            {departments.length > 2 && (
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDept(dept)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                      selectedDept === dept
                        ? "bg-[rgb(72,125,72)] text-white shadow-sm"
                        : "bg-sage-card border border-sage-border text-sage-muted hover:text-forest hover:border-[rgb(72,125,72)]/30"
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading && (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[rgb(72,125,72)] border-t-transparent" />
              <p className="text-sm text-sage-muted">Loading open positions...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-8 rounded-3xl bg-rose-50 border border-rose-200 text-center text-rose-800 text-sm">
              {error}
            </div>
          )}

          {/* Job List Cards */}
          {!loading && !error && filteredJobs.length > 0 && (
            <div className="space-y-6">
              {filteredJobs.map((job, idx) => {
                const isExpanded = expandedJobId === job._id;
                return (
                  <m.div
                    key={job._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    className="rounded-3xl border border-sage-border bg-sage-card p-6 sm:p-8 shadow-soft transition-all duration-300 hover:border-[rgb(72,125,72)]/40 hover:shadow-md"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="rounded-full bg-[rgb(72,125,72)]/10 px-3 py-1 text-xs font-semibold text-site">
                            {job.department}
                          </span>
                          <span className="rounded-full border border-sage-border bg-sage-secondary/50 px-3 py-1 text-xs font-medium text-forest">
                            {job.employmentType}
                          </span>
                          {job.experience && (
                            <span className="inline-flex items-center gap-1 text-xs text-sage-muted">
                              <Clock className="h-3.5 w-3.5" />
                              {job.experience}
                            </span>
                          )}
                          {job.location && (
                            <span className="inline-flex items-center gap-1 text-xs text-sage-muted">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.location}
                            </span>
                          )}
                        </div>

                        <h3 className="font-serif text-2xl sm:text-3xl text-forest font-medium">
                          {job.title}
                        </h3>

                        <p className="text-sm sm:text-base text-sage-muted leading-relaxed max-w-3xl">
                          {job.description}
                        </p>

                        {/* Skills Badges */}
                        {Array.isArray(job.requiredSkills) && job.requiredSkills.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {job.requiredSkills.map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="rounded-lg bg-sage-bg px-2.5 py-1 text-xs font-normal text-forest border border-sage-border/60"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 shrink-0 pt-2 lg:pt-0">
                        <Button
                          variant="primary"
                          onClick={() => openApplyModal(job)}
                          className="w-full sm:w-auto"
                        >
                          Apply Now
                        </Button>
                        <button
                          type="button"
                          onClick={() => setExpandedJobId(isExpanded ? null : job._id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-site hover:text-forest transition-colors py-1"
                        >
                          <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-300 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details (Responsibilities & Benefits) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <m.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden border-t border-sage-border mt-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8"
                        >
                          {Array.isArray(job.responsibilities) && job.responsibilities.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-forest">
                                Key Responsibilities
                              </h4>
                              <ul className="space-y-2 text-xs sm:text-sm text-sage-muted">
                                {job.responsibilities.map((resp, rIdx) => (
                                  <li key={rIdx} className="flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-site mt-1.5 shrink-0" />
                                    <span>{resp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {Array.isArray(job.benefits) && job.benefits.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-forest">
                                Benefits & Perks
                              </h4>
                              <ul className="space-y-2 text-xs sm:text-sm text-sage-muted">
                                {job.benefits.map((benefit, bIdx) => (
                                  <li key={bIdx} className="flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-site mt-1.5 shrink-0" />
                                    <span>{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {job.salary && (
                            <div className="md:col-span-2 pt-2 flex items-center gap-2 text-xs text-sage-muted">
                              <span className="font-semibold text-forest">Compensation:</span>
                              <span>{job.salary}</span>
                            </div>
                          )}
                        </m.div>
                      )}
                    </AnimatePresence>
                  </m.div>
                );
              })}
            </div>
          )}

          {/* ==========================================
              4. NO VACANCIES FALLBACK
          ========================================== */}
          {!loading && !error && filteredJobs.length === 0 && (
            <div className="rounded-3xl border border-sage-border bg-sage-card p-10 sm:p-14 text-center max-w-2xl mx-auto space-y-6 shadow-soft">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgb(72,125,72)]/10 text-site">
                <Briefcase className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-2xl sm:text-3xl text-forest">
                  We don&apos;t have any open positions right now
                </h3>
                <p className="text-sm sm:text-base text-sage-muted">
                  ...but we&apos;d still love to hear from you. Send us your portfolio and resume for upcoming projects.
                </p>
              </div>
              <Button variant="primary" onClick={() => openApplyModal()}>
                Send Your Resume
              </Button>
            </div>
          )}
        </section>

        {/* ==========================================
            5. FINAL CTA SECTION
        ========================================== */}
        <section className="rounded-3xl border border-sage-border bg-sage-card p-10 sm:p-16 text-center shadow-soft backdrop-blur-md max-w-4xl mx-auto space-y-6">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-forest">
            {ctaHeading}
          </h2>
          <p className="text-base sm:text-lg text-sage-muted max-w-xl mx-auto">
            {ctaDesc}
          </p>
          <div className="pt-2">
            <Button variant="primary" onClick={() => openApplyModal()}>
              {ctaButtonText}
            </Button>
          </div>
        </section>
      </Container>

      {/* ==========================================
          6. APPLICATION MODAL
      ========================================== */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeApplyModal}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-2xl rounded-3xl border border-sage-border bg-sage-card p-6 sm:p-10 shadow-2xl z-10 my-8 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={closeApplyModal}
                className="absolute right-5 top-5 rounded-full p-2 text-sage-muted hover:bg-sage-secondary/50 hover:text-forest transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>

              {submitSuccess ? (
                /* Success State */
                <div className="py-10 text-center space-y-5">
                  <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-3xl text-forest">
                      Application Received!
                    </h3>
                    <p className="text-sm sm:text-base text-sage-muted max-w-md mx-auto">
                      Thank you for applying for{" "}
                      <span className="font-semibold text-forest">{formData.positionTitle}</span>. Our studio leads will review your portfolio and get in touch with you shortly.
                    </p>
                  </div>
                  <Button variant="primary" onClick={closeApplyModal}>
                    Close
                  </Button>
                </div>
              ) : (
                /* Application Form */
                <form onSubmit={handleSubmitApplication} className="space-y-6">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-site">
                      APPLICATION FORM
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl text-forest mt-1">
                      {selectedJob ? `Apply for ${selectedJob.title}` : "Submit Your Application"}
                    </h3>
                    <p className="text-xs sm:text-sm text-sage-muted mt-1">
                      Fill out your contact details and upload your resume document.
                    </p>
                  </div>

                  {submitError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
                      {submitError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-forest">
                        Full Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.applicantName}
                        onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                        placeholder="e.g. Alex Morgan"
                        className="field-luxury text-sm"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-forest">
                        Email Address <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="alex@example.com"
                        className="field-luxury text-sm"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-forest">
                        Phone Number <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="field-luxury text-sm"
                      />
                    </div>

                    {/* Position */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-forest">
                        Target Position <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.positionTitle}
                        onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
                        className="field-luxury text-sm"
                      />
                    </div>

                    {/* Portfolio URL */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-forest">
                        Portfolio / Reel Link
                      </label>
                      <input
                        type="url"
                        value={formData.portfolio}
                        onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                        placeholder="https://vimeo.com/... or Behance"
                        className="field-luxury text-sm"
                      />
                    </div>

                    {/* LinkedIn URL */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-forest">
                        LinkedIn Profile
                      </label>
                      <input
                        type="url"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                        className="field-luxury text-sm"
                      />
                    </div>
                  </div>

                  {/* Resume Upload Box */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-forest">
                      Resume Document (PDF, DOC, DOCX - Max 10MB) <span className="text-rose-600">*</span>
                    </label>

                    {resumeFile ? (
                      <div className="flex items-center justify-between rounded-2xl border border-[rgb(72,125,72)]/40 bg-[rgb(72,125,72)]/10 p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-6 w-6 text-site shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-forest">{resumeFile.name}</p>
                            <p className="text-[11px] text-sage-muted">
                              {(resumeFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          className="rounded-full p-1 text-sage-muted hover:text-rose-700 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sage-border p-6 text-center hover:border-[rgb(72,125,72)]/50 hover:bg-sage-secondary/30 cursor-pointer transition-all">
                        <Upload className="h-8 w-8 text-site mb-2" />
                        <span className="text-xs font-medium text-forest">
                          Click to select or drag & drop your resume
                        </span>
                        <span className="text-[11px] text-sage-muted mt-0.5">
                          Supported: PDF, DOC, DOCX up to 10MB
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Cover Letter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-forest">
                      Cover Letter / Message (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.coverLetter}
                      onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                      placeholder="Tell us about your creative background, favorite projects, and what excites you about joining The Editing Table..."
                      className="field-luxury text-sm resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={closeApplyModal}
                      className="px-5 py-2.5 rounded-full text-xs font-medium text-sage-muted hover:text-forest transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={submitting}
                      className="min-w-[160px]"
                    >
                      {submitting ? "Submitting..." : "Submit Application"}
                    </Button>
                  </div>
                </form>
              )}
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
