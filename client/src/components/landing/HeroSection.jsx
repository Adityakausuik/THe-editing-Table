import { m, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
    <>
      {/* Inline responsive styles for mobile object-position */}
      <style>{`
        .hero-video {
          object-position: center center;
        }
        @media (max-width: 640px) {
          .hero-video {
            object-position: 60% center;
          }
        }
        @media (max-width: 640px) and (orientation: portrait) {
          .hero-video {
            object-position: 55% 30%;
          }
        }
      `}</style>

      <section
        data-theme="hero"
        aria-label="The Editing Table Hero"
        style={{
          position: "relative",
          width: "100%",
          /* Use dvh for modern browsers, svh as safe fallback, vh as last resort */
          height: "100dvh",
          minHeight: "-webkit-fill-available",
          overflow: "hidden",
          margin: 0,
          padding: 0,
          display: "block"
        }}
      >
        {/* ─── STATIC BG FALLBACK (base layer / while video loads) ─── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg,#F8FBF7 0%,#F2F7F0 60%,#E8F0E4 100%)",
            zIndex: 0
          }}
        />

        {/* ─── VIDEO BACKGROUND ─── */}
        {!shouldReduceMotion ? (
          <m.video
            ref={videoRef}
            src="/animation2.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            className="hero-video"
            initial={{ opacity: 0 }}
            animate={{ opacity: videoReady ? 1 : 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              willChange: "opacity",
              zIndex: 1
            }}
          />
        ) : (
          /* Reduced-motion fallback */
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(160deg,#F8FBF7 0%,#F2F7F0 60%,#E8F0E4 100%)",
              zIndex: 1
            }}
          />
        )}
      </section>
    </>
  );
}
