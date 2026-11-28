import { useState, useRef, useEffect } from "react";

/**
 * InquiryVideoShowcase Component
 * Strictly plays local project video from /videos/ without any photo, poster, or database storage.
 */
export default function InquiryVideoShowcase() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure muted and playsInline for guaranteed continuous autoplay
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const startPlayback = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay restricted until user gesture
            setIsPlaying(false);
          });
      }
    };

    startPlayback();

    // Secondary trigger on first user interaction for any strict mobile policies
    const handleFirstGesture = () => {
      startPlayback();
      window.removeEventListener("touchstart", handleFirstGesture);
      window.removeEventListener("click", handleFirstGesture);
      window.removeEventListener("scroll", handleFirstGesture);
    };

    window.addEventListener("touchstart", handleFirstGesture, { passive: true });
    window.addEventListener("click", handleFirstGesture, { passive: true });
    window.addEventListener("scroll", handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleFirstGesture);
      window.removeEventListener("click", handleFirstGesture);
      window.removeEventListener("scroll", handleFirstGesture);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[580px] flex items-center justify-center select-none overflow-hidden">
      {/* ================= ARTISTIC BRUSHSTROKE RIBBON ACCENT ================= */}
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

      {/* ================= MAIN VIDEO WRAPPER (NO PHOTO / NO POSTER) ================= */}
      <div className="relative w-full max-w-[420px] lg:max-w-[460px] aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(25,38,22,0.22)] border border-white/20 group bg-[#283924]">
        {/* HTML5 Video Player: Pure video playback directly from local /videos/ */}
        <video
          ref={videoRef}
          src="/videos/inquiry-showcase.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={() => setIsPlaying(true)}
          className="w-full h-full object-cover object-center"
        >
          <source src="/videos/inquiry-showcase.mp4" type="video/mp4" />
          <source src="/videos/inquiry-showcase.mov" type="video/quicktime" />
        </video>

        {/* Subtle cinematic gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none"
          aria-hidden="true"
        />

        {/* Subtle floating badges */}
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
