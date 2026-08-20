import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { apiFetch } from "../../lib/api.js";
import { useCmsCollection } from "../../lib/useCmsCollection.js";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import Button from "../ui/Button.jsx";
import Container from "../ui/Container.jsx";
import SectionHeading from "../ui/SectionHeading.jsx";

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
      const response = await apiFetch("/api/v1/enquiries", {
        method: "POST",
        body: JSON.stringify({
          name: values.fullName,
          email: values.email,
          phone: values.phone,
          service: values.service,
          description: values.projectDetails,
          budget: values.budgetRange,
          deliveryDate: values.deliveryDate,
          referenceUrl: values.referenceLink
        })
      });
      setSubmitState({ status: "success", message: response.message });
      reset();
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error.message || "Your enquiry could not be submitted."
      });
    }
  };

  return (
    <section id="contact" data-theme="contact" className="section-pad">
      <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <SectionHeading
            align="left"
            label="Inquire & Reserve"
            title="Initiate Your Post-Production Suite"
            text="Share your project timeline, raw camera specs, and color references. We align on scope and prepare your dedicated editing suite."
          />

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-4 rounded-2xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <ShieldCheck className="h-6 w-6 text-site shrink-0 mt-0.5" />
              <div>
                <p className="font-serif text-lg font-normal text-forest">Strict Confidentiality & NDA</p>
                <p className="text-xs text-sage-muted mt-1 leading-relaxed">
                  Your raw assets, high-profile celebrity weddings, and unreleased commercial footage are handled in secure offline environments.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <Mail className="h-6 w-6 text-site shrink-0 mt-0.5" />
              <div>
                <p className="font-serif text-lg font-normal text-forest">Direct Producer Communication</p>
                <p className="text-xs text-sage-muted mt-1 leading-relaxed">
                  You work directly with a dedicated post-production supervisor throughout culling, grading, and final delivery.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Editorial Form Card */}
        <form
          className="rounded-3xl border border-sage-border bg-sage-card p-8 shadow-editorial space-y-5"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name" error={errors.fullName?.message}>
              <input
                {...register("fullName", { required: "Full name is required" })}
                className="field-luxury"
                placeholder="Elena Vance"
                autoComplete="name"
              />
            </Field>

            <Field label="Studio Email" error={errors.email?.message}>
              <input
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" }
                })}
                className="field-luxury"
                type="email"
                placeholder="elena@atelierweddings.com"
                autoComplete="email"
              />
            </Field>

            <Field label="Phone / WhatsApp" error={errors.phone?.message}>
              <input
                {...register("phone", { required: "Phone number is required" })}
                className="field-luxury"
                type="tel"
                placeholder="+1 (555) 019-2834"
                autoComplete="tel"
              />
            </Field>

            <Field label="Primary Service Required" error={errors.service?.message}>
              <select {...register("service", { required: "Select a service" })} className="field-luxury cursor-pointer">
                <option value="">Select Suite Service</option>
                {displayServices.map((service) => (
                  <option key={service._id || service.title} value={service.title}>
                    {service.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Project Scope / Budget" error={errors.budgetRange?.message}>
              <select {...register("budgetRange", { required: "Select budget range" })} className="field-luxury cursor-pointer">
                <option value="">Select Scope Budget</option>
                {budgetRanges.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Target Delivery Date" error={errors.deliveryDate?.message}>
              <input {...register("deliveryDate")} className="field-luxury cursor-pointer" type="date" />
            </Field>

            <Field label="Reference Reel / Gallery Link" error={errors.referenceLink?.message} className="sm:col-span-2">
              <input
                {...register("referenceLink", {
                  pattern: {
                    value: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i,
                    message: "Enter a valid URL"
                  }
                })}
                className="field-luxury"
                type="text"
                placeholder="Vimeo, Dropbox, or Gallery URL"
              />
            </Field>

            <Field label="Project Notes & Creative Direction" error={errors.projectDetails?.message} className="sm:col-span-2">
              <textarea
                {...register("projectDetails", {
                  required: "Project details are required",
                  minLength: { value: 15, message: "Please provide at least 15 characters" }
                })}
                className="field-luxury min-h-[120px] resize-y py-3"
                placeholder="Describe raw footage specs, LUT preferences, song choices, or retouching depth..."
              />
            </Field>
          </div>

          {submitState.message ? (
            <div className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-medium ${
              submitState.status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-[rgb(72,125,72)]/30 bg-sage-secondary text-forest"
            }`}>
              <CheckCircle2 className="h-5 w-5 text-site shrink-0" />
              <span>{submitState.message}</span>
            </div>
          ) : null}

          <Button type="submit" variant="primary" className="w-full py-4 text-base" loading={isSubmitting}>
            Submit Suite Inquiry
          </Button>
        </form>
      </Container>
    </section>
  );
}

function Field({ label, error, children, className = "" }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="block text-xs font-semibold uppercase tracking-wider text-site">{label}</span>
      {children}
      {error ? <span className="block text-xs font-medium text-site">{error}</span> : null}
    </label>
  );
}
