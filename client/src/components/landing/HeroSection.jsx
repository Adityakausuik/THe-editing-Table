import { m, useReducedMotion } from "framer-motion";
import logo from "../../assets/the-editing-table-logo.png";
import Container from "../ui/Container.jsx";

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  // Continuous subtle breathing animation (2s zoom in -> 0.5s hold -> 2s zoom out -> 0.5s hold)
  // Uses GPU transform (scale) so layout dimensions remain 100% stable
  const logoAnimation = shouldReduceMotion
    ? {
        scale: 1,
        opacity: 1,
        filter: "drop-shadow(0 10px 28px rgba(72, 125, 72, 0.12))"
      }
    : {
        scale: [1.0, 1.06, 1.06, 1.0, 1.0],
        opacity: [0.94, 1.0, 1.0, 0.94, 0.94],
        filter: [
          "drop-shadow(0 10px 24px rgba(72, 125, 72, 0.10)) drop-shadow(0 2px 6px rgba(72, 125, 72, 0.05))",
          "drop-shadow(0 18px 40px rgba(72, 125, 72, 0.24)) drop-shadow(0 4px 14px rgba(72, 125, 72, 0.14))",
          "drop-shadow(0 18px 40px rgba(72, 125, 72, 0.24)) drop-shadow(0 4px 14px rgba(72, 125, 72, 0.14))",
          "drop-shadow(0 10px 24px rgba(72, 125, 72, 0.10)) drop-shadow(0 2px 6px rgba(72, 125, 72, 0.05))",
          "drop-shadow(0 10px 24px rgba(72, 125, 72, 0.10)) drop-shadow(0 2px 6px rgba(72, 125, 72, 0.05))"
        ]
      };

  return (
    <section
      data-theme="hero"
      aria-label="The Editing Table Hero"
      className="relative min-h-[100svh] w-full flex flex-col items-center justify-center overflow-hidden bg-sage-bg select-none outline-none pt-16 sm:pt-20 pb-8 sm:pb-12"
    >
      {/* AMBIENT BACKGROUND GLOW — Apple / VisionOS Inspired Studio Aura */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8FBF7] via-[#F5F8F3] to-[#F8FBF7]" />

        {/* Central soft atmospheric studio orb — dynamically scaled for all desktop & mobile resolutions */}
        <m.div
          animate={
            shouldReduceMotion
              ? { scale: 1, opacity: 0.2 }
              : {
                  scale: [1, 1.08, 1.08, 1, 1],
                  opacity: [0.18, 0.28, 0.28, 0.18, 0.18]
                }
          }
          transition={{
            duration: 5.0,
            times: [0, 0.4, 0.5, 0.9, 1.0],
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[clamp(420px,50vw,920px)] w-[clamp(420px,50vw,920px)] rounded-full bg-[radial-gradient(circle,rgba(72,125,72,0.22)_0%,rgba(200,216,190,0.08)_45%,transparent_70%)] blur-3xl pointer-events-none"
        />

        {/* Fine luxury studio vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(248,251,247,0.85)_100%)]" />
      </div>

      {/* CENTER HERO CONTENT — LOGO + TAGLINE WITH BALANCED RESPONSIVE SPACING */}
      <Container className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4 sm:px-6 w-full max-w-7xl">
        <m.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center justify-center w-full"
        >
          {/* Main Logo with Continuous Breathing & Glow Animation */}
          <m.img
            src={logo}
            alt="The Editing Table"
            animate={logoAnimation}
            transition={{
              duration: 5.0,
              times: [0, 0.4, 0.5, 0.9, 1.0],
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              width: "clamp(260px, 40vw, 680px)",
              maxHeight: "min(36vh, 360px)"
            }}
            className="max-w-[88vw] h-auto object-contain cursor-default select-none will-change-transform"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
          />

          {/* BRAND TAGLINE — LARGE, BOLD, EDITORIAL & FULLY RESPONSIVE */}
          <m.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: "clamp(1.15rem, 2.2vw, 2.25rem)",
              letterSpacing: "clamp(0.18em, 0.45vw, 0.35em)"
            }}
            className="mt-[clamp(1.25rem,2.8vh,2.5rem)] font-sans font-bold uppercase text-forest select-none leading-none"
          >
            YOU SHOOT. WE EDIT.
          </m.p>
        </m.div>
      </Container>
    </section>
  );
}
