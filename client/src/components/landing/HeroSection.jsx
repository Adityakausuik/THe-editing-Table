import { m, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import logo from "../../assets/the-editing-table-logo.png";
import Container from "../ui/Container.jsx";

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  // Continuous subtle breathing animation (2s zoom in -> 0.5s hold -> 2s zoom out -> 0.5s hold)
  const logoAnimation = shouldReduceMotion
    ? {
        scale: 1,
        opacity: 1,
        filter: "drop-shadow(0 8px 24px rgba(72, 125, 72, 0.12))"
      }
    : {
        scale: [1.0, 1.06, 1.06, 1.0, 1.0],
        opacity: [0.94, 1.0, 1.0, 0.94, 0.94],
        filter: [
          "drop-shadow(0 8px 20px rgba(72, 125, 72, 0.10)) drop-shadow(0 2px 6px rgba(72, 125, 72, 0.05))",
          "drop-shadow(0 14px 34px rgba(72, 125, 72, 0.22)) drop-shadow(0 4px 12px rgba(72, 125, 72, 0.12))",
          "drop-shadow(0 14px 34px rgba(72, 125, 72, 0.22)) drop-shadow(0 4px 12px rgba(72, 125, 72, 0.12))",
          "drop-shadow(0 8px 20px rgba(72, 125, 72, 0.10)) drop-shadow(0 2px 6px rgba(72, 125, 72, 0.05))",
          "drop-shadow(0 8px 20px rgba(72, 125, 72, 0.10)) drop-shadow(0 2px 6px rgba(72, 125, 72, 0.05))"
        ]
      };

  const handleScrollDown = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth"
    });
  };

  return (
    <section
      data-theme="hero"
      aria-label="The Editing Table Hero"
      className="relative min-h-[100svh] w-full flex flex-col items-center justify-center overflow-hidden bg-sage-bg select-none outline-none"
    >
      {/* AMBIENT BACKGROUND GLOW — Apple / VisionOS Inspired Studio Aura */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8FBF7] via-[#F5F8F3] to-[#F8FBF7]" />

        {/* Central soft atmospheric studio orb */}
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] sm:h-[580px] sm:w-[580px] lg:h-[680px] lg:w-[680px] rounded-full bg-[radial-gradient(circle,rgba(72,125,72,0.20)_0%,rgba(200,216,190,0.08)_45%,transparent_70%)] blur-3xl pointer-events-none"
        />

        {/* Fine luxury studio vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(248,251,247,0.85)_100%)]" />
      </div>

      {/* CENTER HERO CONTENT — LOGO ONLY WITH LUXURY NEGATIVE SPACE */}
      <Container className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4 sm:px-6">
        <m.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center justify-center"
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
            className="w-56 sm:w-72 md:w-84 lg:w-96 xl:w-[420px] max-w-[85vw] h-auto object-contain cursor-default"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
          />
        </m.div>
      </Container>

      {/* DELICATE MINIMAL SCROLL INDICATOR */}
      <div className="absolute bottom-6 sm:bottom-8 inset-x-0 z-10 flex flex-col items-center justify-center pointer-events-auto">
        <button
          onClick={handleScrollDown}
          aria-label="Scroll to explore studio work"
          className="group flex flex-col items-center gap-1.5 text-sage-muted/70 hover:text-site transition-colors duration-300 focus:outline-none"
        >
          <span className="text-[10px] uppercase tracking-[0.25em] font-medium transition-opacity duration-300 group-hover:opacity-100">
            Explore Studio
          </span>
          <m.div
            animate={shouldReduceMotion ? {} : { y: [0, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
          </m.div>
        </button>
      </div>
    </section>
  );
}
