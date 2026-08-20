import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const SECTION_THEMES = {
  hero: {
    bg: "#F8FBF7",
    glow: "rgba(72, 125, 72, 0.25)"
  },
  about: {
    bg: "#F2F7F0",
    glow: "rgba(72, 125, 72, 0.20)"
  },
  services: {
    bg: "#F6F8F4",
    glow: "rgba(72, 125, 72, 0.30)"
  },
  portfolio: {
    bg: "#FFFFFF",
    glow: "rgba(72, 125, 72, 0.15)"
  },
  process: {
    bg: "#F6F8F4",
    glow: "rgba(72, 125, 72, 0.25)"
  },
  gallery: {
    bg: "#F2F7F0",
    glow: "rgba(72, 125, 72, 0.20)"
  },
  team: {
    bg: "#1A241A",
    glow: "rgba(72, 125, 72, 0.35)"
  },
  blog: {
    bg: "#F2F7F0",
    glow: "rgba(72, 125, 72, 0.20)"
  },
  contact: {
    bg: "#F8FBF7",
    glow: "rgba(72, 125, 72, 0.40)"
  }
};

const DEFAULT_THEME = "hero";
const VISIBLE_THRESHOLD = 0.4;

function getSectionVisibility(section) {
  const rect = section.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);

  if (visibleHeight <= 0) return 0;
  return visibleHeight / Math.min(rect.height, viewportHeight);
}

function setThemeVariables(themeName, prefersReducedMotion) {
  const theme = SECTION_THEMES[themeName] ?? SECTION_THEMES[DEFAULT_THEME];
  const root = document.documentElement;

  gsap.killTweensOf([root, document.body]);

  gsap.to(document.body, {
    backgroundColor: theme.bg,
    duration: prefersReducedMotion ? 0 : 1.2,
    ease: "power2.inOut",
    overwrite: "auto"
  });

  gsap.to(root, {
    "--bg-primary": theme.bg,
    "--glow-sage": theme.glow,
    duration: prefersReducedMotion ? 0 : 1.2,
    ease: "power2.inOut",
    overwrite: "auto"
  });
}

export default function GlobalBackground() {
  const backgroundRef = useRef(null);
  const activeThemeRef = useRef(DEFAULT_THEME);
  const rafRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateActiveTheme = () => {
      const sections = Array.from(document.querySelectorAll("section[data-theme]"));
      const visibleSections = sections
        .map((section) => ({
          section,
          ratio: getSectionVisibility(section)
        }))
        .filter(({ ratio }) => ratio > 0)
        .sort((a, b) => b.ratio - a.ratio);

      const activeSection =
        visibleSections.find(({ ratio }) => ratio >= VISIBLE_THRESHOLD)?.section ?? visibleSections[0]?.section;

      const themeName = activeSection?.dataset.theme;
      if (themeName && themeName !== activeThemeRef.current) {
        activeThemeRef.current = themeName;
        root.dataset.activeTheme = themeName;
        setThemeVariables(themeName, motionQuery.matches);
      }
    };

    const observer = new IntersectionObserver(
      () => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updateActiveTheme);
      },
      {
        root: null,
        rootMargin: "-10% 0px -10% 0px",
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1]
      }
    );

    const sections = document.querySelectorAll("section[data-theme]");
    sections.forEach((section) => observer.observe(section));
    updateActiveTheme();

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      gsap.killTweensOf([root, document.body]);
    };
  }, []);

  return (
    <div ref={backgroundRef} className="global-background" aria-hidden="true">
      <div className="global-background__orb global-background__orb--one" />
      <div className="global-background__orb global-background__orb--two" />
      <div className="global-background__orb global-background__orb--three" />
      <div className="global-background__grain" />
    </div>
  );
}
