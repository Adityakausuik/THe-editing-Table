import { useRef, useEffect } from "react";

/**
 * InquiryVideoShowcase Component
 * Highly optimized, direct video display:
 * - No card boxes, no shadows, no white borders, no heavy SVG filters
 * - IntersectionObserver pauses video when off-screen to preserve 100% CPU/GPU resources
 * - Uses preload="metadata" and faststart stream for smooth 60fps/30fps playback on laptops
 */
export default function InquiryVideoShowcase() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Guaranteed muted & playsInline for cross-browser silent autoplay
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    // IntersectionObserver to pause playback when out of view and resume when visible
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
        { threshold: 0.2 }
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
    <div className="w-full h-full flex items-center justify-center lg:justify-end select-none">
      {/* 
        Direct video presentation without boxed card containers,
        shadows, or white borders, maintaining original aspect ratio.
      */}
      <div className="w-full max-w-[480px] lg:max-w-[500px] overflow-hidden rounded-md">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full h-auto object-cover object-center block"
        >
          <source src="/videos/inquiry-showcase.mp4" type="video/mp4" />
          <source src="/videos/inquiry-showcase.mov" type="video/quicktime" />
        </video>
      </div>
    </div>
  );
}
