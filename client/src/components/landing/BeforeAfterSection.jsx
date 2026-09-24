import { m } from "framer-motion";
import { useId, useState } from "react";
import { Sparkles, SlidersHorizontal, Layers, CheckCircle2 } from "lucide-react";
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
    <section data-theme="gallery" className="section-pad overflow-hidden">
      <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <SectionHeading
            align="left"
            label="Interactive Color Studio"
            title="Raw Sensor Data vs. Editorial Master Grade"
            text="Drag the interactive slider to experience the dramatic depth, skin-tone precision, and color refinement delivered by our master suites."
          />

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            {improvements.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-sage-border bg-sage-card/90 px-4 py-3.5 text-xs font-medium text-forest shadow-soft transition-all duration-300 hover:border-[rgb(72,125,72)]/50 hover:shadow-md"
              >
                <Sparkles className="h-4 w-4 text-site shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-sage-muted pt-2 border-t border-sage-border/50">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-site" />
              DaVinci ACES 1.3
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-site" />
              Calibrated 10-Bit D65
            </span>
          </div>
        </div>

        {/* Before / After Slider Frame with 3D Depth */}
        <m.div
          className="relative rounded-3xl border border-sage-border bg-sage-card p-4 shadow-editorial transition-all duration-500 hover:shadow-2xl"
          style={{ perspective: 1200 }}
          initial={{ opacity: 0, y: 30, rotateX: 4 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-forest select-none shadow-inner">
            {/* RAW BEFORE image */}
            <img
              src={beforeImage}
              alt="Raw unedited footage preview"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_BEFORE_AFTER_IMAGE;
              }}
              className="h-full w-full object-cover filter saturate-[0.32] contrast-[0.82] brightness-[0.94]"
            />

            {/* REFINED AFTER image overlay */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
              <img
                src={afterImage}
                alt="Master graded editorial preview"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_BEFORE_AFTER_IMAGE;
                }}
                className="h-full w-full object-cover filter saturate-[1.18] contrast-[1.08] brightness-[1.02]"
              />
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 rounded-full border border-sage-light/40 bg-sage-card/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-site backdrop-blur-md shadow-soft z-10 font-mono">
              Graded Master
            </div>
            <div className="absolute top-4 right-4 rounded-full border border-white/30 bg-forest/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md z-10 font-mono">
              Raw Neutral
            </div>

            {/* Micro Film Specs HUD at Bottom */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-white/90 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 z-10 pointer-events-none">
              <span className="truncate">LOG: S-Gamut3.Cine / Flat</span>
              <span className="text-[#8FAE7B] font-bold truncate">LUT: TET_KODAK_2383_D65</span>
            </div>

            {/* Divider Line & Control Thumb */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-sage-light shadow-[0_0_12px_rgb(72,125,72)] pointer-events-none z-10"
              style={{ left: `${position}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-sage-light bg-sage-card text-site shadow-sage cursor-ew-resize">
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
