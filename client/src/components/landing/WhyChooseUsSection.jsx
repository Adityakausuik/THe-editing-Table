import { m } from "framer-motion";
import { CheckCircle2, Clock3, Globe2, LockKeyhole, MessageCircle, Palette, ShieldCheck, Users } from "lucide-react";
import { mediaUrl } from "../../lib/api.js";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import Container from "../ui/Container.jsx";
import SectionHeading from "../ui/SectionHeading.jsx";

const DEFAULT_BENEFITS = [
  { icon: "Palette", title: "Custom Color Science" },
  { icon: "Clock3", title: "Guaranteed Turnaround" },
  { icon: "LockKeyhole", title: "Strict Confidentiality & NDA" },
  { icon: "MessageCircle", title: "Direct Lead Editor Access" },
  { icon: "ShieldCheck", title: "Multi-Stage Quality Review" },
  { icon: "Globe2", title: "Global 4K Deliverables" }
];

const DEFAULT_STUDIO_IMAGE =
  "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85";

export default function WhyChooseUsSection() {
  const { settings } = useSiteSettings();
  const publicContent = settings.publicContent || {};
  const cmsBenefits = publicContent.benefits;
  const benefits = Array.isArray(cmsBenefits) && cmsBenefits.length > 0
    ? cmsBenefits
    : DEFAULT_BENEFITS;
  const icons = { Palette, Clock3, LockKeyhole, MessageCircle, Users, ShieldCheck, CheckCircle2, Globe2 };

  const rawStudioImg = publicContent.studioImage;
  const studioImageSrc = rawStudioImg ? mediaUrl(rawStudioImg) : DEFAULT_STUDIO_IMAGE;

  return (
    <section id="why-us" data-theme="about" className="section-pad">
      <Container className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <m.div
          className="relative overflow-hidden rounded-3xl border border-sage-border bg-white p-3 shadow-editorial"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sage-secondary flex items-center justify-center">
            <img
              src={studioImageSrc}
              alt="Editing studio workflow"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_STUDIO_IMAGE;
              }}
              className="h-full w-full object-cover"
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-forest/70 via-transparent to-transparent pointer-events-none" />

            {/* High-Contrast Floating Feature Box */}
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-sage-border bg-white p-5 shadow-editorial">
              <p className="font-heading text-xl font-semibold text-forest">Tailored to Your Signature Look</p>
              <p className="mt-1.5 text-xs text-sage-muted leading-relaxed font-normal">
                Custom profile cataloguing ensures your color science, film emulation, and skin retouching remain completely consistent across all weddings.
              </p>
            </div>
          </div>
        </m.div>

        <div className="space-y-6">
          <SectionHeading
            align="left"
            label="Studio Standards"
            title="Why High-End Filmmakers Trust The Editing Table"
            text="A luxury post-production partner designed to maintain the highest editorial standards without compromising your creative vision."
          />

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            {benefits.map((benefit, index) => {
              const BenefitIcon = icons[benefit.icon] || CheckCircle2;
              return (
                <m.div
                  key={benefit.title}
                  className="flex items-center gap-3.5 rounded-2xl border border-sage-border bg-white p-4.5 shadow-soft transition-all duration-300 hover:border-[rgb(72,125,72)] hover:shadow-editorial"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-secondary text-site">
                    <BenefitIcon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-forest">{benefit.title}</span>
                </m.div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
