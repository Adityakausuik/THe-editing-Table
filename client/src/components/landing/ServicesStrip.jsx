import { Clapperboard, Film, Layers, Palette, Volume2 } from "lucide-react";
import Container from "../ui/Container.jsx";

const SERVICES = [
  {
    id: "video-editing",
    title: "Video Editing",
    tagline: "Story that flows.",
    icon: Film,
    href: "/services#video-editing"
  },
  {
    id: "vfx-compositing",
    title: "VFX & Compositing",
    tagline: "Bring imagination to life.",
    icon: Clapperboard,
    href: "/services#vfx-compositing"
  },
  {
    id: "color-grading",
    title: "Color Grading",
    tagline: "The right look and feel.",
    icon: Palette,
    href: "/services#color-grading"
  },
  {
    id: "sound-design",
    title: "Sound Design",
    tagline: "Audio that adds depth.",
    icon: Volume2,
    href: "/services#sound-design"
  },
  {
    id: "motion-graphics",
    title: "Motion Graphics",
    tagline: "Visuals that move.",
    icon: Layers,
    href: "/services#motion-graphics"
  }
];

export default function ServicesStrip() {
  return (
    <section
      aria-label="Core Services Strip"
      className="relative z-10 -mt-2 border-y border-sage-border/60 bg-sage-bg/90 backdrop-blur-md py-6 sm:py-8 transition-colors duration-500"
    >
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
          {SERVICES.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <a
                key={srv.id}
                href={srv.href}
                className="group relative flex items-center gap-3.5 rounded-2xl border border-sage-border/70 bg-sage-card/80 p-3.5 sm:p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-site/50 hover:bg-sage-card hover:shadow-soft"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sage-border bg-sage-secondary/80 text-site shadow-inner transition-all duration-300 group-hover:scale-105 group-hover:border-site group-hover:bg-site group-hover:text-white">
                  <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-sans text-xs sm:text-sm font-semibold tracking-wide text-forest transition-colors duration-300 group-hover:text-site">
                      {srv.title}
                    </span>
                  </div>
                  <p className="truncate font-sans text-[11px] sm:text-xs text-sage-muted transition-colors duration-300 group-hover:text-forest/80">
                    {srv.tagline}
                  </p>
                </div>
                <span
                  className="pointer-events-none absolute -bottom-px left-1/2 h-[2px] w-0 -translate-x-1/2 bg-site opacity-0 transition-all duration-300 group-hover:w-3/4 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </a>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
