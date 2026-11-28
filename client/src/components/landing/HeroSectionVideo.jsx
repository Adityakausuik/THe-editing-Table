import { useCallback, useEffect, useRef, useState } from "react";

/**
 * HeroSectionVideo.jsx
 *
 * Implements continuous sequential video playback for the Hero Section:
 * Video 1 (IMG_2952.MOV) -> Video 2 (IMG_2953.MP4) -> Repeat infinitely.
 *
 * Requirements fulfilled:
 * - Loaded directly from static local path: /hero-section-video/
 * - Zero database queries or Neon API calls
 * - First video plays automatically on load
 * - When video 1 ends, video 2 plays automatically
 * - When video 2 ends, video 1 plays automatically in infinite loop
 * - Smooth crossfade transition with no black screen or lag
 * - Next video preloads metadata only to avoid downloading both full videos simultaneously
 * - muted, autoPlay, playsInline for universal browser autoplay compliance
 * - Graceful error handling
 */

const LOCAL_HERO_VIDEOS = [
  {
    id: "hero-video-1",
    name: "Hero Video 1",
    primarySrc: "/hero-section-video/IMG_2952.MOV",
    fallbackSrc: "/hero-section-video/hero-video-1.mp4",
    type: "video/mp4"
  },
  {
    id: "hero-video-2",
    name: "Hero Video 2",
    primarySrc: "/hero-section-video/IMG_2953.MP4",
    fallbackSrc: "/hero-section-video/hero-video-2.mp4",
    type: "video/mp4"
  }
];

export default function HeroSectionVideo({
  overlayOpacity = 0.42,
  className = ""
}) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const videoRef0 = useRef(null);
  const videoRef1 = useRef(null);
  const videoRefs = [videoRef0, videoRef1];

  // Advance to next video sequentially: 0 -> 1 -> 0 -> 1...
  const handleVideoEnded = useCallback((endedIndex) => {
    const nextIndex = (endedIndex + 1) % LOCAL_HERO_VIDEOS.length;
    const nextVideoEl = videoRefs[nextIndex]?.current;

    if (nextVideoEl) {
      try {
        nextVideoEl.currentTime = 0;
        const playPromise = nextVideoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("[HeroSectionVideo] Next video autoplay handled:", err);
          });
        }
      } catch (err) {
        console.warn("[HeroSectionVideo] Next video switch error:", err);
      }
    }

    setActiveVideoIndex(nextIndex);
  }, []);

  // Handle video error gracefully by trying fallback or advancing
  const handleVideoError = useCallback((failedIndex, e) => {
    console.warn(`[HeroSectionVideo] Video ${failedIndex} encountered error:`, e);
    const videoEl = videoRefs[failedIndex]?.current;
    const fallback = LOCAL_HERO_VIDEOS[failedIndex]?.fallbackSrc;

    // Try fallback source if different from current src
    if (videoEl && fallback && !videoEl.src.includes(fallback)) {
      videoEl.src = fallback;
      videoEl.load();
      videoEl.play().catch(() => handleVideoEnded(failedIndex));
    } else {
      // Advance to next video so playback continues uninterrupted
      handleVideoEnded(failedIndex);
    }
  }, [handleVideoEnded]);

  // Initial autoplay on mount and metadata preloading for the standby video
  useEffect(() => {
    const currentEl = videoRefs[activeVideoIndex]?.current;
    if (currentEl) {
      currentEl.muted = true;
      currentEl.defaultMuted = true;
      currentEl.playsInline = true;
      const playPromise = currentEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay was prevented by browser policy; user interaction will resume
        });
      }
    }

    // Preload next video's metadata so transition is instant
    const nextIndex = (activeVideoIndex + 1) % LOCAL_HERO_VIDEOS.length;
    const nextEl = videoRefs[nextIndex]?.current;
    if (nextEl) {
      nextEl.muted = true;
      nextEl.defaultMuted = true;
      nextEl.playsInline = true;
      nextEl.preload = "metadata";
    }
  }, [activeVideoIndex]);

  return (
    <div
      className={`hero-video-background-layer absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden"
      }}
      aria-hidden="true"
    >
      {LOCAL_HERO_VIDEOS.map((item, index) => {
        const isActive = activeVideoIndex === index;
        return (
          <video
            key={item.id}
            ref={videoRefs[index]}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 1 : 0,
              pointerEvents: "none"
            }}
            src={item.primarySrc}
            autoPlay={index === 0}
            muted
            defaultMuted
            playsInline
            preload={index === 0 ? "auto" : "metadata"}
            onEnded={() => handleVideoEnded(index)}
            onError={(e) => handleVideoError(index, e)}
          >
            <source src={item.primarySrc} type={item.type} />
            <source src={item.primarySrc} type="video/quicktime" />
            <source src={item.fallbackSrc} type="video/mp4" />
          </video>
        );
      })}

      {/* Adjustable Darkness Overlay for High Contrast Text Legibility */}
      <div
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300 z-10"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 1)",
          opacity: overlayOpacity
        }}
      />
    </div>
  );
}
