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
    <section id="process" data-theme="process" className="section-pad">
      <Container>
        <SectionHeading
          label="Seamless Workflow"
          title="How We Collaborate With Your Team"
          text="A frictionless post-production pipeline built so you can focus on shooting while we handle post."
        />

        <div className="relative mt-12 sm:mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, index) => {
            const StepIcon = icons[step.icon] || Scissors;
            return (
              <m.article
                key={step.title}
                className="relative flex flex-col justify-between pt-6 border-t border-sage-border/80 transition-all duration-300"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-heading text-xl sm:text-2xl font-normal text-site/80 tracking-widest">
                      0{index + 1}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-secondary border border-sage-border text-site">
                      <StepIcon className="h-4 w-4" />
                    </div>
                  </div>

                  <h3 className="font-heading text-lg sm:text-xl font-normal text-forest leading-snug">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-sage-muted">
                    {step.description}
                  </p>
                </div>
              </m.article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
