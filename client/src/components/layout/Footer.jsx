import { ArrowRight, ArrowUp, Clock, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, subscribeToCmsChanges } from "../../lib/api.js";
import { useCmsCollection } from "../../lib/useCmsCollection.js";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import BrandLogo from "../ui/BrandLogo.jsx";

const DEFAULT_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/about", label: "About" },
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
  "The Editing Table is a premier post-production house focused on turning raw visuals into compelling stories.";

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

function formatNavLabel(label, href = "") {
  const cleanLabel = String(label || "").trim();
  const cleanHref = String(href || "").trim().toLowerCase();
  if (
    cleanLabel.toLowerCase() === "about me" ||
    cleanLabel.toLowerCase() === "about us" ||
    cleanLabel.toLowerCase() === "about" ||
    cleanHref.includes("about")
  ) {
    return "About";
  }
  return cleanLabel;
}

  const publicContent = settings.publicContent || {};
  const footer = publicContent.footer || {};

  const cmsNav = publicContent.navigation;
  const rawLinks = Array.isArray(cmsNav) && cmsNav.length > 0 ? cmsNav : DEFAULT_NAV_LINKS;
  const siteLinks = rawLinks
    .filter((link) => {
      const h = String(link?.href || "").trim();
      return h !== "/founder" && h !== "/team";
    })
    .map((link) => {
      const isAbout =
        String(link?.label || "").trim().toLowerCase().includes("about") ||
        String(link?.href || "").trim().toLowerCase().includes("about");

      if (isAbout) {
        return {
          ...link,
          href: "/about",
          label: "About"
        };
      }
      return {
        ...link,
        label: formatNavLabel(link?.label, link?.href)
      };
    });
  const displayServices = services.length > 0 ? services : DEFAULT_SERVICES;
  const description = footer.description || DEFAULT_DESCRIPTION;
  const siteName = settings.siteName || "The Editing Table";
  const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/the.editingtable?stkn=MWdrdHZlY21tMmYzcw==";
  const DEFAULT_LINKEDIN_URL = "https://www.linkedin.com/company/the-editing-table/";
  const instagramUrl =
    footer.instagram && footer.instagram !== "#" ? footer.instagram : DEFAULT_INSTAGRAM_URL;
  const linkedinUrl =
    footer.linkedin && footer.linkedin !== "#" ? footer.linkedin : DEFAULT_LINKEDIN_URL;

  // Dynamic Contact Properties
  const contactSettings = contactData?.settings || DEFAULT_CONTACT_SETTINGS;
  const rawPhones = Array.isArray(contactData?.phones) ? contactData.phones : [];
  const validPhones = rawPhones.filter((p) => p && Boolean(p.displayPhone || p.phone));
  const displayPhones = validPhones.length > 0 ? validPhones : DEFAULT_PHONES;

  const rawEmails = Array.isArray(contactData?.emails) ? contactData.emails : [];
  const validEmails = rawEmails.filter((e) => e && Boolean(e.email));
  const displayEmails = validEmails.length > 0 ? validEmails : DEFAULT_EMAILS;

  const rawOffices = Array.isArray(contactData?.offices) ? contactData.offices : [];
  const validOffices = rawOffices.filter((o) => o && Boolean(o.companyName || o.addressLine1 || o.officeName));
  const displayOffices = validOffices.length > 0 ? validOffices : DEFAULT_OFFICES;

  const rawHours = Array.isArray(contactData?.workingHours) ? contactData.workingHours : [];
  const validHours = rawHours.filter(
    (h) => h && Boolean(h.dayFrom || h.dayTo || h.openingTime || h.closingTime || h.closed || h.customText)
  );
  const displayHours = validHours.length > 0 ? validHours : DEFAULT_HOURS;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative border-t border-sage-border/80 bg-sage-bg pt-12 sm:pt-16 pb-8 text-forest overflow-hidden box-border w-full">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 box-border">
        {/* Top Section: Responsive 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_0.9fr_1.1fr] gap-8 lg:gap-10 items-start w-full">
          {/* Column 1: Brand Information */}
          <div className="space-y-3.5 w-full">
            <BrandLogo imageClassName="h-8 sm:h-9" />
            <p className="text-xs sm:text-sm leading-relaxed text-sage-muted max-w-sm [overflow-wrap:anywhere] break-words">
              {description}
            </p>
            <div className="pt-1.5 flex items-center gap-2.5">
              <a
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sage-muted transition-colors duration-200 hover:text-site hover:bg-[rgb(72,125,72)]/10"
                href={instagramUrl}
                target={instagramUrl !== "#" ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4 shrink-0" />
              </a>
              <a
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sage-muted transition-colors duration-200 hover:text-site hover:bg-[rgb(72,125,72)]/10"
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
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-site font-sans">
              Navigation
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    className="inline-block text-xs sm:text-sm font-medium text-sage-muted transition-colors duration-200 hover:text-forest"
                    to={link.href}
                  >
                    {formatNavLabel(link.label, link.href)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Services Suite */}
          <div className="space-y-3 w-full lg:border-l lg:border-sage-border/60 lg:pl-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-site font-sans">
              Services Suite
            </h2>
            <ul className="space-y-2">
              {displayServices.map((service) => (
                <li key={service._id || service.slug}>
                  <Link
                    className="inline-block text-xs sm:text-sm font-medium text-sage-muted transition-colors duration-200 hover:text-forest truncate max-w-full"
                    to={`/servicesdetails/${service.slug}`}
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div className="space-y-3.5 w-full lg:border-l lg:border-sage-border/60 lg:pl-6 flex flex-col justify-start">
            {contactSettings.sectionEnabled !== false && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-site font-sans">
                  {contactSettings.sectionTitle || "Contact Us"}
                </h2>

                <ul className="space-y-3 text-xs sm:text-sm text-sage-muted">
                  {/* Phone */}
                  {contactSettings.phoneEnabled !== false && displayPhones.length > 0 && (
                    <li className="flex items-start gap-2.5">
                      <Phone className="h-3.5 w-3.5 text-site shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-site mb-0.5">
                          {contactSettings.phoneHeading || "Phone"}
                        </span>
                        <div className="space-y-1">
                          {displayPhones.map((p, idx) => {
                            const flag = getFlagEmoji(p.countryCode);
                            const phoneText = p.displayPhone || p.phone;
                            if (!phoneText) return null;
                            const cleanTel = (p.phone || phoneText).replace(/[^+\d]/g, "");
                            return (
                              <a
                                key={p._id || p.phone || idx}
                                href={`tel:${cleanTel}`}
                                className="flex items-center gap-1.5 font-medium text-forest hover:text-site transition-colors text-xs sm:text-sm"
                              >
                                {flag && <span>{flag}</span>}
                                <span>{phoneText}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  )}

                  {/* Email */}
                  {contactSettings.emailEnabled !== false && displayEmails.length > 0 && (
                    <li className="flex items-start gap-2.5">
                      <Mail className="h-3.5 w-3.5 text-site shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-site mb-0.5">
                          {contactSettings.emailHeading || "Email"}
                        </span>
                        {displayEmails.map((e, idx) => {
                          if (!e.email) return null;
                          return (
                            <a
                              key={e._id || e.email || idx}
                              href={`mailto:${e.email}`}
                              className="font-medium text-forest hover:text-site transition-colors [overflow-wrap:anywhere] break-words block text-xs sm:text-sm"
                            >
                              {e.email}
                            </a>
                          );
                        })}
                      </div>
                    </li>
                  )}

                  {/* Office */}
                  {contactSettings.officeEnabled !== false && displayOffices.length > 0 && (
                    <li className="flex items-start gap-2.5">
                      <MapPin className="h-3.5 w-3.5 text-site shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-site mb-0.5">
                          {contactSettings.officeHeading || "Office"}
                        </span>
                        {displayOffices.map((off, idx) => {
                          if (!off.companyName && !off.addressLine1 && !off.officeName) return null;
                          return (
                            <address
                              key={off._id || off.companyName || idx}
                              className="not-italic leading-relaxed text-xs sm:text-sm [overflow-wrap:anywhere] break-words"
                            >
                              {off.companyName && <>{off.companyName},<br /></>}
                              {off.addressLine1 && <>{off.addressLine1},<br /></>}
                              {off.addressLine2 && <>{off.addressLine2}</>}
                            </address>
                          );
                        })}
                      </div>
                    </li>
                  )}

                  {/* Working Hours */}
                  {contactSettings.workingHoursEnabled !== false && displayHours.length > 0 && (
                    <li className="flex items-start gap-2.5">
                      <Clock className="h-3.5 w-3.5 text-site shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-site mb-0.5">
                          {contactSettings.workingHoursHeading || "Working Hours"}
                        </span>
                        {displayHours.map((h, idx) => {
                          const dayText = [h.dayFrom, h.dayTo].filter(Boolean).join(" – ");
                          const timeText = h.closed
                            ? "Closed"
                            : [h.openingTime, h.closingTime].filter(Boolean).join(" – ") || h.customText || "";
                          if (!dayText && !timeText) return null;
                          return (
                            <div key={h._id || h.dayFrom || idx}>
                              {dayText && (
                                <span className="font-medium text-forest block text-xs sm:text-sm">
                                  {dayText}
                                </span>
                              )}
                              {timeText && (
                                <span className="text-xs text-sage-muted">
                                  {timeText}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Let's Work Together CTA Button */}
            {contactSettings.ctaEnabled !== false && (
              <div className="pt-1">
                <Link
                  to={contactSettings.ctaLink || "/contactus"}
                  target={contactSettings.ctaNewTab ? "_blank" : undefined}
                  rel={contactSettings.ctaNewTab ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#3d683d] active:scale-[0.98]"
                >
                  <span>{contactSettings.ctaText || "Let's Work Together"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar: Copyright & Policy Links */}
        <div className="mt-10 sm:mt-12 pt-4 border-t border-sage-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs font-normal text-sage-muted w-full">
          <p>&copy; {year} {siteName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 sm:justify-end">
            <Link className="transition-colors hover:text-forest" to="/contactus">
              Privacy Policy
            </Link>
            <Link className="transition-colors hover:text-forest" to="/contactus">
              Terms of Service
            </Link>
            <button
              onClick={scrollToTop}
              type="button"
              className="inline-flex items-center gap-1 font-medium text-forest transition-colors hover:text-site ml-1"
            >
              Back to top <ArrowUp className="h-3 w-3 text-site shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
