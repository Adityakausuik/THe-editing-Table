import { m, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import logo from "../../assets/the-editing-table-logo.png";
import Container from "../ui/Container.jsx";
import HeroAnimatedBackground from "./HeroAnimatedBackground.jsx";

const INTRO_SEEN_KEY = "tet_hero_intro_seen";

function getHasSeenIntro() {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  // Intro is only active if motion is allowed AND intro has NOT been seen yet this session
  const [isIntroActive, setIsIntroActive] = useState(() => {
    if (shouldReduceMotion) return false;
    return !getHasSeenIntro();
  });

  // Controls the completion of the intro sequence so breathing animation takes over
  const [isIntroComplete, setIsIntroComplete] = useState(() => !isIntroActive);

  useEffect(() => {
    if (!isIntroActive) return;

    // Coordinate with navbar: keep header hidden during central intro, then reveal gracefully
    document.body.classList.add("hero-intro-active");

    // At 1.85s, as the circular reveal expands outward, fade in the navbar
    const navTimer = setTimeout(() => {
      document.body.classList.remove("hero-intro-active");
    }, 1850);

    // At 2.75s, mark the intro as fully completed and record in sessionStorage
    const completeTimer = setTimeout(() => {
      try {
        window.sessionStorage.setItem(INTRO_SEEN_KEY, "true");
      } catch {
        // Ignore sessionStorage restrictions
      }
      setIsIntroComplete(true);
      setIsIntroActive(false);
    }, 2750);

    return () => {
      window.clearTimeout(navTimer);
      window.clearTimeout(completeTimer);
      document.body.classList.remove("hero-intro-active");
    };
  }, [isIntroActive]);

  // Continuous subtle breathing animation (active after intro or immediately on returning visits)
  const breathingAnimation = shouldReduceMotion
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

  // Cinematic subtle scale, lighting & settle intro animation sequence without rotation
  const introLogoAnimation = {
    opacity: [0, 1, 1, 1, 1, 1],
    scale: [0.94, 1.0, 1.04, 1.0, 1.04, 1.0],
    filter: [
      "drop-shadow(0 4px 12px rgba(72, 125, 72, 0.04))",
      "drop-shadow(0 10px 24px rgba(72, 125, 72, 0.12))",
      "drop-shadow(0 26px 54px rgba(72, 125, 72, 0.28)) drop-shadow(0 4px 14px rgba(72, 125, 72, 0.12))",
      "drop-shadow(0 12px 28px rgba(72, 125, 72, 0.14))",
      "drop-shadow(0 24px 50px rgba(72, 125, 72, 0.30)) drop-shadow(0 6px 16px rgba(72, 125, 72, 0.15))",
      "drop-shadow(0 10px 24px rgba(72, 125, 72, 0.10))"
    ]
  };

  const activeLogoAnimation = isIntroActive && !isIntroComplete
    ? introLogoAnimation
    : breathingAnimation;

  const activeLogoTransition = isIntroActive && !isIntroComplete
    ? {
        duration: 2.65,
        times: [0, 0.08, 0.36, 0.58, 0.72, 1.0],
        ease: [0.22, 1, 0.36, 1]
      }
    : {
        duration: 5.0,
        times: [0, 0.4, 0.5, 0.9, 1.0],
        repeat: Infinity,
        ease: "easeInOut"
      };

  return (
    <section
      data-theme="hero"
      aria-label="The Editing Table Hero"
      className="relative min-h-[100svh] w-full flex flex-col items-center justify-center overflow-hidden bg-sage-bg select-none outline-none pt-16 sm:pt-20 pb-8 sm:pb-12"
    >
      {/* CINEMATIC CIRCULAR REVEAL EXPANSION WAVE (Originating from Logo Center at 1.8s) */}
      {isIntroActive && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center" aria-hidden="true">
          {/* Primary expanding radiant aura ring */}
          <m.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{
              scale: [0.2, 0.2, 1.2, 5.0],
              opacity: [0, 0, 0.65, 0]
            }}
            transition={{
              duration: 2.65,
              times: [0, 0.65, 0.74, 1.0],
              ease: [0.22, 1, 0.36, 1]
            }}
            className="w-[320px] h-[320px] rounded-full border border-[rgb(72,125,72)]/40 bg-[radial-gradient(circle,rgba(72,125,72,0.18)_0%,rgba(200,216,190,0.10)_40%,transparent_75%)] blur-md will-change-transform"
          />

          {/* Secondary micro-ring for cinematic lens flare depth */}
          <m.div
            initial={{ scale: 0.1, opacity: 0 }}
            animate={{
              scale: [0.1, 0.1, 1.0, 3.8],
              opacity: [0, 0, 0.45, 0]
            }}
            transition={{
              duration: 2.65,
              times: [0, 0.68, 0.76, 1.0],
              ease: [0.22, 1, 0.36, 1]
            }}
            className="w-[260px] h-[260px] rounded-full border border-[rgb(72,125,72)]/30 blur-sm will-change-transform"
          />
        </div>
      )}

      {/* DYNAMIC ANIMATED HERO BACKGROUND — Fluid Aurora Mesh, Drifting Bokeh Particles & Parallax */}
      <HeroAnimatedBackground isIntroActive={isIntroActive} />

      {/* CENTER HERO CONTENT — LOGO + TAGLINE WITH BALANCED RESPONSIVE SPACING */}
      <Container className="relative z-20 flex flex-col items-center justify-center text-center my-auto px-4 sm:px-6 w-full max-w-7xl">
        <m.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center justify-center w-full"
        >
          {/* Main Logo with Controlled Smooth Intro & Continuous Breathing Animation */}
          <m.img
            src={logo}
            alt="The Editing Table"
            animate={activeLogoAnimation}
            transition={activeLogoTransition}
            style={{
              width: "clamp(260px, 40vw, 680px)",
              maxHeight: "min(36vh, 360px)",
              willChange: "transform, filter"
            }}
            className="max-w-[88vw] h-auto object-contain cursor-default select-none"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
          />

          {/* BRAND TAGLINE — ELEGANT CALLIGRAPHIC SCRIPT & FULLY RESPONSIVE */}
          <m.p
            initial={{ opacity: 0, y: isIntroActive ? 16 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: isIntroActive ? 2.25 : 0.2,
              ease: [0.22, 1, 0.36, 1]
            }}
            style={{
              fontSize: "clamp(1.75rem, 3.6vw, 3.5rem)",
              fontFamily: '"Lavishly Yours", cursive',
              lineHeight: 1.15
            }}
            className="mt-[clamp(0.75rem,1.8vh,1.75rem)] text-forest select-none font-normal"
          >
            You Shoot,{" "}
            <span
              className="text-[rgba(72,125,72,0.65)]"
              style={{ color: "rgba(72, 125, 72, 0.65)" }}
            >
              We Edit
            </span>
          </m.p>
        </m.div>
      </Container>
    </section>
  );
}
