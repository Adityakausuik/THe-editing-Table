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
    <section id="why-us" data-theme="about" className="section-pad">
      <Container className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <m.div
          className="relative overflow-hidden rounded-2xl border border-sage-border shadow-sm"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-sage-secondary flex items-center justify-center">
            <img
              src={workflowImageSrc}
              alt="Post-production workflow"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_WORKFLOW_IMAGE;
              }}
              className="h-full w-full object-cover"
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-transparent to-transparent pointer-events-none" />

            {/* Editorial Feature Caption */}
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/20 bg-forest/85 backdrop-blur-md p-4 text-white">
              <p className="font-heading text-lg font-normal text-white">Tailored to Your Signature Look</p>
              <p className="mt-1 text-xs text-white/80 leading-relaxed font-normal">
                Custom profile cataloguing ensures your color science, film emulation, and skin retouching remain completely consistent across all weddings.
              </p>
            </div>
          </div>
        </m.div>

        <div className="space-y-6">
          <SectionHeading
            align="left"
            label="Quality Standards"
            title="Why High-End Filmmakers Trust The Editing Table"
            text="A luxury post-production partner designed to maintain the highest editorial standards without compromising your creative vision."
          />

          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 pt-2">
            {benefits.map((benefit, index) => {
              const BenefitIcon = icons[benefit.icon] || CheckCircle2;
              return (
                <m.div
                  key={benefit.title}
                  className="flex items-center gap-3 py-3 border-b border-sage-border/70"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04, duration: 0.4 }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage-secondary border border-sage-border text-site">
                    <BenefitIcon className="h-4 w-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-forest">{benefit.title}</span>
                </m.div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
