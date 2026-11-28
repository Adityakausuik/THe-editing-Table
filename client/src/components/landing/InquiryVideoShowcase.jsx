import { useRef, useEffect } from "react";

/**
 * InquiryVideoShowcase Component
 * - Seamless edge feathering into the textured sage plaster wall using calibrated 50% radial mask
 * - Completely eliminates box borders, card containers, outlines, shadows, and corner gaps
 * - Fully responsive with 16:9 native aspect ratio across mobile, tablet, laptop, and desktop
 * - Zero delay playback with preload="auto", instant poster fallback, and IntersectionObserver off-screen throttling
 */
export default function InquiryVideoShowcase() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playVideo = () => {
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    };

    // Attempt playback immediately on component mount
    playVideo();

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
        { threshold: 0.05, rootMargin: "200px 0px" }
      );
      observer.observe(video);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <div className="w-full flex items-center justify-center lg:justify-end p-0 m-0 select-none">
      {/* 
        Video Wrapper with soft perimeter fade to blend edges naturally into the wall.
        No rectangular box, no card, no border, no outline, no shadow, no corner padding.
      */}
      <div
        className="relative w-full max-w-[560px] aspect-video flex items-center justify-center p-0 m-0 bg-transparent"
        style={{
          maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, black 60%, rgba(0, 0, 0, 0.7) 80%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, black 60%, rgba(0, 0, 0, 0.7) 80%, transparent 100%)"
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/inquiry-poster.jpg"
          onLoadedData={(e) => e.target.play().catch(() => {})}
          onCanPlay={(e) => e.target.play().catch(() => {})}
          className="w-full h-full object-cover object-center block bg-transparent"
        >
          <source src="/videos/inquiry-showcase.mp4" type="video/mp4" />
          <source src="/videos/inquiry-showcase.mov" type="video/quicktime" />
        </video>
      </div>
    </div>
  );
}
