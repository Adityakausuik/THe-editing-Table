import { m } from "framer-motion";
import { CloudDownload, CloudUpload, MessageCircle, Scissors } from "lucide-react";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import Container from "../ui/Container.jsx";
import SectionHeading from "../ui/SectionHeading.jsx";

const DEFAULT_PROCESS_STEPS = [
  {
    icon: "CloudUpload",
    title: "Raw Offload & Ingest",
    description: "Upload your camera proxies or RAW footage via secure cloud link or direct server access."
  },
  {
    icon: "MessageCircle",
    title: "Creative Alignment",
    description: "Share your brand guidelines, LUT preferences, and music cues with your dedicated lead editor."
  },
  {
    icon: "Scissors",
    title: "Edit & Color Grade",
    description: "We craft your story edit, perform custom DaVinci color grading, and balance audio mixes."
  },
  {
    icon: "CloudDownload",
    title: "Review & 4K Master",
    description: "Review your draft via Frame.io, request minor tweaks, and receive full 4K master deliverables."
  }
];

export default function ProcessSection() {
  const { settings } = useSiteSettings();
  const cmsSteps = settings.publicContent?.processSteps;
  const processSteps = Array.isArray(cmsSteps) && cmsSteps.length > 0
    ? cmsSteps
    : DEFAULT_PROCESS_STEPS;
  const icons = { CloudUpload, MessageCircle, Scissors, CloudDownload };

  return (
    <section id="process" data-theme="process" className="section-pad overflow-hidden">
      <Container>
        <SectionHeading
          label="Seamless Post Pipeline"
          title="From Raw Footage to 4K Master Release"
          text="A frictionless editorial pipeline built so you can focus on shooting while we handle post-production."
        />

        <div className="relative mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" style={{ perspective: 1200 }}>
          {/* Animated Connecting Timeline Beam */}
          <div className="absolute left-[12.5%] right-[12.5%] top-16 hidden h-[2px] bg-gradient-to-r from-transparent via-[rgb(72,125,72)]/40 to-transparent lg:block" />

          {processSteps.map((step, index) => {
            const StepIcon = icons[step.icon] || Scissors;
            return (
              <m.article
                key={step.title}
                className="group relative flex flex-col justify-between rounded-3xl border border-sage-border bg-sage-card p-8 shadow-soft transition-all duration-500 hover:border-[rgb(72,125,72)]/70 hover:shadow-editorial will-change-transform"
                style={{ transformStyle: "preserve-3d" }}
                initial={{ opacity: 0, y: 30, rotateX: 6 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{
                  y: -6,
                  rotateX: 3,
                  rotateY: index % 2 === 0 ? -2.5 : 2.5,
                  transition: { duration: 0.3 }
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgb(72,125,72)]/30 bg-sage-secondary/70 text-site group-hover:scale-105 group-hover:bg-[rgb(72,125,72)] group-hover:text-white transition-all duration-300">
                      <StepIcon className="h-6 w-6 transition-transform duration-300 group-hover:rotate-6" />
                    </div>
                    <span className="font-heading text-3xl font-bold text-site group-hover:text-forest transition-colors">
                      0{index + 1}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono uppercase tracking-widest text-[rgb(72,125,72)] font-semibold mb-1">
                    Phase 0{index + 1}
                  </div>

                  <h3 className="font-heading text-2xl font-normal text-forest group-hover:text-site transition-colors">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-sage-muted">
                    {step.description}
                  </p>
                </div>

                {/* Subtle bottom indicator */}
                <div className="mt-6 pt-4 border-t border-sage-border/40 flex items-center justify-between text-[11px] font-mono text-sage-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[rgb(72,125,72)]/60" />
                    Active Pipeline
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-site font-semibold">
                    Studio Grade →
                  </span>
                </div>
              </m.article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
