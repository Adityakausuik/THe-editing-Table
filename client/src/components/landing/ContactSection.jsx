import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Container from "../ui/Container.jsx";

/**
 * ContactSection — Cinematic Full-Width Inquiry Hero
 * - Full-bleed HTML5 wedding video covering the section edge-to-edge
 * - Subtle dark olive / forest-green overlay for cinematic depth & contrast
 * - Centered luxury editorial typography in warm ivory / cream
 * - Exact text hierarchy:
 *     1. "get in touch" (handwritten script font)
 *     2. "LET’S CAPTURE THE MAGIC OF YOUR SPECIAL DAY" (luxury serif all-caps)
 *     3. "INQUIRE NOW →" (uppercase tracked CTA button linking to /contactus)
 * - Optimized with IntersectionObserver and prefers-reduced-motion support
 */
export default function ContactSection() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      video.pause();
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playVideo = () => {
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    };

    // Play immediately on mount
    playVideo();

    // IntersectionObserver to pause when offscreen and resume when near viewport
    let observer;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            playVideo();
          } else {
            video.pause();
          }
        },
        { threshold: 0.05, rootMargin: "250px 0px" }
      );
      observer.observe(video);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <section
      id="contact"
      data-theme="contact"
      aria-label="Inquiry Hero Section"
      className="relative w-full min-h-[75vh] sm:min-h-[85vh] lg:min-h-[92vh] flex items-center justify-center overflow-hidden py-24 sm:py-32 select-none"
    >
      {/* 1. Full-Width Edge-to-Edge Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/inquiry-poster.jpg"
          className="w-full h-full object-cover object-center"
        >
          <source src="/videos/inquiry-showcase.mp4" type="video/mp4" />
          <source src="/videos/inquiry-showcase.mov" type="video/quicktime" />
        </video>
      </div>

      {/* 2. Cinematic Dark Olive / Forest-Green Transparent Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(16, 30, 16, 0.65) 0%, rgba(16, 30, 16, 0.48) 50%, rgba(16, 30, 16, 0.70) 100%)"
        }}
      />

      {/* 3. Centered Luxury Editorial Content */}
      <Container className="relative z-10 max-w-5xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
        {/* Handwritten Script Heading */}
        <h2 className="font-lavishly text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5rem] text-[#FAF7F2] font-normal lowercase tracking-wide mb-6 sm:mb-8 drop-shadow-md select-none">
          get in touch
        </h2>

        {/* CTA Button */}
        <Link
          to="/contactus"
          className="inline-flex items-center gap-2.5 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full border border-[#FAF7F2]/60 hover:border-[#FAF7F2] bg-[#FAF7F2]/10 hover:bg-[#FAF7F2]/25 text-[#FAF7F2] text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer"
          aria-label="Inquire Now for your special day"
        >
          <span>INQUIRE NOW</span>
          <span className="text-base sm:text-lg transition-transform duration-300 group-hover:translate-x-1.5">
            →
          </span>
        </Link>
      </Container>
    </section>
  );
}
