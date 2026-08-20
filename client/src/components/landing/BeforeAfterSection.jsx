import { m } from "framer-motion";
import { useId, useState } from "react";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import { mediaUrl } from "../../lib/api.js";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import Container from "../ui/Container.jsx";
import SectionHeading from "../ui/SectionHeading.jsx";

const DEFAULT_BEFORE_AFTER_IMPROVEMENTS = [
  "Custom Kodak 2383 Film Stock Emulation",
  "Highlight & Shadow Roll-off Recovery",
  "High-Fashion Skin Tone Preservation",
  "4K Master Grain & Sharpness Calibration"
];

const DEFAULT_BEFORE_AFTER_IMAGE =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85";

export default function BeforeAfterSection() {
  const [position, setPosition] = useState(54);
  const sliderId = useId();
  const { settings } = useSiteSettings();
  const content = settings.publicContent?.beforeAfter || {};
  const cmsImprovements = content.improvements;
  const improvements = Array.isArray(cmsImprovements) && cmsImprovements.length > 0
    ? cmsImprovements
    : DEFAULT_BEFORE_AFTER_IMPROVEMENTS;

  const rawImage = content.image || content.beforeImage || "";
  const beforeImage = rawImage ? mediaUrl(rawImage) : DEFAULT_BEFORE_AFTER_IMAGE;
  const afterImage = content.afterImage ? mediaUrl(content.afterImage) : beforeImage;

  return (
    <section data-theme="gallery" className="section-pad">
      <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <SectionHeading
            align="left"
            label="Interactive Comparison"
            title="Raw Footage vs. Editorial Master Grade"
            text="Drag the interactive slider to experience the dramatic depth, skin-tone precision, and color refinement delivered by our master suites."
          />

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            {improvements.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-sage-border bg-sage-card/80 px-4 py-3.5 text-xs font-medium text-forest shadow-soft"
              >
                <Sparkles className="h-4 w-4 text-site shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Before / After Slider Frame */}
        <m.div
          className="relative rounded-3xl border border-sage-border bg-sage-card p-4 shadow-editorial"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-forest select-none">
            {/* RAW BEFORE image */}
            <img
              src={beforeImage}
              alt="Raw unedited wedding footage preview"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_BEFORE_AFTER_IMAGE;
              }}
              className="h-full w-full object-cover filter saturate-[0.35] contrast-[0.85] brightness-[0.95]"
            />

            {/* REFINED AFTER image overlay */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
              <img
                src={afterImage}
                alt="Master graded editorial wedding preview"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_BEFORE_AFTER_IMAGE;
                }}
                className="h-full w-full object-cover filter saturate-[1.15] contrast-[1.05] brightness-[1.02]"
              />
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 rounded-full border border-sage-light/40 bg-sage-card/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-site backdrop-blur-md shadow-soft z-10">
              Graded Master
            </div>
            <div className="absolute top-4 right-4 rounded-full border border-white/30 bg-forest/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md z-10">
              Raw Neutral
            </div>

            {/* Divider Line & Control Thumb */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-sage-light shadow-[0_0_12px_rgb(72,125,72)] pointer-events-none z-10"
              style={{ left: `${position}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-sage-light bg-sage-card text-site shadow-sage">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
            </div>

            {/* Range Slider Control Input */}
            <input
              id={sliderId}
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0 z-20"
              type="range"
              min="0"
              max="100"
              value={position}
              aria-label="Compare raw vs edited master grade"
              onChange={(event) => setPosition(Number(event.target.value))}
            />
          </div>
        </m.div>
      </Container>
    </section>
  );
}
