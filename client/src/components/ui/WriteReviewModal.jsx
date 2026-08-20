/* global FormData */
import { AlertCircle, CheckCircle2, Loader2, Star, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import { useCmsCollection } from "../../lib/useCmsCollection.js";

const FALLBACK_PROJECT_TYPES = [
  "Photo Editing",
  "Photo Retouching",
  "Color Grading",
  "Video Editing",
  "Wedding Post-Production",
  "Film Post-Production",
  "Album Design",
  "Brand Campaign",
  "Other"
];

export default function WriteReviewModal({ isOpen, onClose, onSuccess }) {
  const { items: services } = useCmsCollection("/api/v1/cms/services", "services");
  const modalRef = useRef(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    projectType: "",
    title: "",
    message: "",
    country: "",
    city: "",
    profileImage: "",
    projectImage: "",
    honeypot: "",
    consent: false
  });

  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const projectTypes = [...new Set([
    ...services.map((service) => String(service.title || "").trim()).filter(Boolean),
    ...FALLBACK_PROJECT_TYPES
  ])];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setSubmittedSuccess(false);
      setErrorMsg("");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);

    const body = new FormData();
    body.append("file", file);

    try {
      const data = await apiFetch("/api/v1/reviews/upload", {
        method: "POST",
        body
      });
      if (data.data?.url) {
        setFormData((prev) => ({ ...prev, [field]: data.data.url }));
      } else {
        setErrorMsg(data.message || "Failed to upload image.");
      }
    } catch (error) {
      setErrorMsg(error.message || "Image upload failed. You can also paste an image URL.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consent) {
      setErrorMsg("Please accept the terms to submit your review.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setErrorMsg("Please select a rating between 1 and 5 stars.");
      return;
    }
    if (uploadingField) {
      setErrorMsg("Please wait for the image upload to finish before submitting.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const data = await apiFetch("/api/v1/reviews", {
        method: "POST",
        body: JSON.stringify({ ...formData, rating })
      });

      if (data.success) {
        setSubmittedSuccess(true);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(data.message || "Failed to submit review.");
      }
    } catch (error) {
      setErrorMsg(error.message || "Review submission failed. Please verify the API server and try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      projectType: "",
      title: "",
      message: "",
      country: "",
      city: "",
      profileImage: "",
      projectImage: "",
      honeypot: "",
      consent: false
    });
    setRating(5);
    setSubmittedSuccess(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-4 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="relative max-w-2xl w-full rounded-3xl border border-sage-light/40 bg-sage-card p-6 sm:p-8 space-y-6 shadow-deep my-8 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full text-sage-muted transition hover:bg-sage-secondary/60 hover:text-forest"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {submittedSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-serif text-3xl text-forest">Review Submitted</h2>
            <p className="text-sm text-sage-muted max-w-md mx-auto leading-relaxed">
              Thank you! Your endorsement has been submitted and is currently awaiting admin verification. Once verified, it will be showcased publicly.
            </p>
            <button
              type="button"
              onClick={resetAndClose}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-8 py-3 text-xs font-semibold hover:bg-[#7C9B69] transition shadow-sage cursor-pointer"
            >
              Close Window
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-site">Client Endorsement</span>
              <h2 id="modal-title" className="font-serif text-3xl text-forest">Share Your Experience</h2>
              <p className="text-xs text-sage-muted">
                Your feedback helps us maintain our uncompromising standard of cinematic post-production.
              </p>
            </div>

            {errorMsg && (
              <div role="alert" aria-live="assertive" className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Rating Picker */}
              <div>
                <label className="block text-xs font-semibold text-sage-muted mb-1.5 uppercase tracking-wider">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-site transition-transform hover:scale-110 hover:bg-sage-secondary/60"
                      aria-label={`Rate ${star} out of 5 stars`}
                    >
                      <Star
                        className={`h-7 w-7 ${
                          (hoverRating || rating) >= star ? "fill-copper text-site" : "text-border-warm"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-site ml-2">{rating}.0 / 5.0</span>
                </div>
              </div>

              {/* Grid Inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="field-luxury text-sm"
                    placeholder="e.g. Claire Dupond"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={120}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="field-luxury text-sm"
                    placeholder="claire@studio.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Company / Studio (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="field-luxury text-sm"
                    placeholder="Atelier Paris"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Project Type *
                  </label>
                  <select
                    required
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className="field-luxury text-sm"
                  >
                    <option value="">Select a service</option>
                    {projectTypes.map((projectType) => (
                      <option key={projectType} value={projectType}>
                        {projectType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    City / Country (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="field-luxury text-sm"
                    placeholder="Paris, France"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={30}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="field-luxury text-sm"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>

              {/* Review Title & Message */}
              <div>
                <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                  Review Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="field-luxury text-sm"
                  placeholder="e.g. Uncompromising Color Precision & Flawless Pacing"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                  Endorsement Message *
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="field-luxury text-sm"
                  placeholder="Describe your experience working with The Editing Table..."
                />
              </div>

              {/* Image Uploads */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Profile Photo URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.profileImage}
                      onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                      className="field-luxury text-xs flex-1"
                      placeholder="https://..."
                    />
                    <label className="p-3 rounded-2xl border border-sage-border bg-sage-secondary/50 text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer flex items-center justify-center">
                      {uploadingField === "profileImage" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-site" />
                      ) : (
                        <Upload className="h-4 w-4 text-site" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "profileImage")}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Project Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.projectImage}
                      onChange={(e) => setFormData({ ...formData, projectImage: e.target.value })}
                      className="field-luxury text-xs flex-1"
                      placeholder="https://..."
                    />
                    <label className="p-3 rounded-2xl border border-sage-border bg-sage-secondary/50 text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer flex items-center justify-center">
                      {uploadingField === "projectImage" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-site" />
                      ) : (
                        <Upload className="h-4 w-4 text-site" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "projectImage")}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Honeypot Spam Field (Hidden) */}
              <div style={{ display: "none" }}>
                <input
                  type="text"
                  name="website_url_hp"
                  tabIndex="-1"
                  autoComplete="off"
                  value={formData.honeypot}
                  onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                />
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-sage-border text-site focus:ring-[rgb(72,125,72)]"
                />
                <label htmlFor="consent" className="text-xs text-sage-muted leading-relaxed">
                  I confirm this endorsement reflects my genuine experience as a client of The Editing Table. I consent to having my review displayed after admin approval.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || Boolean(uploadingField)}
                aria-busy={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-6 py-3.5 text-xs font-semibold hover:bg-[#7C9B69] hover:shadow-sage transition cursor-pointer shadow-soft disabled:cursor-not-allowed disabled:opacity-50 mt-2"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting securely...</> : uploadingField ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading image...</> : "Submit Review for Approval"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
