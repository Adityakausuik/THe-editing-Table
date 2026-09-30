import { m, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useWeeklyHeroAnimation } from "../../lib/heroAnimationRotation.js";

/**
 * Premium Hero Video Animation Component
 * Features:
 * - Deterministic date-based weekly rotation (Animation 1, 2, 3)
 * - Auto-start, continuous seamless looping
 * - GPU-accelerated 60 FPS rendering
 * - Micro-bleed edge scaling to remove viewport recording artifacts
 * - Preloading of next week's animation for instant rollover
 * - Respects prefers-reduced-motion
 * - Accessible SEO semantic layer
 */
export default function HeroVideoAnimation({ isIntroActive = false }) {
  const shouldReduceMotion = useReducedMotion();
  const { currentAnimation, nextAnimation, animationNumber, weekNumber } = useWeeklyHeroAnimation();
  const videoRef = useRef(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasPlayError, setHasPlayError] = useState(false);

  // Auto-play and loop management
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setHasPlayError(false);
        })
        .catch(() => {
          // Autoplay was prevented by browser policy (e.g. low power mode)
          setHasPlayError(true);
        });
    }

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("ended", handleEnded);
    };
  }, [currentAnimation.id]);

  // Pause if reduced motion is preferred
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldReduceMotion) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [shouldReduceMotion]);

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center select-none">
      {/* Invisible link tag preloading the next weekly animation in background */}
      {nextAnimation?.src && (
        <link rel="preload" as="video" href={nextAnimation.src} type="video/mp4" />
      )}

      {/* Semantic Accessible Screen-Reader Layer (Preserves 100% SEO & A11y) */}
      <div className="sr-only" aria-live="polite">
        <h1>The Editing Table</h1>
        <h2>You Shoot, WE EDIT.</h2>
        <p>
          Professional photo & video editing for creators, filmmakers and brands around the world.
        </p>
        <p>Currently displaying featured rotation: {currentAnimation.name} (Week {weekNumber})</p>
      </div>

      {/* Main Video Frame with Glassmorphism & Soft Ambient Blend */}
      <m.div
        initial={isIntroActive ? { opacity: 0, scale: 0.94 } : { opacity: 1, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full aspect-[16/9] max-h-[72vh] rounded-2xl overflow-hidden flex items-center justify-center will-change-transform"
        style={{
          transform: "translateZ(0)"
        }}
      >
        {/* Soft atmospheric ambient backlight matching the animation theme */}
        <div
          className="absolute inset-0 pointer-events-none -z-10 rounded-2xl blur-3xl opacity-40 transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle, ${currentAnimation.accent} 0%, rgba(200,216,190,0.15) 50%, transparent 75%)`
          }}
          aria-hidden="true"
        />

        {/* Video Element with 1.03 scale to eliminate outer browser recording margins */}
        <video
          ref={videoRef}
          key={currentAnimation.src}
          src={currentAnimation.src}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setIsVideoLoaded(true)}
          style={{
            transform: "scale(1.035) translateZ(0)",
            willChange: "transform",
            objectFit: "cover"
          }}
          className={`w-full h-full object-cover rounded-2xl transition-opacity duration-700 ${
            isVideoLoaded ? "opacity-100" : "opacity-0"
          }`}
          title={`The Editing Table — ${currentAnimation.name}`}
          aria-label="The Editing Table Hero Animation: You Shoot, WE EDIT."
        />

        {/* Soft edge blend vignette ensuring seamless integration with light sage page background */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_24px_rgba(248,251,247,0.6)]"
          aria-hidden="true"
        />

        {/* Tap/click to play fallback for browsers restricting auto-play */}
        {hasPlayError && (
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.play().then(() => setHasPlayError(false)).catch(() => {});
              }
            }}
            className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-forest/80 text-warm-white text-xs font-medium backdrop-blur-md hover:bg-forest transition-colors shadow-soft"
            aria-label="Play animation"
          >
            Play Animation
          </button>
        )}
      </m.div>

      {/* Week Rotation Indicator (Minimal luxury aesthetic, non-intrusive) */}
      <m.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-3 flex items-center gap-2 text-[11px] font-sans tracking-widest uppercase text-forest/40 select-none"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-copper animate-pulse" />
        <span>Featured Edition {animationNumber} / 3</span>
      </m.div>
    </div>
  );
}
