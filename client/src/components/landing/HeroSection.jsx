import { m, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import logo from "../../assets/the-editing-table-logo.png";
import Container from "../ui/Container.jsx";

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);

  // Ensure autoplay & loop on all browsers / iOS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.play().catch(() => {
        // Autoplay blocked — attempt again on first user interaction
        const resume = () => {
          video.play().catch(() => null);
          document.removeEventListener("touchstart", resume);
          document.removeEventListener("click", resume);
        };
        document.addEventListener("touchstart", resume, { once: true });
        document.addEventListener("click", resume, { once: true });
      });
    };

    if (video.readyState >= 3) {
      setVideoReady(true);
      tryPlay();
    } else {
      video.addEventListener("canplaythrough", () => {
        setVideoReady(true);
        tryPlay();
      }, { once: true });
    }
  }, []);

  return (
    <section
      data-theme="hero"
      aria-label="The Editing Table Hero"
      className="relative w-full overflow-hidden select-none outline-none"
      style={{ height: "100svh", minHeight: "100svh" }}
    >
      {/* ─── VIDEO BACKGROUND ─── */}
      {!shouldReduceMotion ? (
        <m.video
          ref={videoRef}
          src="/animation1.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: videoReady ? 1 : 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center center",
            willChange: "opacity"
          }}
        />
      ) : (
        /* Reduced-motion fallback: single frame poster or solid bg */
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg,#F8FBF7 0%,#F2F7F0 60%,#E8F0E4 100%)"
          }}
        />
      )}

      {/* Reduced-motion static bg (always rendered as base, video sits on top) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(160deg,#F8FBF7 0%,#F2F7F0 60%,#E8F0E4 100%)",
          zIndex: -1
        }}
      />

      {/* ─── CINEMATIC OVERLAY — subtle gradient keeps text legible ─── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          /* Gentle dark bottom-to-top fade so logo/tagline stays readable */
          background:
            "linear-gradient(to top, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.08) 40%, transparent 100%)",
          zIndex: 1
        }}
      />

      {/* ─── HERO CONTENT — logo + tagline ─── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "5rem"    /* clear navbar */
        }}
      >
        <Container className="flex flex-col items-center justify-center text-center px-4 sm:px-6 w-full max-w-5xl">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            {/* ── Logo ── */}
            <m.img
              src={logo}
              alt="The Editing Table"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              animate={
                shouldReduceMotion
                  ? { scale: 1, opacity: 1, filter: "drop-shadow(0 10px 28px rgba(72,125,72,0.18))" }
                  : {
                      scale: [1.0, 1.05, 1.0, 1.05, 1.0],
                      opacity: [0.95, 1, 0.95, 1, 0.95],
                      filter: [
                        "drop-shadow(0 10px 28px rgba(72,125,72,0.16))",
                        "drop-shadow(0 18px 44px rgba(72,125,72,0.30))",
                        "drop-shadow(0 10px 28px rgba(72,125,72,0.16))",
                        "drop-shadow(0 18px 44px rgba(72,125,72,0.30))",
                        "drop-shadow(0 10px 28px rgba(72,125,72,0.16))"
                      ]
                    }
              }
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.4, 0.5, 0.9, 1.0]
              }}
              style={{
                width: "clamp(220px, 38vw, 620px)",
                maxHeight: "min(34vh, 340px)",
                willChange: "transform, filter"
              }}
              className="h-auto object-contain max-w-[82vw] sm:max-w-[86vw]"
            />

            {/* ── Tagline ── */}
            <m.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: "clamp(1.65rem, 3.4vw, 3.2rem)",
                fontFamily: '"Lavishly Yours", cursive',
                lineHeight: 1.15,
                color: "#FFFFFF",
                textShadow: "0 2px 18px rgba(0,0,0,0.28), 0 0 60px rgba(72,125,72,0.14)"
              }}
              className="mt-[clamp(0.75rem,1.6vh,1.5rem)] select-none font-normal"
            >
              You Shoot,{" "}
              <span style={{ color: "rgba(200,230,200,0.90)" }}>We Edit</span>
            </m.p>
          </m.div>
        </Container>
      </div>
    </section>
  );
}
