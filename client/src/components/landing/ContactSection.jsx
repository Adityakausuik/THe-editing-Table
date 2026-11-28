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
      className="relative z-10 py-16 sm:py-20 lg:py-24 overflow-hidden scroll-mt-20 border-t border-[#8B9D82]/40"
      style={{
        backgroundImage: "url('/inquiry-wall-texture.jpg')",
        backgroundRepeat: "repeat",
        backgroundSize: "440px auto",
        backgroundColor: "#DCE7D4"
      }}
    >
      <Container className="relative z-10 max-w-[1240px]">
        {/* Responsive Grid: Editorial Underline Form on Left, Direct Video on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* ================= LEFT COLUMN: INQUIRY & REVISION FORM ================= */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Header: "Inquiry & Revision" (Exact typography, NO divider or line) */}
            <div className="select-none mb-8 sm:mb-10 text-left">
              <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                <h2 className="font-heading text-4xl sm:text-5xl md:text-[3.5rem] text-[#1D2E1B] font-normal tracking-tight">
                  Inquiry &amp;
                </h2>
                <span className="font-lavishly text-4xl sm:text-5xl md:text-[3.6rem] text-[#1D2E1B] font-normal italic tracking-wide">
                  Revision
                </span>
              </div>
            </div>

            {/* Editorial Underline-Only Form (No cards, no boxes, no container backgrounds) */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {/* 1. Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D2E1B]">
                    FULL NAME *
                  </label>
                  <input
                    {...register("fullName", { required: "Full name is required" })}
                    placeholder="Enter Your Name"
                    autoComplete="name"
                    className="w-full bg-transparent border-b border-[#2C3E27]/40 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1D2E1B] transition-colors"
                  />
                  {errors.fullName && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.fullName.message}</span>
                  )}
                </div>

                {/* 2. Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D2E1B]">
                    EMAIL ADDRESS *
                  </label>
                  <input
                    {...register("email", {
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" }
                    })}
                    type="email"
                    placeholder="Enter Your Email"
                    autoComplete="email"
                    className="w-full bg-transparent border-b border-[#2C3E27]/40 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1D2E1B] transition-colors"
                  />
                  {errors.email && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.email.message}</span>
                  )}
                </div>

                {/* 3. Phone / WhatsApp */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D2E1B]">
                    PHONE / WHATSAPP *
                  </label>
                  <input
                    {...register("phone", { required: "Phone number is required" })}
                    type="tel"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    className="w-full bg-transparent border-b border-[#2C3E27]/40 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1D2E1B] transition-colors"
                  />
                  {errors.phone && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.phone.message}</span>
                  )}
                </div>

                {/* 4. Primary Service Required */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D2E1B]">
                    PRIMARY SERVICE REQUIRED *
                  </label>
                  <div className="relative">
                    <select
                      {...register("service", { required: "Select a service" })}
                      defaultValue=""
                      style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                      className="w-full bg-transparent border-b border-[#2C3E27]/40 py-2 pr-7 text-sm sm:text-base text-[#152315] outline-none focus:border-[#1D2E1B] transition-colors cursor-pointer"
                    >
                      <option value="" disabled className="text-gray-500 bg-[#DCE7D4]">
                        Select Service
                      </option>
                      {displayServices.map((service) => (
                        <option key={service._id || service.title} value={service.title} className="text-[#152315] bg-[#DCE7D4]">
                          {service.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2C3E27] pointer-events-none" />
                  </div>
                  {errors.service && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.service.message}</span>
                  )}
                </div>

                {/* 5. Project Scope / Budget */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D2E1B]">
                    PROJECT SCOPE / BUDGET *
                  </label>
                  <div className="relative">
                    <select
                      {...register("budgetRange", { required: "Select budget range" })}
                      defaultValue=""
                      style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                      className="w-full bg-transparent border-b border-[#2C3E27]/40 py-2 pr-7 text-sm sm:text-base text-[#152315] outline-none focus:border-[#1D2E1B] transition-colors cursor-pointer"
                    >
                      <option value="" disabled className="text-gray-500 bg-[#DCE7D4]">
                        Select Scope Budget
                      </option>
                      {budgetRanges.map((range) => (
                        <option key={range} value={range} className="text-[#152315] bg-[#DCE7D4]">
                          {range}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2C3E27] pointer-events-none" />
                  </div>
                  {errors.budgetRange && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.budgetRange.message}</span>
                  )}
                </div>

                {/* 6. Target Delivery Date */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D2E1B]">
                    TARGET DELIVERY DATE *
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
                      className="w-full bg-transparent border-b border-[#2C3E27]/40 py-2 pr-7 text-sm sm:text-base text-[#152315] placeholder:italic outline-none focus:border-[#1D2E1B] transition-colors cursor-pointer [color-scheme:light]"
                    />
                    <Calendar className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2C3E27] pointer-events-none" />
                  </div>
                </div>

                {/* 7. Reference Reel / Gallery Link */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D2E1B]">
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
                    className="w-full bg-transparent border-b border-[#2C3E27]/40 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1D2E1B] transition-colors"
                  />
                  {errors.referenceLink && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.referenceLink.message}</span>
                  )}
                </div>

                {/* 8. Video (Optional) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D2E1B]">
                    VIDEO (OPTIONAL)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 border-b border-[#2C3E27]/40 py-2 sm:py-2.5 transition-colors cursor-pointer select-none group"
                  >
                    <UploadCloud className="h-5 w-5 text-[#2C3E27] shrink-0 group-hover:scale-105 transition-transform" />
                    <span className="text-xs sm:text-sm text-[#1D2E1B] font-medium underline underline-offset-4 decoration-[#2C3E27]/40">
                      {selectedFileName ? selectedFileName : "Upload Video"}
                    </span>
                    <span className="text-xs text-[#2C3E27]/60 hidden sm:inline">
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

                {/* 9. Project Notes & Creative Direction */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D2E1B]">
                    PROJECT NOTES &amp; CREATIVE DIRECTION *
                  </label>
                  <textarea
                    {...register("projectDetails", {
                      required: "Project details are required",
                      minLength: { value: 10, message: "Please provide at least 10 characters" }
                    })}
                    rows={2}
                    placeholder="Describe your requirements, style, or any specific notes..."
                    className="w-full bg-transparent border-b border-[#2C3E27]/40 py-2 text-sm sm:text-base text-[#152315] placeholder:text-[#32452D]/60 placeholder:italic placeholder:font-light outline-none focus:border-[#1D2E1B] transition-colors resize-y min-h-[60px]"
                  />
                  {errors.projectDetails && (
                    <span className="block text-xs text-[#6B1B1B] font-medium mt-0.5">{errors.projectDetails.message}</span>
                  )}
                </div>
              </div>

              {/* Feedback messages */}
              {submitState.message ? (
                <div
                  className={`flex items-center gap-3 rounded-lg p-3 text-xs font-medium ${
                    submitState.status === "error"
                      ? "border border-rose-300 bg-rose-50/90 text-rose-800"
                      : "border border-[#2C3E27]/30 bg-[#2C3E27]/10 text-[#1D2E1B]"
                  }`}
                >
                  {submitState.status === "error" ? (
                    <AlertCircle className="h-5 w-5 text-rose-700 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-[#2C3E27] shrink-0" />
                  )}
                  <span>{submitState.message}</span>
                </div>
              ) : null}

              {/* Submit Button with Curved Brushstroke Accent */}
              <div className="pt-2 flex flex-col items-start select-none">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative flex items-center gap-2.5 font-heading text-xl sm:text-2xl text-[#1D2E1B] hover:text-[#0E170E] transition-colors cursor-pointer outline-none pb-2"
                >
                  <span>{isSubmitting ? "Submitting Inquiry..." : "Submit Inquiry"}</span>
                  <span className="text-xl sm:text-2xl group-hover:translate-x-1.5 transition-transform duration-200">
                    →
                  </span>

                  {/* Curved brush underline accent matching the reference image */}
                  <svg
                    className="absolute bottom-0 left-0 w-[145px] h-[8px] text-[#2C3E27]/75 pointer-events-none"
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

          {/* ================= RIGHT COLUMN: DIRECT VIDEO (NO BOX / NO CARD) ================= */}
          <div className="lg:col-span-5 w-full flex items-center justify-center lg:justify-end">
            <InquiryVideoShowcase />
          </div>
        </div>
      </Container>
    </section>
  );
}
