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
      {/* ─── STATIC BG FALLBACK (base layer) ─── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(160deg,#F8FBF7 0%,#F2F7F0 60%,#E8F0E4 100%)",
          zIndex: -1
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
        /* Reduced-motion fallback */
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg,#F8FBF7 0%,#F2F7F0 60%,#E8F0E4 100%)"
          }}
        />
      )}
    </section>
  );
}
