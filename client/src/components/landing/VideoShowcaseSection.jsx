/* global clearTimeout */
import { m } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Film,
  MapPin,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, mediaUrl, subscribeToCmsChanges } from "../../lib/api.js";
import Container from "../ui/Container.jsx";

const DEFAULT_VIDEOS = [
  {
    _id: "demo-v1",
    title: "Villa Belle Époque Walkthrough",
    slug: "villa-belle-epoque-walkthrough",
    description: "Cinematic 4K architectural walkthrough of a historic luxury estate on the French Riviera.",
    propertyName: "Villa Belle Époque",
    location: "Cannes • French Riviera",
    category: "Real Estate & Architecture",
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" },
    duration: 45,
    badgeText: "Featured Luxury Estate",
    ctaText: "Inquire Property Film",
    ctaUrl: "/contactus",
    order: 1
  },
  {
    _id: "demo-v2",
    title: "The Penthouse at 432 Park",
    slug: "the-penthouse-at-432-park",
    description: "High-contrast editorial film showcasing panoramic skyline views and custom interior finishes.",
    propertyName: "The Sky Penthouse",
    location: "Manhattan • New York",
    category: "Real Estate & Architecture",
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80" },
    duration: 38,
    badgeText: "High-Rise Penthouse",
    ctaText: "Book Video Edit",
    ctaUrl: "/contactus",
    order: 2
  },
  {
    _id: "demo-v3",
    title: "Château de Montclare Aerial Showcase",
    slug: "chateau-de-montclare-aerial-showcase",
    description: "Dramatic FPV drone cinematography across 200 acres of vineyards and private gardens.",
    propertyName: "Château de Montclare",
    location: "Bordeaux • France",
    category: "Drone & Aerial Films",
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" },
    duration: 60,
    badgeText: "Masterpiece Aerial",
    ctaText: "View Case Study",
    ctaUrl: "/portfolio",
    order: 3
  },
  {
    _id: "demo-v4",
    title: "Minimalist Modern Residence",
    slug: "minimalist-modern-residence",
    description: "Sleek architectural lighting study highlighting glass, concrete, and organic timber elements.",
    propertyName: "The Glass Pavilion",
    location: "Beverly Hills • Los Angeles",
    category: "Architectural Design",
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80" },
    duration: 52,
    badgeText: "Modern Architecture",
    ctaText: "Request Quote",
    ctaUrl: "/contactus",
    order: 4
  },
  {
    _id: "demo-v5",
    title: "Amalfi Coastal Haven Estate",
    slug: "amalfi-coastal-haven-estate",
    description: "Sun-drenched editorial property reel designed for luxury Mediterranean real estate marketing.",
    propertyName: "Cliffside Villa Amalfi",
    location: "Positano • Italy",
    category: "Luxury Destination",
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80" },
    duration: 42,
    badgeText: "Coastal Sanctuary",
    ctaText: "Explore Suite",
    ctaUrl: "/services",
    order: 5
  }
];

const DEFAULT_SETTINGS = {
  heading: "We Turn Your Raw Footage Into Stories Worth Watching",
  subheading:
    "From cinematic wedding films and emotional highlights to brand campaigns, reels, and professional post-production — The Editing Table transforms every frame into a polished visual experience designed to connect, engage, and leave a lasting impression.",
  showSection: true,
  showSubheading: true,
  alignment: "center",
  headingColor: "var(--site-text-color)",
  textColor: "var(--site-text-color)",
  backgroundColor: "#F8FBF7",
  sectionPaddingTop: 80,
  sectionPaddingBottom: 80,
  maxWidth: 1440,
  autoplay: true,
  autoplayDelay: 5000,
  infiniteLoop: true,
  pauseOnHover: true,
  hoverPlayback: true,
  centerAutoplay: true,
  enableParallax: true,
  animationDuration: 0.8,
  cardRadius: 24,
  cardGap: 20,
  shadowIntensity: 1,
  showArrows: true,
  showPagination: true,
  ctaText: "Explore Our Portfolio",
  ctaUrl: "/portfolio",
  ctaVisible: true,
  ctaNewTab: false,
  anchorId: "video-showcase"
};

function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function VideoShowcaseSection() {
  const [videos, setVideos] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeIndex, setActiveIndex] = useState(2); // Center card index
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const sectionRef = useRef(null);
  const videoRefs = useRef({});

  // ----------------------------------------------------
  // AUTOPLAY REFS
  // ----------------------------------------------------
  const autoplayTimerRef = useRef(null);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isTabVisibleRef = useRef(true);
  const isManualSoundRef = useRef(false);

  // Read autoplay values dynamically with safe defaults
  const autoplayEnabled = settings?.autoplay ?? true;
  const autoplayDelay = Number(settings?.autoplayDelay) || 5000;
  const infiniteLoop = settings?.infiniteLoop ?? true;
  const pauseOnHover = settings?.pauseOnHover ?? true;

  const displayVideos = Array.isArray(videos) && videos.length > 0 ? videos : DEFAULT_VIDEOS;
  const currentVideo = displayVideos[activeIndex % displayVideos.length] || displayVideos[0];

  const fetchSectionData = useCallback(async () => {
    try {
      const [vData, sData] = await Promise.all([
        apiFetch("/api/v1/video-showcase").catch(() => null),
        apiFetch("/api/v1/video-showcase/settings").catch(() => null)
      ]);

      const activeList = Array.isArray(vData?.data) && vData.data.length > 0 ? vData.data : DEFAULT_VIDEOS;
      setVideos(activeList);
      setActiveIndex(Math.floor(activeList.length / 2));

      if (sData?.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...sData.data });
      }
    } catch {
      setVideos(DEFAULT_VIDEOS);
      setActiveIndex(2);
    }
  }, []);

  useEffect(() => {
    fetchSectionData();
    const unsubscribe = subscribeToCmsChanges((detail) => {
      if (detail?.key === "video-showcase" || detail?.key === "settings") {
        fetchSectionData();
      }
    });
    return () => unsubscribe();
  }, [fetchSectionData]);

  // ----------------------------------------------------
  // PRO STABLE AUTOPLAY TIMER CONTROLS
  // ----------------------------------------------------
  const clearAutoplayTimer = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const goToNextSlide = useCallback(() => {
    if (displayVideos.length < 2) return;

    setActiveIndex((currentIndex) => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= displayVideos.length) {
        return infiniteLoop ? 0 : currentIndex;
      }
      return nextIndex;
    });
  }, [displayVideos.length, infiniteLoop]);

  const startAutoplay = useCallback(() => {
    clearAutoplayTimer();

    if (
      !autoplayEnabled ||
      displayVideos.length < 2 ||
      isHoveredRef.current ||
      isDraggingRef.current ||
      !isTabVisibleRef.current ||
      isManualSoundRef.current
    ) {
      return;
    }

    autoplayTimerRef.current = setTimeout(() => {
      goToNextSlide();
    }, autoplayDelay);
  }, [
    autoplayEnabled,
    autoplayDelay,
    displayVideos.length,
    goToNextSlide,
    clearAutoplayTimer
  ]);

  // Restart timer whenever activeIndex or settings change
  useEffect(() => {
    startAutoplay();
    return clearAutoplayTimer;
  }, [activeIndex, startAutoplay, clearAutoplayTimer]);

  // Handle browser tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;

      if (document.hidden) {
        clearAutoplayTimer();
      } else {
        startAutoplay();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [startAutoplay, clearAutoplayTimer]);

  // Pause videos when scrolled out of viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            Object.values(videoRefs.current).forEach((el) => {
              if (el && typeof el.pause === "function") el.pause();
            });
            setIsPlaying(false);
          } else if (settings.centerAutoplay) {
            setIsPlaying(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [settings.centerAutoplay]);

  // Track impression for center active video
  useEffect(() => {
    if (currentVideo?._id && !currentVideo._id.startsWith("demo-")) {
      apiFetch(`/api/v1/video-showcase/${currentVideo._id}/impression`, { method: "POST" }).catch(() => {});
    }
  }, [currentVideo?._id]);

  // ----------------------------------------------------
  // NAVIGATION HANDLERS
  // ----------------------------------------------------
  const handlePrevious = useCallback(() => {
    clearAutoplayTimer();
    setActiveIndex((currentIndex) =>
      currentIndex === 0
        ? infiniteLoop
          ? displayVideos.length - 1
          : 0
        : currentIndex - 1
    );
    setIsPlaying(true);
  }, [displayVideos.length, infiniteLoop, clearAutoplayTimer]);

  const handleNext = useCallback(() => {
    clearAutoplayTimer();
    goToNextSlide();
    setIsPlaying(true);
  }, [goToNextSlide, clearAutoplayTimer]);

  const handleCardClick = (targetIndex, video) => {
    clearAutoplayTimer();
    if (targetIndex === activeIndex) {
      setIsPlaying((prev) => !prev);
      if (video?._id && !video._id.startsWith("demo-")) {
        apiFetch(`/api/v1/video-showcase/${video._id}/play`, { method: "POST" }).catch(() => {});
      }
    } else {
      setActiveIndex(targetIndex);
      setIsPlaying(true);
    }
  };

  // Hover handlers
  const handleMouseEnterContainer = () => {
    if (pauseOnHover) {
      isHoveredRef.current = true;
      clearAutoplayTimer();
    }
  };

  const handleMouseLeaveContainer = () => {
    isHoveredRef.current = false;
    startAutoplay();
  };

  // Touch & Drag handlers
  const handleTouchStart = (e) => {
    isDraggingRef.current = true;
    clearAutoplayTimer();
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    if (touchStart && touchEnd) {
      const distance = touchStart - touchEnd;
      if (distance > 50) handleNext();
      else if (distance < -50) handlePrevious();
    }
    setTouchStart(0);
    setTouchEnd(0);
    startAutoplay();
  };

  const handleToggleSound = (e) => {
    e.stopPropagation();
    setIsMuted((prevMuted) => {
      const nextMuted = !prevMuted;
      isManualSoundRef.current = !nextMuted;
      if (!nextMuted) {
        clearAutoplayTimer();
      } else {
        startAutoplay();
      }
      return nextMuted;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === " ") {
      e.preventDefault();
      setIsPlaying((p) => !p);
    }
  };

  if (settings.showSection === false) return null;

  // Render 5 slots symmetrically: [-2, -1, 0, 1, 2] around activeIndex
  const slots = [-2, -1, 0, 1, 2];
  const totalItems = displayVideos.length;

  return (
    <section
      ref={sectionRef}
      id={settings.anchorId || "video-showcase"}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnterContainer}
      onMouseLeave={handleMouseLeaveContainer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Scroll-Stopping Video Showcase"
      className="relative overflow-hidden transition-colors duration-500 select-none outline-none border-t border-sage-border/60"
      style={{
        backgroundColor: settings.backgroundColor || "#F8FBF7",
        paddingTop: `${settings.sectionPaddingTop || 80}px`,
        paddingBottom: `${settings.sectionPaddingBottom || 80}px`
      }}
    >
      {/* Soft Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(200,216,190,0.35)_0%,rgba(143,174,123,0.08)_50%,transparent_75%)] blur-3xl pointer-events-none -z-10" />

      <Container className="space-y-12 max-w-[1440px] mx-auto">
        {/* Dynamic Section Header */}
        <div
          className={`space-y-3 max-w-3xl ${
            settings.alignment === "left"
              ? "text-left mr-auto"
              : settings.alignment === "right"
              ? "text-right ml-auto"
              : "text-center mx-auto"
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-site shadow-soft">
            <Film className="h-3.5 w-3.5 text-site" /> Creative Post-Production &amp; Visual Storytelling
          </div>

          <h2
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight tracking-tight"
            style={{ color: "var(--site-text-color)" }}
          >
            {settings.heading || DEFAULT_SETTINGS.heading}
          </h2>

          {settings.showSubheading && (
            <p
              className="text-sm sm:text-base leading-relaxed font-normal max-w-2xl mx-auto"
              style={{ color: "var(--site-text-color)" }}
            >
              {(settings.subheading || DEFAULT_SETTINGS.subheading) === DEFAULT_SETTINGS.subheading ? (
                <>
                  From cinematic wedding films and emotional highlights to brand campaigns, reels, and professional post-production —{" "}
                  <strong className="font-semibold">The Editing Table</strong> transforms every frame into a polished visual experience designed to connect, engage, and leave a lasting impression.
                </>
              ) : (
                settings.subheading
              )}
            </p>
          )}

          <p className="mx-auto max-w-3xl text-xs font-semibold uppercase leading-6 tracking-[0.12em] text-site sm:text-sm">
            Wedding Films <span aria-hidden="true">•</span> Reels <span aria-hidden="true">•</span> Brand Videos <span aria-hidden="true">•</span> Color Grading <span aria-hidden="true">•</span> Photo Editing <span aria-hidden="true">•</span> Post-Production
          </p>
        </div>

        {/* 5-Card Vertical Video Showcase Layout */}
        <div className="relative flex items-center justify-center min-h-[520px] sm:min-h-[580px] px-2 sm:px-4">
          {/* Arrow Navigation (Desktop/Tablet) */}
          {settings.showArrows && (
            <>
              <button
                type="button"
                onClick={handlePrevious}
                aria-label="Previous Video"
                className="absolute left-2 sm:left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-sage-border bg-white text-forest shadow-editorial transition-all duration-300 hover:border-[rgb(72,125,72)] hover:bg-[rgb(72,125,72)] hover:text-white hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next Video"
                className="absolute right-2 sm:right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-sage-border bg-white text-forest shadow-editorial transition-all duration-300 hover:border-[rgb(72,125,72)] hover:bg-[rgb(72,125,72)] hover:text-white hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Cards Flex Container with Symmetric 5-Slot Infinite Wrapping */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 w-full overflow-visible py-4">
            {slots.map((offset) => {
              const videoIndex = (activeIndex + offset + totalItems * 100) % totalItems;
              const video = displayVideos[videoIndex];
              if (!video) return null;

              const isCenter = offset === 0;
              const isMedium = Math.abs(offset) === 1;
              const isSmall = Math.abs(offset) === 2;

              // Hide outer cards on small screens
              const hideOnMobile = Math.abs(offset) > 0 ? "hidden md:flex" : "flex";
              const hideOnTablet = Math.abs(offset) > 1 ? "hidden lg:flex" : "";

              const videoSrc = mediaUrl(video.videoFile?.url || video.videoUrl);
              const thumbSrc = mediaUrl(video.thumbnail?.url || video.thumbnail);
              const isHovered = hoveredIndex === videoIndex;

              // Responsive Card Styling & Scale Hierarchy
              let cardHeightClass =
                "h-[500px] sm:h-[540px] w-[280px] sm:w-[320px] z-20 scale-100 opacity-100 shadow-deep border-2 border-[rgb(72,125,72)]";
              if (isMedium) {
                cardHeightClass =
                  "h-[380px] sm:h-[420px] w-[220px] sm:w-[260px] z-10 scale-95 opacity-85 shadow-soft border border-sage-border cursor-pointer hover:opacity-100";
              } else if (isSmall) {
                cardHeightClass =
                  "h-[300px] sm:h-[340px] w-[180px] sm:w-[210px] z-0 scale-90 opacity-60 shadow-soft border border-sage-border/60 cursor-pointer hover:opacity-90";
              }

              return (
                <m.div
                  key={`${video._id || videoIndex}-${offset}`}
                  layout
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  onMouseEnter={() => setHoveredIndex(videoIndex)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => handleCardClick(videoIndex, video)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleCardClick(videoIndex, video);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={isCenter ? `Play or pause ${video.title || "video"}` : `Show ${video.title || "video"}`}
                  style={{ borderRadius: `${settings.cardRadius || 24}px` }}
                  className={`group relative overflow-hidden bg-forest flex-col justify-between transition-all duration-500 shrink-0 ${cardHeightClass} ${hideOnMobile} ${hideOnTablet}`}
                >
                  {/* Poster Image Thumbnail */}
                  <img
                    src={thumbSrc}
                    alt={video.thumbnail?.altText || video.title}
                    loading="lazy"
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                      isCenter && isPlaying ? "opacity-0 pointer-events-none" : "opacity-100 group-hover:scale-105"
                    }`}
                  />

                  {/* HTML5 Video element for center active or hovered video */}
                  {(isCenter || isHovered) && videoSrc && (
                    <video
                      ref={(el) => (videoRefs.current[video._id || videoIndex] = el)}
                      src={videoSrc}
                      poster={thumbSrc}
                      playsInline
                      muted={isMuted}
                      loop={video.loop !== false}
                      autoPlay={isCenter && settings.centerAutoplay}
                      className="absolute inset-0 h-full w-full object-cover"
                      onEnded={() => {
                        if (isCenter && !video._id.startsWith("demo-")) {
                          apiFetch(`/api/v1/video-showcase/${video._id}/complete`, { method: "POST" }).catch(() => {});
                        }
                      }}
                    />
                  )}

                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/20 to-transparent opacity-80 group-hover:opacity-70 transition-opacity" />

                  {/* Top Card Badges */}
                  <div className="relative z-10 p-4 flex items-center justify-between w-full">
                    {video.badgeText && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-forest/70 backdrop-blur-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-soft">
                        <Sparkles className="h-3 w-3 text-site" />
                        {video.badgeText}
                      </span>
                    )}

                    {isCenter && (
                      <button
                        type="button"
                        onClick={handleToggleSound}
                        aria-label={isMuted ? "Unmute Video" : "Mute Video"}
                        className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-forest/60 text-white backdrop-blur-md transition hover:border-[rgb(72,125,72)] hover:bg-[rgb(72,125,72)] active:scale-95"
                      >
                        {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Center Play Button Overlay */}
                  <div className="relative z-10 my-auto flex items-center justify-center">
                    <div
                      className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border border-white/40 bg-white/20 backdrop-blur-md text-white shadow-deep transition-all duration-300 ${
                        isCenter
                          ? "group-hover:scale-110 group-hover:bg-[rgb(72,125,72)] group-hover:border-[rgb(72,125,72)]"
                          : "group-hover:scale-105 group-hover:bg-white/40"
                      }`}
                    >
                      {isCenter && isPlaying ? (
                        <Pause className="h-6 w-6 text-white fill-white" />
                      ) : (
                        <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Bottom Video Metadata */}
                  <div className="relative z-10 p-5 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#C8D8BE]">
                      {video.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-site" />
                          {video.location}
                        </span>
                      )}
                      {video.duration > 0 && <span>• {formatDuration(video.duration)}</span>}
                    </div>

                    <h3 className={`font-heading font-semibold text-white leading-tight ${isCenter ? "text-xl sm:text-2xl" : "text-base"}`}>
                      {video.propertyName || video.title}
                    </h3>

                    {isCenter && video.description && (
                      <p className="text-xs text-white/80 line-clamp-2 leading-relaxed font-normal">
                        {video.description}
                      </p>
                    )}
                  </div>
                </m.div>
              );
            })}
          </div>
        </div>

        {/* Pagination Dots Indicator */}
        {settings.showPagination && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {displayVideos.map((v, idx) => (
              <button
                key={v._id || idx}
                type="button"
                onClick={() => handleCardClick(idx, v)}
                aria-label={`Go to video slide ${idx + 1}`}
                aria-current={idx === activeIndex ? "true" : undefined}
                className="group flex h-11 min-w-11 items-center justify-center rounded-full"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    idx === activeIndex ? "w-8 bg-[rgb(72,125,72)]" : "w-2 bg-sage-light/60 group-hover:bg-[rgb(72,125,72)]/60"
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        )}

        {/* Bottom CTA Button */}
        {settings.ctaVisible && (
          <div className="pt-4 flex justify-center">
            <Link
              to={settings.ctaUrl || "/portfolio"}
              target={settings.ctaNewTab ? "_blank" : undefined}
              rel={settings.ctaNewTab ? "noopener noreferrer" : undefined}
              onClick={() => {
                if (currentVideo?._id && !currentVideo._id.startsWith("demo-")) {
                  apiFetch(`/api/v1/video-showcase/${currentVideo._id}/cta-click`, { method: "POST" }).catch(() => {});
                }
              }}
              className="group inline-flex min-h-[50px] items-center justify-center gap-3 rounded-full bg-[rgb(72,125,72)] px-8 py-3.5 text-sm font-semibold text-white shadow-soft transition-all duration-300 hover:bg-[#7C9B69] hover:shadow-sage active:scale-[0.98]"
            >
              <span>{settings.ctaText || "Explore Our Portfolio"}</span>
              <ArrowRight className="h-4 w-4 text-white transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
