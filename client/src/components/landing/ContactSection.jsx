import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, AlertCircle, Calendar, ChevronDown, UploadCloud } from "lucide-react";
import { apiFetch } from "../../lib/api.js";
import { useCmsCollection } from "../../lib/useCmsCollection.js";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import Container from "../ui/Container.jsx";
import InquiryVideoShowcase from "./InquiryVideoShowcase.jsx";

const DEFAULT_SERVICES = [
  { _id: "cs-1", title: "Editorial Video Editing" },
  { _id: "cs-2", title: "High-End Color Grading" },
  { _id: "cs-3", title: "Luxury Retouching" },
  { _id: "cs-4", title: "Full Post-Production Suite" }
];

const DEFAULT_BUDGET_RANGES = [
  "$1,000 - $2,500",
  "$2,500 - $5,000",
  "$5,000 - $10,000",
  "$10,000+"
];

export default function ContactSection() {
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInputRef = useRef(null);

  const { items: services } = useCmsCollection("/api/v1/cms/services", "services");
  const { settings } = useSiteSettings();
  const displayServices = Array.isArray(services) && services.length > 0 ? services : DEFAULT_SERVICES;
  const cmsBudgets = settings.publicContent?.budgetRanges;
  const budgetRanges = Array.isArray(cmsBudgets) && cmsBudgets.length > 0 ? cmsBudgets : DEFAULT_BUDGET_RANGES;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      service: "",
      projectDetails: "",
      budgetRange: "",
      deliveryDate: "",
      referenceLink: ""
    }
  });

  const onSubmit = async (values) => {
    setSubmitState({ status: "loading", message: "" });
    try {
      // Strictly submits textual inquiry metadata — NO video files or binary uploaded to Neon DB
      const response = await apiFetch("/api/v1/enquiries", {
        method: "POST",
        body: JSON.stringify({
          name: values.fullName,
          email: values.email,
          phone: values.phone,
          service: values.service,
          description: values.projectDetails + (selectedFileName ? ` [Attached reference note: ${selectedFileName}]` : ""),
          budget: values.budgetRange,
          deliveryDate: values.deliveryDate,
          referenceUrl: values.referenceLink
        })
      });
      setSubmitState({
        status: "success",
        message: response.message || "Thank you. Your inquiry has been received. Our editorial team will review and reply within 24 hours."
      });
      reset();
      setSelectedFileName("");
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error.message || "Your inquiry could not be submitted. Please try again."
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  };

  return (
    <section
      id="contact"
      data-theme="contact"
      aria-label="Inquiry & Revision Section"
      className="relative z-10 py-16 sm:py-20 lg:py-24 overflow-hidden scroll-mt-20 border-t border-[#94A48A]/40"
      style={{
        background: "radial-gradient(ellipse at 40% 30%, #B2C0A5 0%, #A4B397 50%, #95A587 100%)"
      }}
    >
      {/* ================= NATURAL PLASTER GRAIN & FOLIAGE SHADOW ================= */}
      {/* Ambient Plaster texture */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.22] mix-blend-multiply select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <filter id="inquiry-plaster-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.6  0 0 0 0 0.65  0 0 0 0 0.55  0 0 0 0.55 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#inquiry-plaster-noise)" />
      </svg>

      {/* Top-left artistic botanical foliage shadow matching reference design */}
      <div
        className="absolute top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 pointer-events-none opacity-30 select-none"
        aria-hidden="true"
      >
        <svg viewBox="0 0 300 300" fill="currentColor" className="w-full h-full text-[#283824]">
          <path d="M 0 0 C 40 30 80 50 120 40 C 90 70 50 85 10 95 C 60 110 110 100 150 75 C 130 110 90 140 40 160 C 100 165 160 145 190 100 C 170 145 120 185 60 210 C 130 200 190 170 220 120 C 200 170 150 220 80 250 C 160 230 220 180 250 120 C 230 180 180 240 100 280 C 180 250 250 190 280 120 Z" />
        </svg>
      </div>

      <Container className="relative z-10 max-w-[1240px]">
        {/* Responsive Grid: Form on Left, Local Video Showcase on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* ================= LEFT COLUMN: INQUIRY & REVISION FORM ================= */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Header: "Inquiry & Revision" + Star Divider */}
            <div className="select-none mb-8 sm:mb-10 text-left">
              <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                <h2 className="font-heading text-4xl sm:text-5xl md:text-[3.5rem] text-[#1B291A] font-normal tracking-tight">
                  Inquiry &amp;
                </h2>
                <span className="font-lavishly text-4xl sm:text-5xl md:text-[3.6rem] text-[#1B291A] font-normal italic tracking-wide">
                  Revision
                </span>
              </div>

              {/* Star Divider: —— ✦ —— */}
              <div className="flex items-center gap-3 mt-3.5 max-w-[280px]">
                <span className="h-[1px] flex-1 bg-[#283924]/40" aria-hidden="true" />
                <span className="text-[#283924] text-xs leading-none">✦</span>
                <span className="h-[1px] flex-1 bg-[#283924]/40" aria-hidden="true" />
              </div>
            </div>

            {/* Editorial Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {/* 1. Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B291A]">
                    FULL NAME
                  </label>
                  <input
                    {...register("fullName", { required: "Full name is required" })}
                    placeholder="Enter Your Name"
                    autoComplete="name"
                    className="w-full bg-transparent border-b border-[#283924]/35 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1B291A] transition-colors"
                  />
                  {errors.fullName && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.fullName.message}</span>
                  )}
                </div>

                {/* 2. Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B291A]">
                    EMAIL ADDRESS
                  </label>
                  <input
                    {...register("email", {
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" }
                    })}
                    type="email"
                    placeholder="Enter Your Email"
                    autoComplete="email"
                    className="w-full bg-transparent border-b border-[#283924]/35 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1B291A] transition-colors"
                  />
                  {errors.email && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.email.message}</span>
                  )}
                </div>

                {/* 3. Phone / WhatsApp */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B291A]">
                    PHONE / WHATSAPP
                  </label>
                  <input
                    {...register("phone", { required: "Phone number is required" })}
                    type="tel"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    className="w-full bg-transparent border-b border-[#283924]/35 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1B291A] transition-colors"
                  />
                  {errors.phone && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.phone.message}</span>
                  )}
                </div>

                {/* 4. Primary Service Required */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B291A]">
                    PRIMARY SERVICE REQUIRED
                  </label>
                  <div className="relative">
                    <select
                      {...register("service", { required: "Select a service" })}
                      defaultValue=""
                      style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                      className="w-full bg-transparent border-b border-[#283924]/35 py-2 pr-7 text-sm sm:text-base text-[#152315] outline-none focus:border-[#1B291A] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" disabled className="text-gray-500 bg-[#A4B397]">
                        Select Service
                      </option>
                      {displayServices.map((service) => (
                        <option key={service._id || service.title} value={service.title} className="text-[#152315] bg-[#A4B397]">
                          {service.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#283924] pointer-events-none" />
                  </div>
                  {errors.service && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.service.message}</span>
                  )}
                </div>

                {/* 5. Project Scope / Budget */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B291A]">
                    PROJECT SCOPE / BUDGET
                  </label>
                  <div className="relative">
                    <select
                      {...register("budgetRange", { required: "Select budget range" })}
                      defaultValue=""
                      style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                      className="w-full bg-transparent border-b border-[#283924]/35 py-2 pr-7 text-sm sm:text-base text-[#152315] outline-none focus:border-[#1B291A] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" disabled className="text-gray-500 bg-[#A4B397]">
                        Select Scope Budget
                      </option>
                      {budgetRanges.map((range) => (
                        <option key={range} value={range} className="text-[#152315] bg-[#A4B397]">
                          {range}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#283924] pointer-events-none" />
                  </div>
                  {errors.budgetRange && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.budgetRange.message}</span>
                  )}
                </div>

                {/* 6. Target Delivery Date */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B291A]">
                    TARGET DELIVERY DATE
                  </label>
                  <div className="relative">
                    <input
                      {...register("deliveryDate")}
                      type="date"
                      onClick={(e) => {
                        if (typeof e.target.showPicker === "function") {
                          try { e.target.showPicker(); } catch {}
                        }
                      }}
                      className="w-full bg-transparent border-b border-[#283924]/35 py-2 pr-7 text-sm sm:text-base text-[#152315] placeholder:italic outline-none focus:border-[#1B291A] transition-colors cursor-pointer [color-scheme:light]"
                    />
                    <Calendar className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#283924] pointer-events-none" />
                  </div>
                </div>

                {/* 7. Reference Reel / Gallery Link */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B291A]">
                    REFERENCE REEL / GALLERY LINK
                  </label>
                  <input
                    {...register("referenceLink", {
                      pattern: {
                        value: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i,
                        message: "Enter a valid URL"
                      }
                    })}
                    type="url"
                    placeholder="Vimeo, Dropbox or Gallery URL"
                    className="w-full bg-transparent border-b border-[#283924]/35 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1B291A] transition-colors"
                  />
                  {errors.referenceLink && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.referenceLink.message}</span>
                  )}
                </div>

                {/* 8. Project Notes & Creative Direction */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B291A]">
                    PROJECT NOTES &amp; CREATIVE DIRECTION
                  </label>
                  <textarea
                    {...register("projectDetails", {
                      required: "Project details are required",
                      minLength: { value: 10, message: "Please provide at least 10 characters" }
                    })}
                    rows={2}
                    placeholder="Describe your requirements, style, or any specific notes..."
                    className="w-full bg-transparent border-b border-[#283924]/35 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1B291A] transition-colors resize-y min-h-[70px]"
                  />
                  {errors.projectDetails && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.projectDetails.message}</span>
                  )}
                </div>

                {/* 9. Video (Optional) Box */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B291A]">
                    VIDEO (OPTIONAL)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 border border-[#283924]/35 hover:border-[#1B291A] rounded-xl px-4 py-3 bg-white/10 hover:bg-white/20 transition-all cursor-pointer select-none"
                  >
                    <UploadCloud className="h-5 w-5 text-[#283924] shrink-0" />
                    <span className="text-xs sm:text-sm text-[#1B291A] font-medium">
                      {selectedFileName ? selectedFileName : "Upload Video"}
                    </span>
                    <span className="text-xs text-[#283924]/60 hidden sm:inline">
                      | &nbsp; or drag &amp; drop your video here
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Feedback messages */}
              {submitState.message ? (
                <div
                  className={`flex items-center gap-3 rounded-xl p-3.5 text-xs font-medium ${
                    submitState.status === "error"
                      ? "border border-rose-300 bg-rose-50/90 text-rose-800"
                      : "border border-[#283924]/30 bg-[#283924]/10 text-[#1B291A]"
                  }`}
                >
                  {submitState.status === "error" ? (
                    <AlertCircle className="h-5 w-5 text-rose-700 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-[#283924] shrink-0" />
                  )}
                  <span>{submitState.message}</span>
                </div>
              ) : null}

              {/* Submit Button with Curved Brushstroke Accent */}
              <div className="pt-3 flex flex-col items-start select-none">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative flex items-center gap-2.5 font-heading text-xl sm:text-2xl text-[#1B291A] hover:text-[#0E170E] transition-colors cursor-pointer outline-none pb-2"
                >
                  <span>{isSubmitting ? "Submitting Inquiry..." : "Submit Inquiry"}</span>
                  <span className="text-xl sm:text-2xl group-hover:translate-x-1.5 transition-transform duration-200">
                    →
                  </span>

                  {/* Curved brush underline accent matching the screenshot */}
                  <svg
                    className="absolute bottom-0 left-0 w-[145px] h-[8px] text-[#283924]/75 pointer-events-none"
                    viewBox="0 0 145 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M 2 4 Q 72 8 143 2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* ================= RIGHT COLUMN: LOCAL VIDEO SHOWCASE ================= */}
          <div className="lg:col-span-5 w-full flex items-center justify-center">
            <InquiryVideoShowcase />
          </div>
        </div>
      </Container>
    </section>
  );
}
