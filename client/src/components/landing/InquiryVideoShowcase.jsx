import { useRef, useEffect } from "react";

/**
 * InquiryVideoShowcase Component
 * - Blends seamlessly into the light-green plaster wall background via a soft feathered perimeter mask
 * - Completely removes rectangular box borders, outlines, card backgrounds, and corner spacing
 * - Fully responsive with zero horizontal overflow on mobile/tablet/desktop
 * - Optimized with IntersectionObserver for smooth 60fps/30fps playback on laptops
 */
export default function InquiryVideoShowcase() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    let observer;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(video);
    } else {
      video.play().catch(() => {});
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <div className="w-full flex items-center justify-center lg:justify-end p-0 m-0 select-none">
      {/* 
        Video Wrapper with soft perimeter mask to blend edges naturally into the wall.
        No box, no card, no border, no shadow, no corner padding.
      */}
      <div
        className="relative w-full max-w-[560px] aspect-video flex items-center justify-center p-0 m-0 bg-transparent"
        style={{
          maskImage: "radial-gradient(ellipse 90% 86% at 50% 50%, black 60%, rgba(0, 0, 0, 0.7) 78%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 86% at 50% 50%, black 60%, rgba(0, 0, 0, 0.7) 78%, transparent 100%)"
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-cover object-center block bg-transparent"
        >
          <source src="/videos/inquiry-showcase.mp4" type="video/mp4" />
          <source src="/videos/inquiry-showcase.mov" type="video/quicktime" />
        </video>
      </div>
    </div>
  );
}
