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
          title="How We Collaborate With Your Studio"
          text="A frictionless post-production pipeline built so you can focus on shooting while we handle post."
        />

        <div className="relative mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-[12.5%] right-[12.5%] top-16 hidden h-[1px] bg-gradient-to-r from-transparent via-copper/40 to-transparent lg:block" />

          {processSteps.map((step, index) => {
            const StepIcon = icons[step.icon] || Scissors;
            return (
            <m.article
              key={step.title}
              className="relative flex flex-col justify-between rounded-3xl border border-sage-border bg-sage-card p-8 shadow-soft transition-all duration-500 hover:border-sage-light/80 hover:shadow-editorial"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgb(72,125,72)]/20 bg-sage-secondary/60 text-site">
                    <StepIcon className="h-6 w-6" />
                  </div>
                  <span className="font-serif text-3xl font-bold text-site">0{index + 1}</span>
                </div>

                <h3 className="font-serif text-2xl font-normal text-forest">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-sage-muted">{step.description}</p>
              </div>
            </m.article>
          );})}
        </div>
      </Container>
    </section>
  );
}
