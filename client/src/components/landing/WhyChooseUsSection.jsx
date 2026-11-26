import { m } from "framer-motion";
import { CheckCircle2, Clock3, Globe2, LockKeyhole, MessageCircle, Palette, ShieldCheck, Users } from "lucide-react";
import { mediaUrl } from "../../lib/api.js";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import Container from "../ui/Container.jsx";

const DEFAULT_BENEFITS = [
  { icon: "Palette", title: "Custom Color Science" },
  { icon: "Clock3", title: "Guaranteed Turnaround" },
  { icon: "LockKeyhole", title: "Strict Confidentiality & NDA" },
  { icon: "MessageCircle", title: "Direct Lead Editor Access" },
  { icon: "ShieldCheck", title: "Multi-Stage Quality Review" },
  { icon: "Globe2", title: "Global 4K Deliverables" }
];

const DEFAULT_WORKFLOW_IMAGE =
  "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85";

export default function WhyChooseUsSection() {
  const { settings } = useSiteSettings();
  const publicContent = settings.publicContent || {};
  const cmsBenefits = publicContent.benefits;
  const benefits = Array.isArray(cmsBenefits) && cmsBenefits.length > 0
    ? cmsBenefits
    : DEFAULT_BENEFITS;
  const icons = { Palette, Clock3, LockKeyhole, MessageCircle, Users, ShieldCheck, CheckCircle2, Globe2 };

  const rawWorkflowImg = publicContent.workflowImage || publicContent.studioImage;
  const workflowImageSrc = rawWorkflowImg ? mediaUrl(rawWorkflowImg) : DEFAULT_WORKFLOW_IMAGE;

  return (
    <section
      id="why-us"
      data-theme="about"
      className="relative"
      style={{
        paddingTop: "clamp(2rem, 3.5vw, 3.75rem)",
        paddingBottom: "clamp(2rem, 3.5vw, 3.75rem)"
      }}
    >
      <Container className="grid items-center gap-6 sm:gap-8 md:gap-10 lg:grid-cols-[0.9fr_1.1fr] xl:gap-12">
        {/* Left Media Container: Compact, elegant aspect ratio */}
        <m.div
          className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-sage-border shadow-sm mx-auto max-w-lg lg:max-w-none"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-[16/10] sm:aspect-[16/11] lg:aspect-[4/3] max-h-[460px] overflow-hidden bg-sage-secondary flex items-center justify-center">
            <img
              src={workflowImageSrc}
              alt="Post-production workflow"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_WORKFLOW_IMAGE;
              }}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/20 to-transparent pointer-events-none" />

            {/* Editorial Feature Caption */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3.5 sm:left-3.5 sm:right-3.5 md:bottom-4 md:left-4 md:right-4 rounded-xl border border-white/20 bg-forest/85 backdrop-blur-md p-2.5 sm:p-3 md:p-3.5 text-white shadow-lg transition-all">
              <p className="font-heading text-sm sm:text-base md:text-lg font-normal text-white leading-snug">
                Tailored to Your Signature Look
              </p>
              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-white/85 leading-relaxed font-normal line-clamp-2 sm:line-clamp-none">
                Custom profile cataloguing ensures your color science, film emulation, and skin retouching remain completely consistent across all weddings.
              </p>
            </div>
          </div>
        </m.div>

        {/* Right Content Area: Compact, readable, perfectly proportioned */}
        <div className="space-y-4 sm:space-y-5">
          <m.div
            className="max-w-xl space-y-1.5 sm:space-y-2"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#78866A]">
              Quality Standards
            </span>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] xl:text-[2.4rem] font-normal leading-[1.18] tracking-tight text-[#263D2D]">
              Why High-End Filmmakers Trust The Editing Table
            </h2>
            <p className="pt-0.5 text-xs sm:text-sm lg:text-[0.9375rem] font-normal leading-relaxed text-[#5f6f58]">
              A luxury post-production partner designed to maintain the highest editorial standards without compromising your creative vision.
            </p>
          </m.div>

          {/* 6 Quality Standard Benefits Grid */}
          <div className="grid gap-x-4 sm:gap-x-6 gap-y-0.5 grid-cols-1 sm:grid-cols-2 pt-1 border-t border-sage-border/50">
            {benefits.map((benefit, index) => {
              const BenefitIcon = icons[benefit.icon] || CheckCircle2;
              return (
                <m.div
                  key={benefit.title}
                  className="flex items-center gap-2.5 sm:gap-3 py-2 sm:py-2.5 border-b border-sage-border/60"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.03, duration: 0.35 }}
                >
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-sage-secondary/90 border border-sage-border/80 text-site shadow-2xs">
                    <BenefitIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <span className="text-xs sm:text-[13px] lg:text-sm font-medium text-forest tracking-tight">
                    {benefit.title}
                  </span>
                </m.div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
