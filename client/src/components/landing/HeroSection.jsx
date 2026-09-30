import { m, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import Container from "../ui/Container.jsx";
import HeroAnimatedBackground from "./HeroAnimatedBackground.jsx";
import HeroVideoAnimation from "./HeroVideoAnimation.jsx";

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
      setIsIntroActive(false);
    }, 2750);

    return () => {
      window.clearTimeout(navTimer);
      window.clearTimeout(completeTimer);
      document.body.classList.remove("hero-intro-active");
    };
  }, [isIntroActive]);

  return (
    <section
      data-theme="hero"
      aria-label="The Editing Table Hero"
      className="relative min-h-[100svh] w-full flex flex-col items-center justify-center overflow-hidden bg-sage-bg select-none outline-none pt-16 sm:pt-20 pb-8 sm:pb-12"
    >
      {/* CINEMATIC CIRCULAR REVEAL EXPANSION WAVE (Originating from Center at 1.8s) */}
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

      {/* CENTER HERO CONTENT — WEEKLY ROTATING HERO ANIMATION */}
      <Container className="relative z-20 flex flex-col items-center justify-center text-center my-auto px-4 sm:px-6 w-full max-w-7xl">
        <HeroVideoAnimation isIntroActive={isIntroActive} />
      </Container>
    </section>
  );
}
