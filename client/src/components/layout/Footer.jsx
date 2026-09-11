import { ArrowRight, ArrowUp, Clock, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, subscribeToCmsChanges } from "../../lib/api.js";
import { useCmsCollection } from "../../lib/useCmsCollection.js";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import BrandLogo from "../ui/BrandLogo.jsx";

const DEFAULT_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/aboutus", label: "About Us" },
  { href: "/founder", label: "Founder & CEO" },
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/team", label: "Our Team" },
  { href: "/careers", label: "Careers" },
  { href: "/blog", label: "Blog" },
  { href: "/contactus", label: "Contact Us" }
];

const DEFAULT_SERVICES = [
  { _id: "s1", title: "Editorial Video Editing", slug: "video-editing" },
  { _id: "s2", title: "High-End Color Grading", slug: "color-grading" },
  { _id: "s3", title: "Luxury Retouching", slug: "retouching" },
  { _id: "s4", title: "Full Post-Production", slug: "full-post-production" }
];

const DEFAULT_DESCRIPTION =
  "The Editing Table is a professional pre-production and post-production studio focused on turning raw visuals into compelling stories.";

const DEFAULT_PHONES = [
  { _id: "p1", countryCode: "IN", phone: "+91 XXXXX XXXXX", displayPhone: "+91 XXXXX XXXXX" },
  { _id: "p2", countryCode: "US", phone: "+1 (212) 555-0192", displayPhone: "+1 (212) 555-0192" },
  { _id: "p3", countryCode: "GB", phone: "+44 20 7946 0912", displayPhone: "+44 20 7946 0912" },
  { _id: "p4", countryCode: "FR", phone: "+33 1 42 68 55 00", displayPhone: "+33 1 42 68 55 00" },
  { _id: "p5", countryCode: "US", phone: "+1 (310) 555-0144", displayPhone: "+1 (310) 555-0144" }
];

const DEFAULT_EMAILS = [{ _id: "e1", email: "hello@theeditingtable.com" }];

const DEFAULT_OFFICES = [
  {
    _id: "o1",
    companyName: "NHK INFOTECH",
    addressLine1: "A-28, Industrial Area, Sector 73",
    addressLine2: "Mohali, Punjab 160055"
  }
];

const DEFAULT_HOURS = [
  { _id: "h1", dayFrom: "Mon", dayTo: "Sat", openingTime: "10:00 AM", closingTime: "7:00 PM" }
];

const DEFAULT_CONTACT_SETTINGS = {
  sectionTitle: "CONTACT US",
  phoneHeading: "PHONE",
  emailHeading: "EMAIL",
  officeHeading: "OFFICE",
  workingHoursHeading: "WORKING HOURS",
  ctaText: "Let's Work Together",
  ctaLink: "/contactus",
  ctaNewTab: false,
  sectionEnabled: true,
  phoneEnabled: true,
  emailEnabled: true,
  officeEnabled: true,
  workingHoursEnabled: true,
  ctaEnabled: true
};

function getFlagEmoji(countryCode = "") {
  if (!countryCode || countryCode.length !== 2) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function Footer() {
  const year = new Date().getFullYear();
  const { settings } = useSiteSettings();
  const { items: services } = useCmsCollection("/api/v1/cms/services", "services");

  // Dynamic Contact State
  const [contactData, setContactData] = useState(null);

  const fetchContactInfo = async () => {
    try {
      const res = await apiFetch("/api/v1/contact");
      if (res?.data) {
        setContactData(res.data);
      }
    } catch {
      // Fallback stays as default
    }
  };

  useEffect(() => {
    fetchContactInfo();
    const unsubscribe = subscribeToCmsChanges((detail) => {
      if (detail?.key === "contact" || detail?.key === "settings") {
        fetchContactInfo();
      }
    });
    return () => unsubscribe();
  }, []);

  const publicContent = settings.publicContent || {};
  const footer = publicContent.footer || {};

  const cmsNav = publicContent.navigation;
  const siteLinks = Array.isArray(cmsNav) && cmsNav.length > 0 ? cmsNav : DEFAULT_NAV_LINKS;
  const displayServices = services.length > 0 ? services : DEFAULT_SERVICES;
  const description = footer.description || DEFAULT_DESCRIPTION;
  const siteName = settings.siteName || "The Editing Table";
  const instagramUrl = footer.instagram || "#";
  const linkedinUrl = footer.linkedin || "#";

  // Dynamic Contact Properties
  const contactSettings = contactData?.settings || DEFAULT_CONTACT_SETTINGS;
  const displayPhones =
    Array.isArray(contactData?.phones) && contactData.phones.length > 0
      ? contactData.phones
      : DEFAULT_PHONES;
  const displayEmails =
    Array.isArray(contactData?.emails) && contactData.emails.length > 0
      ? contactData.emails
      : DEFAULT_EMAILS;
  const displayOffices =
    Array.isArray(contactData?.offices) && contactData.offices.length > 0
      ? contactData.offices
      : DEFAULT_OFFICES;
  const displayHours =
    Array.isArray(contactData?.workingHours) && contactData.workingHours.length > 0
      ? contactData.workingHours
      : DEFAULT_HOURS;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative border-t border-sage-border bg-sage-secondary pt-[36px] md:pt-[44px] lg:pt-[56px] pb-[20px] md:pb-[22px] lg:pb-[24px] text-forest overflow-hidden box-border w-full">
      <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,5vw,80px)] box-border">
        {/* Top Section: Responsive 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_0.9fr_1.1fr] gap-y-8 md:gap-y-10 lg:gap-x-[clamp(32px,4vw,70px)] items-start w-full">
          {/* Column 1: Brand Information */}
          <div className="space-y-4 w-full">
            <BrandLogo imageClassName="h-9 sm:h-11" />
            <p className="text-[clamp(13px,0.95vw,16px)] leading-relaxed text-sage-muted [overflow-wrap:anywhere] break-words">
              {description}
            </p>
            <div className="pt-1 flex items-center gap-3">
              <a
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-sage-border bg-white text-site shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgb(72,125,72)] hover:bg-[rgb(72,125,72)] hover:text-white hover:shadow-sage"
                href={instagramUrl}
                target={instagramUrl !== "#" ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4 shrink-0" />
              </a>
              <a
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-sage-border bg-white text-site shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgb(72,125,72)] hover:bg-[rgb(72,125,72)] hover:text-white hover:shadow-sage"
                href={linkedinUrl}
                target={linkedinUrl !== "#" ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4 shrink-0" />
              </a>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div className="space-y-3 w-full lg:border-l lg:border-sage-border/60 lg:pl-6">
            <h2 className="text-[clamp(13px,1vw,16px)] font-bold uppercase tracking-[0.2em] text-site font-sans">
              Navigation
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    className="inline-block text-[clamp(15px,1.1vw,18px)] font-medium text-sage-muted transition-all duration-300 hover:translate-x-1 hover:text-site"
                    to={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Services Suite */}
          <div className="space-y-3 w-full lg:border-l lg:border-sage-border/60 lg:pl-6">
            <h2 className="text-[clamp(13px,1vw,16px)] font-bold uppercase tracking-[0.2em] text-site font-sans">
              Services Suite
            </h2>
            <ul className="space-y-2">
              {displayServices.map((service) => (
                <li key={service._id || service.slug}>
                  <Link
                    className="inline-block text-[clamp(15px,1.1vw,18px)] font-medium text-sage-muted transition-all duration-300 hover:translate-x-1 hover:text-site truncate max-w-full"
                    to={`/servicesdetails/${service.slug}`}
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div className="space-y-4 w-full lg:border-l lg:border-sage-border/60 lg:pl-6 flex flex-col justify-start">
            {contactSettings.sectionEnabled !== false && (
              <div className="space-y-3">
                <h2 className="text-[clamp(13px,1vw,16px)] font-bold uppercase tracking-[0.2em] text-site font-sans">
                  {contactSettings.sectionTitle || "Contact Us"}
                </h2>

                <ul className="space-y-[18px] text-[clamp(13px,0.95vw,16px)] text-sage-muted">
                  {/* Phone */}
                  {contactSettings.phoneEnabled !== false && displayPhones.length > 0 && (
                    <li className="group flex items-start gap-2.5 transition-colors duration-300 hover:text-forest">
                      <Phone className="h-4 w-4 text-site shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110" />
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-site mb-1">
                          {contactSettings.phoneHeading || "Phone"}
                        </span>
                        <div className="space-y-[6px]">
                          {displayPhones.map((p) => {
                            const flag = getFlagEmoji(p.countryCode);
                            const cleanTel = (p.phone || "").replace(/[^+\d]/g, "");
                            return (
                              <a
                                key={p._id || p.phone}
                                href={`tel:${cleanTel}`}
                                className="flex items-center gap-1.5 font-semibold text-forest hover:text-site transition-colors text-[clamp(13px,0.95vw,16px)]"
                              >
                                {flag && <span>{flag}</span>}
                                <span>{p.displayPhone || p.phone}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  )}

                  {/* Email */}
                  {contactSettings.emailEnabled !== false && displayEmails.length > 0 && (
                    <li className="group flex items-start gap-2.5 transition-colors duration-300 hover:text-forest">
                      <Mail className="h-4 w-4 text-site shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110" />
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-site">
                          {contactSettings.emailHeading || "Email"}
                        </span>
                        {displayEmails.map((e) => (
                          <a
                            key={e._id || e.email}
                            href={`mailto:${e.email}`}
                            className="font-semibold text-forest hover:text-site transition-colors [overflow-wrap:anywhere] break-words block text-[clamp(13px,0.95vw,16px)]"
                          >
                            {e.email}
                          </a>
                        ))}
                      </div>
                    </li>
                  )}

                  {/* Office */}
                  {contactSettings.officeEnabled !== false && displayOffices.length > 0 && (
                    <li className="group flex items-start gap-2.5 transition-colors duration-300 hover:text-forest">
                      <MapPin className="h-4 w-4 text-site shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110" />
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-site">
                          {contactSettings.officeHeading || "Office"}
                        </span>
                        {displayOffices.map((off) => (
                          <address
                            key={off._id || off.companyName}
                            className="not-italic leading-relaxed text-[clamp(13px,0.95vw,16px)] [overflow-wrap:anywhere] break-words"
                          >
                            {off.companyName && <>{off.companyName},<br /></>}
                            {off.addressLine1 && <>{off.addressLine1},<br /></>}
                            {off.addressLine2 && <>{off.addressLine2}</>}
                          </address>
                        ))}
                      </div>
                    </li>
                  )}

                  {/* Working Hours */}
                  {contactSettings.workingHoursEnabled !== false && displayHours.length > 0 && (
                    <li className="group flex items-start gap-2.5 transition-colors duration-300 hover:text-forest">
                      <Clock className="h-4 w-4 text-site shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110" />
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-site">
                          {contactSettings.workingHoursHeading || "Working Hours"}
                        </span>
                        {displayHours.map((h) => (
                          <div key={h._id || h.dayFrom}>
                            <span className="font-semibold text-forest block text-[clamp(13px,0.95vw,16px)]">
                              {h.dayFrom} – {h.dayTo}
                            </span>
                            <span className="text-[clamp(12px,0.9vw,15px)] text-sage-muted">
                              {h.closed ? "Closed" : `${h.openingTime} – ${h.closingTime}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Let's Work Together CTA Button */}
            {contactSettings.ctaEnabled !== false && (
              <Link
                to={contactSettings.ctaLink || "/contactus"}
                target={contactSettings.ctaNewTab ? "_blank" : undefined}
                rel={contactSettings.ctaNewTab ? "noopener noreferrer" : undefined}
                className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[rgb(72,125,72)] bg-transparent px-4 py-2.5 text-[clamp(13px,0.95vw,16px)] font-semibold text-forest transition-all duration-300 hover:bg-[rgb(72,125,72)] hover:text-white hover:shadow-sage active:scale-[0.98]"
              >
                <span>{contactSettings.ctaText || "Let's Work Together"}</span>
                <ArrowRight className="h-4 w-4 text-site shrink-0 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Bar: Copyright & Policy Links */}
        <div className="mt-[28px] sm:mt-[36px] pt-4 sm:pt-5 border-t border-sage-border flex flex-col items-center gap-3 text-center text-[clamp(12px,0.9vw,15px)] font-medium text-sage-muted sm:flex-row sm:items-center sm:justify-between sm:text-left w-full">
          <p>&copy; {year} {siteName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end">
            <Link className="transition-colors hover:text-site" to="/contactus">
              Privacy Policy
            </Link>
            <Link className="transition-colors hover:text-site" to="/contactus">
              Terms of Service
            </Link>
            <button
              onClick={scrollToTop}
              type="button"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-forest transition-colors hover:bg-sage-secondary/60 hover:text-site"
            >
              Back to top <ArrowUp className="h-3.5 w-3.5 text-site shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
