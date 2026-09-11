import { CheckCircle2, AlertCircle, Loader2, Send, Sparkles, Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import Container from "../components/ui/Container.jsx";
import SectionHeading from "../components/ui/SectionHeading.jsx";
import { apiFetch } from "../lib/api.js";
import { useCmsCollection } from "../lib/useCmsCollection.js";
import { useSiteSettings } from "../lib/useSiteSettings.js";

const DEFAULT_CONTACT = {
  heroLabel: "Get In Touch",
  heroTitle: "Start Your Project With Us",
  heroDescription:
    "We collaborate with luxury wedding photographers, studios, and editorial filmmakers around the globe. Tell us about your vision.",
  sectionLabel: "Direct Contact",
  sectionTitle: "Reach Out to Our Studio",
  email: "hello@theeditingtable.com",
  phone: "+91 XXXXX XXXXX",
  locations: "Mohali, Punjab • Panchkula • Global Digital Studio",
  faqTitle: "Frequently Asked Questions",
  faqs: [
    {
      question: "What is your typical turnaround time?",
      answer: "Standard video edits are delivered within 5–7 business days. Rush delivery is available upon request."
    },
    {
      question: "How do I send my RAW files?",
      answer: "We support direct cloud uploads via Dropbox, Google Drive, WeTransfer, or Vimeo links."
    }
  ]
};

const DEFAULT_SERVICES = [
  { _id: "s1", title: "Editorial Video Editing" },
  { _id: "s2", title: "High-End Color Grading" },
  { _id: "s3", title: "Luxury Retouching" },
  { _id: "s4", title: "Full Post-Production Suite" }
];

const DEFAULT_BUDGET_RANGES = [
  "$1,000 - $2,500",
  "$2,500 - $5,000",
  "$5,000 - $10,000",
  "$10,000+"
];

export default function ContactPage() {
  const { items: services } = useCmsCollection("/api/v1/cms/services", "services");
  const { settings } = useSiteSettings();
  const cmsContact = settings.publicContent?.contact || {};

  const contact = {
    heroLabel: cmsContact.heroLabel || DEFAULT_CONTACT.heroLabel,
    heroTitle: cmsContact.heroTitle || DEFAULT_CONTACT.heroTitle,
    heroDescription: cmsContact.heroDescription || DEFAULT_CONTACT.heroDescription,
    sectionLabel: cmsContact.sectionLabel || DEFAULT_CONTACT.sectionLabel,
    sectionTitle: cmsContact.sectionTitle || DEFAULT_CONTACT.sectionTitle,
    email: cmsContact.email || DEFAULT_CONTACT.email,
    phone: cmsContact.phone || DEFAULT_CONTACT.phone,
    locations: cmsContact.locations || DEFAULT_CONTACT.locations,
    faqTitle: cmsContact.faqTitle || DEFAULT_CONTACT.faqTitle,
    faqs: Array.isArray(cmsContact.faqs) && cmsContact.faqs.length > 0 ? cmsContact.faqs : DEFAULT_CONTACT.faqs,
  };

  const displayServices = Array.isArray(services) && services.length > 0 ? services : DEFAULT_SERVICES;
  const cmsBudgets = settings.publicContent?.budgetRanges;
  const budgetRanges = Array.isArray(cmsBudgets) && cmsBudgets.length > 0 ? cmsBudgets : DEFAULT_BUDGET_RANGES;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    budget: "",
    deliveryDate: "",
    referenceUrl: "",
    description: ""
  });

  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [responseMsg, setResponseMsg] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      errors.description = "Project description must be at least 10 characters.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus("loading");
    setResponseMsg("");

    try {
      const result = await apiFetch("/api/v1/enquiries", {
        method: "POST",
        body: JSON.stringify(formData)
      });

      if (result.success) {
        setStatus("success");
        setResponseMsg(result.message || "Your enquiry has been received successfully!");
        setFormData({
          name: "",
          email: "",
          phone: "",
          service: "",
          budget: "",
          deliveryDate: "",
          referenceUrl: "",
          description: ""
        });
      } else {
        setStatus("error");
        setResponseMsg(result.message || "An error occurred while submitting your enquiry.");
        if (result.errors) setValidationErrors(result.errors);
      }
    } catch (error) {
      setStatus("error");
      setResponseMsg(error.message || "Unable to connect to the studio server. Please try again.");
      if (error.payload?.data && typeof error.payload.data === "object") {
        setValidationErrors(error.payload.data);
      }
    }
  };

  return (
    <div className="pt-28 pb-16">
      {/* Hero Banner */}
      <section className="relative py-20 bg-sage-secondary/40 border-b border-sage-border/60">
        <Container className="max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card/80 px-4 py-1.5 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-site" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-site">
              {contact.heroLabel}
            </span>
          </div>

          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-normal text-forest leading-[1.08]">
            {contact.heroTitle}
          </h1>

          <p className="text-lg sm:text-xl text-sage-muted max-w-2xl mx-auto leading-relaxed">
            {contact.heroDescription}
          </p>
        </Container>
      </section>

      {/* Main Form & Info Section */}
      <section className="py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          {/* Studio Contact Information */}
          <div className="space-y-8">
            <SectionHeading
              label={contact.sectionLabel}
              title={contact.sectionTitle}
              align="left"
            />

            <div className="space-y-6 rounded-3xl border border-sage-border bg-sage-card p-8 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-light/15 text-site">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-forest">Direct Email</h3>
                  <a href={`mailto:${contact.email}`} className="text-sm text-sage-muted hover:text-site transition-colors">
                    {contact.email}
                  </a>
                </div>
              </div>

              {contact.phone && (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-light/15 text-site">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg text-forest">Studio Phone</h3>
                    <p className="text-sm text-sage-muted">{contact.phone}</p>
                  </div>
                </div>
              )}

              {contact.locations && (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-light/15 text-site">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg text-forest">Studio Locations</h3>
                    <p className="text-sm text-sage-muted">{contact.locations}</p>
                  </div>
                </div>
              )}
            </div>

            {contact.faqs && contact.faqs.length > 0 && (
              <div className="rounded-3xl border border-sage-border/80 bg-sage-secondary/40 p-8 space-y-3">
                <h4 className="font-heading text-xl text-forest">{contact.faqTitle}</h4>
                {contact.faqs.map((faq) => (
                  <p key={faq.question} className="text-xs text-sage-muted leading-relaxed">
                    <strong>{faq.question}</strong> {faq.answer}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Enquiry Form */}
          <div className="rounded-3xl border border-sage-light/40 bg-sage-card p-8 sm:p-10 shadow-editorial space-y-6">
            <h2 className="font-heading text-3xl text-forest font-normal">Project Inquiry Form</h2>

            {status === "success" && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{responseMsg}</span>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-900 text-sm">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <span>{responseMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Elena Vance"
                    className="field-luxury"
                    required
                  />
                  {validationErrors.name && (
                    <p className="text-xs text-rose-600 mt-1">{validationErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="elena@ateliervance.com"
                    className="field-luxury"
                    required
                  />
                  {validationErrors.email && (
                    <p className="text-xs text-rose-600 mt-1">{validationErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="field-luxury"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-2">
                    Required Service *
                  </label>
                  <select
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    className="field-luxury cursor-pointer"
                  >
                    <option value="">Select a service</option>
                    {displayServices.map((service) => (
                      <option key={service._id || service.title} value={service.title}>
                        {service.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-2">
                    Estimated Budget Range
                  </label>
                  <select
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    className="field-luxury cursor-pointer"
                  >
                    <option value="">Select a budget range</option>
                    {budgetRanges.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleChange}
                    className="field-luxury cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-2">
                  Cloud Link or Reference URL (Dropbox, Drive, Vimeo)
                </label>
                <input
                  type="text"
                  name="referenceUrl"
                  value={formData.referenceUrl}
                  onChange={handleChange}
                  placeholder="https://dropbox.com/s/your-raw-files"
                  className="field-luxury"
                />
                {validationErrors.referenceUrl && (
                  <p className="text-xs text-rose-600 mt-1">{validationErrors.referenceUrl}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-2">
                  Project Description & Requirements *
                </label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe camera profiles used, number of RAW photos / footage size, music preferences, and style notes..."
                  className="field-luxury py-3"
                  required
                />
                {validationErrors.description && (
                  <p className="text-xs text-rose-600 mt-1">{validationErrors.description}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-[#7C9B69] hover:shadow-sage disabled:opacity-50 cursor-pointer"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Submitting Enquiry...
                  </>
                ) : (
                  <>
                    Submit Project Enquiry <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </Container>
      </section>
    </div>
  );
}
