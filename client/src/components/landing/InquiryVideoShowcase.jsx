import { useState, useRef, useEffect } from "react";

/**
 * InquiryVideoShowcase Component
 * Strictly plays local project videos from /videos/ without any database or external storage.
 * Designed to recreate the high-end editorial framing from the visual design reference.
 */
export default function InquiryVideoShowcase() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure playsinline and muted for reliable cross-browser autoplay
    video.muted = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Fallback if autoplay is restricted before user gesture
          setIsPlaying(false);
        });
    }
  }, []);

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[580px] flex items-center justify-center select-none overflow-hidden">
      {/* ================= ARTISTIC BRUSHSTROKE RIBBON ACCENT ================= */}
      {/* Recreates the hand-painted chalk ribbon / heart framing from the design reference */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen scale-110 lg:scale-125 -translate-y-4"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M 160 380 C 100 240, 200 80, 340 100 C 420 110, 520 180, 480 320 C 440 450, 320 520, 240 540 C 180 550, 140 480, 200 400 C 260 320, 420 220, 460 160"
          stroke="#FFFFFF"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.55"
          filter="url(#chalk-blur)"
        />
        <filter id="chalk-blur">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" />
        </filter>
      </svg>

      {/* ================= MAIN VIDEO WRAPPER ================= */}
      <div className="relative w-full max-w-[420px] lg:max-w-[460px] aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(25,38,22,0.22)] border border-white/20 group bg-[#8F9E84]/30">
        {/* HTML5 Video Player referencing local project static assets */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/inquiry-showcase-poster.jpg"
          onLoadedData={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover object-center transition-opacity duration-700 ${
            isLoaded || isPlaying ? "opacity-100" : "opacity-95"
          }`}
        >
          {/* Static local project video sources stored in public/videos/ */}
          <source src="/videos/inquiry-showcase.mp4" type="video/mp4" />
          <source src="/videos/inquiry-showcase.mov" type="video/quicktime" />
          <source src="/videos/inquiry-background.mp4" type="video/mp4" />
          <source src="/videos/inquiry-background.mov" type="video/quicktime" />
        </video>

        {/* Fallback image poster if video fails to load or browser restricts video */}
        {hasError && (
          <img
            src="/videos/inquiry-showcase-poster.jpg"
            alt="Inquiry Showcase"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        )}

        {/* Subtle cinematic gradient overlay matching the reference mood */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none"
          aria-hidden="true"
        />

        {/* Subtle floating badge */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 bg-black/35 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
            Bespoke Edit &amp; Color
          </span>
          <span className="text-[10px] text-white/80 bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
            4K 60fps
          </span>
        </div>
      </div>
    </div>
  );
}
