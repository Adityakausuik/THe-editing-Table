/* global console */
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  User,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api.js";
import MediaUploadDropzone from "../components/MediaUploadDropzone.jsx";

const DEFAULT_STATE = {
  fullName: "Akshay Chhabra",
  designation: "Founder & Creative Director",
  location: "Mohali, Punjab • Global Remote",
  profileImage: "/assets/akshay-chhabra-founder.jpg",
  quote: "Every frame matters. Every story deserves its own visual language.",
  introBadge: "FOUNDER & CREATIVE DIRECTOR",
  introTitle: "Akshay Chhabra",
  introSubtitle:
    "Founder and creative force behind The Editing Table — crafting bespoke visual language and cinematic color science for premier storytellers worldwide.",
  aboutHeading: "Crafting Stories Beyond The Frame",
  aboutParagraphs: [
    "Founded by Akshay Chhabra, The Editing Table was established with a singular conviction: every filmmaker, photographer, and creative brand deserves post-production that elevates their visual storytelling to cinematic perfection.",
    "Over the past decade, Akshay has overseen hundreds of luxury wedding films, high-fashion editorial campaigns, and commercial master deliveries across India, the UK, Europe, and North America.",
    "Working at the intersection of raw human emotion and technical color science, Akshay personally directs the production workflow to preserve each client's signature aesthetic while applying calibrated 35mm analog emulation and precision color grading."
  ],
  visionHeading: "A Vision for Global Cinematic Post-Production",
  visionText:
    "To build an artist-first post-production house that bridges the gap between raw footage capture and theatrical-grade master delivery. By combining calibrated color-managed pipelines (ACES / DaVinci YRGB) with artisanal retouching, we empower filmmakers and photographers to scale their output without compromising on bespoke craftsmanship.",
  experienceYears: "10+ Years",
  experienceHeading: "A Decade of High-End Post-Production Mastery",
  experienceText:
    "With over ten years spearheading post-production pipelines, Akshay combines the technical precision of color science with an innate sensibility for pacing, tone, and editorial rhythm.",
  skills: [
    "DaVinci Resolve",
    "ACES Color Science",
    "Analog 35mm Film Emulation",
    "Micro Dodge & Burn",
    "High-Fashion Retouching",
    "Dolby Vision HDR",
    "DIT & Ingest Workflows",
    "Commercial Finishing"
  ],
  whatIDo: [
    {
      title: "Creative Direction & Color Science",
      tag: "Direction",
      description:
        "Developing bespoke look profiles, custom LUTs, and color-managed pipelines tailored to each production's artistic identity."
    },
    {
      title: "Narrative Assembly & Pacing",
      tag: "Editorial",
      description:
        "Shaping raw wedding cinema, fashion films, and brand narratives into rhythmic stories that resonate emotionally."
    },
    {
      title: "High-Fashion Editorial Retouching",
      tag: "Retouching",
      description:
        "Micro-level skin texture preservation, frequency separation, and color grading for high-end campaigns and editorial spreads."
    },
    {
      title: "Quality Gate & Delivery",
      tag: "Mastering",
      description:
        "Personal frame-by-frame QC on every delivery, guaranteeing DCI-P3 / Rec.709 calibration and broadcast compliance."
    }
  ],
  companyRoleHeading: "The Editing Table — Dedicated Infrastructure",
  companyRoleText:
    "As Founder and Creative Director, Akshay leads the dedicated post-production team in Mohali, Punjab. Every client engagement pairs bespoke personal consultation with high-throughput processing speed and security.",
  turnaroundHours: "48-72 Hours",
  clientRetentionRate: "99.8%",
  globalDelivery: "Worldwide • Calibrated Cloud Workflows",
  philosophyHeading: "Creative & Production Philosophy",
  philosophyPillars: [
    {
      title: "Uncompromising Precision",
      description:
        "Every cut, curve, and grade is executed with micro-precision. We never rely on generic presets; each project receives custom look development."
    },
    {
      title: "Filmic Authenticity",
      description:
        "Inspired by classic 35mm and medium-format film stocks, our grading honors natural skin tones, organic halation, and filmic grain response."
    },
    {
      title: "Bespoke Partnership",
      description:
        "We operate as an extension of your team. Your signature style is strictly documented and preserved across all future seasons."
    }
  ]
};

export default function AboutMeCMS() {
  const [formData, setFormData] = useState(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");
  const [newSkillInput, setNewSkillInput] = useState("");

  const fetchAboutMe = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/v1/cms/about-me/admin");
      if (res?.data) {
        setFormData({
          ...DEFAULT_STATE,
          ...res.data,
          aboutParagraphs:
            Array.isArray(res.data.aboutParagraphs) && res.data.aboutParagraphs.length > 0
              ? res.data.aboutParagraphs
              : DEFAULT_STATE.aboutParagraphs,
          skills:
            Array.isArray(res.data.skills) && res.data.skills.length > 0
              ? res.data.skills
              : DEFAULT_STATE.skills,
          whatIDo:
            Array.isArray(res.data.whatIDo) && res.data.whatIDo.length > 0
              ? res.data.whatIDo
              : DEFAULT_STATE.whatIDo,
          philosophyPillars:
            Array.isArray(res.data.philosophyPillars) && res.data.philosophyPillars.length > 0
              ? res.data.philosophyPillars
              : DEFAULT_STATE.philosophyPillars
        });
      }
    } catch (err) {
      console.error("Fetch About profile failed:", err);
      setError(err.message || "Failed to load About profile content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAboutMe();
  }, [fetchAboutMe]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleParagraphChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.aboutParagraphs];
      updated[index] = value;
      return { ...prev, aboutParagraphs: updated };
    });
  };

  const handleAddParagraph = () => {
    setFormData((prev) => ({
      ...prev,
      aboutParagraphs: [...prev.aboutParagraphs, ""]
    }));
  };

  const handleRemoveParagraph = (index) => {
    setFormData((prev) => ({
      ...prev,
      aboutParagraphs: prev.aboutParagraphs.filter((_, i) => i !== index)
    }));
  };

  const handleAddSkill = (e) => {
    e?.preventDefault();
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (formData.skills.includes(trimmed)) {
      setNewSkillInput("");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, trimmed]
    }));
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove)
    }));
  };

  const handleWhatIDoChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.whatIDo];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, whatIDo: updated };
    });
  };

  const handleAddWhatIDo = () => {
    setFormData((prev) => ({
      ...prev,
      whatIDo: [
        ...prev.whatIDo,
        { title: "New Responsibility", tag: "Capability", description: "Describe this area of expertise." }
      ]
    }));
  };

  const handleRemoveWhatIDo = (index) => {
    setFormData((prev) => ({
      ...prev,
      whatIDo: prev.whatIDo.filter((_, i) => i !== index)
    }));
  };

  const handlePillarChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.philosophyPillars];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, philosophyPillars: updated };
    });
  };

  const handleAddPillar = () => {
    setFormData((prev) => ({
      ...prev,
      philosophyPillars: [
        ...prev.philosophyPillars,
        { title: "New Core Pillar", description: "Describe the philosophy pillar." }
      ]
    }));
  };

  const handleRemovePillar = (index) => {
    setFormData((prev) => ({
      ...prev,
      philosophyPillars: prev.philosophyPillars.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const res = await apiFetch("/api/v1/cms/about-me", {
        method: "PUT",
        body: JSON.stringify(formData)
      });
      if (res?.success) {
        setSavedMsg("About content updated and published successfully!");
        setTimeout(() => setSavedMsg(""), 3500);
      }
    } catch (err) {
      console.error("Save About profile failed:", err);
      setError(err.message || "Failed to update About profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[rgb(72,125,72)]" />
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile & Portrait", icon: User },
    { id: "story", label: "Story & Vision", icon: Sparkles },
    { id: "skills", label: "Experience & Skills", icon: Zap },
    { id: "responsibilities", label: "What I Do", icon: Briefcase },
    { id: "philosophy", label: "Company & Philosophy", icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">
            CMS Management
          </span>
          <h1 className="font-heading text-3xl font-normal text-forest">About Profile CMS</h1>
          <p className="text-xs text-sage-muted mt-1">
            Manage personal storytelling, leadership vision, skills, responsibilities, and creative philosophy for Akshay Chhabra.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-sage-border bg-sage-card px-4 py-2 text-xs font-semibold text-forest hover:border-[rgb(72,125,72)] hover:text-site transition"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View Live Page
          </Link>
          <button
            type="button"
            onClick={fetchAboutMe}
            className="inline-flex items-center gap-1.5 rounded-full border border-sage-border bg-sage-card px-4 py-2 text-xs font-semibold text-forest hover:border-[rgb(72,125,72)] transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reload
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(72,125,72)] px-5 py-2 text-xs font-semibold text-white shadow-soft hover:bg-[#7C9B69] transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? "Saving Changes..." : "Save All Changes"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {savedMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-sage-border pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? "bg-[rgb(72,125,72)] text-white shadow-soft"
                  : "bg-sage-card text-forest hover:bg-sage-secondary border border-sage-border"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content Tabs */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab 1: Profile & Portrait */}
        {activeTab === "profile" && (
          <div className="space-y-6 rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft">
            <h2 className="font-heading text-xl text-forest font-semibold">Personal Profile &amp; Hero</h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleFieldChange("fullName", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. Akshay Chhabra"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => handleFieldChange("designation", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. Founder & Creative Director"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Location &amp; Operations
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleFieldChange("location", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. Mohali, Punjab • Global Remote"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Hero Badge Label
                  </label>
                  <input
                    type="text"
                    value={formData.introBadge}
                    onChange={(e) => handleFieldChange("introBadge", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. FOUNDER & CREATIVE DIRECTOR"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Hero Title
                  </label>
                  <input
                    type="text"
                    value={formData.introTitle}
                    onChange={(e) => handleFieldChange("introTitle", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. Akshay Chhabra"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <MediaUploadDropzone
                  folder="aboutme"
                  value={formData.profileImage}
                  onChange={(url) => handleFieldChange("profileImage", url)}
                  label="Editorial Portrait Photo"
                  description="Upload a high-resolution portrait (portrait aspect ratio recommended)"
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Direct Quote / Motto
                  </label>
                  <textarea
                    rows={3}
                    value={formData.quote}
                    onChange={(e) => handleFieldChange("quote", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white p-3 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. Every frame matters. Every story deserves its own visual language."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Hero Subtitle Summary
                  </label>
                  <textarea
                    rows={3}
                    value={formData.introSubtitle}
                    onChange={(e) => handleFieldChange("introSubtitle", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white p-3 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="Brief intro summary..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Story & Vision */}
        {activeTab === "story" && (
          <div className="space-y-6 rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft">
            <div>
              <h2 className="font-heading text-xl text-forest font-semibold">Story &amp; Professional Journey</h2>
              <p className="text-xs text-sage-muted mt-0.5">
                Detailed story of Akshay Chhabra and the inception of The Editing Table.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                  About Section Heading
                </label>
                <input
                  type="text"
                  value={formData.aboutHeading}
                  onChange={(e) => handleFieldChange("aboutHeading", e.target.value)}
                  className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                  placeholder="e.g. Crafting Stories Beyond The Frame"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site">
                    Story Paragraphs
                  </label>
                  <button
                    type="button"
                    onClick={handleAddParagraph}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-site hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Paragraph
                  </button>
                </div>

                {formData.aboutParagraphs.map((paragraph, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-site mt-3">{index + 1}.</span>
                    <textarea
                      rows={3}
                      value={paragraph}
                      onChange={(e) => handleParagraphChange(index, e.target.value)}
                      className="flex-1 rounded-xl border border-sage-border bg-white p-3 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                      placeholder={`Paragraph ${index + 1}...`}
                    />
                    {formData.aboutParagraphs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParagraph(index)}
                        className="p-2 text-rose-500 hover:text-rose-700 transition cursor-pointer mt-1"
                        title="Remove Paragraph"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-sage-border pt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Vision Section Heading
                  </label>
                  <input
                    type="text"
                    value={formData.visionHeading}
                    onChange={(e) => handleFieldChange("visionHeading", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. A Vision for Global Cinematic Post-Production"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Vision Statement
                  </label>
                  <textarea
                    rows={4}
                    value={formData.visionText}
                    onChange={(e) => handleFieldChange("visionText", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white p-3 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="Vision statement text..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Experience & Skills */}
        {activeTab === "skills" && (
          <div className="space-y-6 rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft">
            <div>
              <h2 className="font-heading text-xl text-forest font-semibold">Experience &amp; Specialized Skills</h2>
              <p className="text-xs text-sage-muted mt-0.5">
                Showcase technical prowess, color grading suites, and specialized craft competencies.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                  Years of Experience Badge
                </label>
                <input
                  type="text"
                  value={formData.experienceYears}
                  onChange={(e) => handleFieldChange("experienceYears", e.target.value)}
                  className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                  placeholder="e.g. 10+ Years"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                  Experience Heading
                </label>
                <input
                  type="text"
                  value={formData.experienceHeading}
                  onChange={(e) => handleFieldChange("experienceHeading", e.target.value)}
                  className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                  placeholder="e.g. A Decade of High-End Post-Production Mastery"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                Experience Overview Text
              </label>
              <textarea
                rows={3}
                value={formData.experienceText}
                onChange={(e) => handleFieldChange("experienceText", e.target.value)}
                className="w-full rounded-xl border border-sage-border bg-white p-3 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                placeholder="Overview of experience..."
              />
            </div>

            <div className="border-t border-sage-border pt-6 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-site">
                Specialized Technical Skills &amp; Badges
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-1 rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                  placeholder="Type a skill (e.g. ACES Color Science) and press Add"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="inline-flex items-center gap-1 rounded-xl bg-[rgb(72,125,72)] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C9B69] transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add Skill
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/60 px-3 py-1 text-xs font-medium text-forest"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-sage-muted hover:text-rose-600 transition cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: What I Do */}
        {activeTab === "responsibilities" && (
          <div className="space-y-6 rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-xl text-forest font-semibold">What I Do — Core Focus Areas</h2>
                <p className="text-xs text-sage-muted mt-0.5">
                  Structure your core responsibilities and craft commitments.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddWhatIDo}
                className="inline-flex items-center gap-1 rounded-full bg-[rgb(72,125,72)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7C9B69] transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Focus Area
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {formData.whatIDo.map((item, index) => (
                <div
                  key={index}
                  className="relative rounded-2xl border border-sage-border bg-white p-4 space-y-3 shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-site bg-sage-secondary px-2 py-0.5 rounded-md">
                      Area #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWhatIDo(index)}
                      className="text-sage-muted hover:text-rose-600 transition p-1 cursor-pointer"
                      title="Delete card"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-sage-muted mb-0.5">
                      Badge / Tag
                    </label>
                    <input
                      type="text"
                      value={item.tag || ""}
                      onChange={(e) => handleWhatIDoChange(index, "tag", e.target.value)}
                      className="w-full rounded-lg border border-sage-border bg-sage-card px-2.5 py-1.5 text-xs text-forest focus:outline-none"
                      placeholder="e.g. Direction"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-sage-muted mb-0.5">
                      Card Title
                    </label>
                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={(e) => handleWhatIDoChange(index, "title", e.target.value)}
                      className="w-full rounded-lg border border-sage-border bg-sage-card px-2.5 py-1.5 text-xs font-semibold text-forest focus:outline-none"
                      placeholder="e.g. Creative Direction & Color Science"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-sage-muted mb-0.5">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={item.description || ""}
                      onChange={(e) => handleWhatIDoChange(index, "description", e.target.value)}
                      className="w-full rounded-lg border border-sage-border bg-sage-card p-2 text-xs text-sage-muted focus:outline-none"
                      placeholder="Detailed responsibilities..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Company & Philosophy */}
        {activeTab === "philosophy" && (
          <div className="space-y-6 rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft">
            <div>
              <h2 className="font-heading text-xl text-forest font-semibold">The Editing Table &amp; Philosophy</h2>
              <p className="text-xs text-sage-muted mt-0.5">
                Connect the founder&apos;s personal role with production capabilities and guiding principles.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                  Company Role Heading
                </label>
                <input
                  type="text"
                  value={formData.companyRoleHeading}
                  onChange={(e) => handleFieldChange("companyRoleHeading", e.target.value)}
                  className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                  placeholder="e.g. The Editing Table — Dedicated Infrastructure"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                  Company Role Description
                </label>
                <textarea
                  rows={3}
                  value={formData.companyRoleText}
                  onChange={(e) => handleFieldChange("companyRoleText", e.target.value)}
                  className="w-full rounded-xl border border-sage-border bg-white p-3 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                  placeholder="Company description and founder's role..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Turnaround Stat
                  </label>
                  <input
                    type="text"
                    value={formData.turnaroundHours}
                    onChange={(e) => handleFieldChange("turnaroundHours", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. 48-72 Hours"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Pass / Retention Rate
                  </label>
                  <input
                    type="text"
                    value={formData.clientRetentionRate}
                    onChange={(e) => handleFieldChange("clientRetentionRate", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. 99.8%"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Delivery Scope
                  </label>
                  <input
                    type="text"
                    value={formData.globalDelivery}
                    onChange={(e) => handleFieldChange("globalDelivery", e.target.value)}
                    className="w-full rounded-xl border border-sage-border bg-white px-3.5 py-2 text-sm text-forest focus:border-[rgb(72,125,72)] focus:outline-none"
                    placeholder="e.g. Worldwide • Cloud Workflows"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-sage-border pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg text-forest font-semibold">Core Philosophy Pillars</h3>
                  <p className="text-xs text-sage-muted">The core creative rules that define every project output.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPillar}
                  className="inline-flex items-center gap-1 rounded-full bg-[rgb(72,125,72)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7C9B69] transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Pillar
                </button>
              </div>

              <div className="space-y-3">
                {formData.philosophyPillars.map((pillar, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-sage-border bg-white p-4 space-y-2 shadow-soft relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-site">
                        Pillar #{index + 1}
                      </span>
                      {formData.philosophyPillars.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePillar(index)}
                          className="text-sage-muted hover:text-rose-600 transition p-1 cursor-pointer"
                          title="Remove pillar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={pillar.title || ""}
                      onChange={(e) => handlePillarChange(index, "title", e.target.value)}
                      className="w-full rounded-lg border border-sage-border bg-sage-card px-2.5 py-1.5 text-xs font-semibold text-forest focus:outline-none"
                      placeholder="Pillar Title (e.g. Uncompromising Precision)"
                    />

                    <textarea
                      rows={2}
                      value={pillar.description || ""}
                      onChange={(e) => handlePillarChange(index, "description", e.target.value)}
                      className="w-full rounded-lg border border-sage-border bg-sage-card p-2 text-xs text-sage-muted focus:outline-none"
                      placeholder="Pillar description..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-sage-border">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] px-7 py-3 text-sm font-semibold text-white shadow-soft hover:bg-[#7C9B69] transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? "Saving Changes..." : "Save All Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
