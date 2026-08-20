/* global clearTimeout */
import { AnimatePresence, m } from "framer-motion";
import {
  ArrowRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  Sparkles,
  X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, mediaUrl, subscribeToCmsChanges } from "../../lib/api.js";
import Container from "../ui/Container.jsx";

const DEFAULT_PHOTOS = [
  {
    _id: "demo-p1",
    title: "Château de Provence Twilight Vows",
    slug: "chateau-de-provence-twilight-vows",
    description: "High-end wedding color grading, RAW frame restoration, and skin tone balancing for luxury editorial wedding photography.",
    propertyName: "Château de Provence",
    location: "Provence • France",
    category: "Wedding Post-Production",
    image: { url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Wedding Post-Production",
    ctaText: "View Retouching Details",
    ctaUrl: "/portfolio",
    order: 1
  },
  {
    _id: "demo-p2",
    title: "Tuscan Estate Fine-Art Portraiture",
    slug: "tuscan-estate-fine-art-portraiture",
    description: "Haute-couture portrait retouching, micro dodge & burn, and 35mm film color science.",
    propertyName: "Tuscan Estate Atelier",
    location: "Florence • Italy",
    category: "Luxury Retouching",
    image: { url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Luxury Retouching",
    ctaText: "Request Retouching",
    ctaUrl: "/contactus",
    order: 2
  },
  {
    _id: "demo-p3",
    title: "The Glass House Architectural Masterpiece",
    slug: "the-glass-house-architectural-masterpiece",
    description: "Bespoke architectural photo editing, window blend retouching, and HDR geometry correction.",
    propertyName: "The Glass House",
    location: "Malibu • California",
    category: "Photo Editing & Crop",
    image: { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Masterpiece Heritage",
    ctaText: "Explore Portfolio",
    ctaUrl: "/portfolio",
    order: 3
  },
  {
    _id: "demo-p4",
    title: "Amalfi Coast Editorial Reception",
    slug: "amalfi-coast-editorial-reception",
    description: "Filmic color grading, shadow detail recovery, and highlight softness enhancement.",
    propertyName: "Villa Solaria",
    location: "Amalfi Coast • Italy",
    category: "High-End Color Grading",
    image: { url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Color Science",
    ctaText: "Book Color Suite",
    ctaUrl: "/services",
    order: 4
  },
  {
    _id: "demo-p5",
    title: "Lake Como Villa Twilight Vows",
    slug: "lake-como-villa-twilight-vows",
    description: "Sunset ambient color correction, noise reduction, and fine-art detail enhancement.",
    propertyName: "Villa d'Este",
    location: "Lake Como • Italy",
    category: "Detail Enhancement",
    image: { url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Detail Enhancement",
    ctaText: "Inquire Photo Suite",
    ctaUrl: "/contactus",
    order: 5
  }
];

const DEFAULT_SETTINGS = {
  heading: "Masterpiece High-End Photo Retouching & Color Suite",
  subheading:
    "Bespoke wedding photography retouching, high-end editorial photo refinement, and luxury portfolio color science crafted for studios worldwide.",
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
  cardRadius: 24,
  showArrows: true,
  showPagination: true,
  ctaText: "Explore Full Gallery",
  ctaUrl: "/portfolio",
  ctaVisible: true,
  ctaNewTab: false,
  anchorId: "photo-showcase"
};

export default function PhotoShowcaseSection() {
  const [photos, setPhotos] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeIndex, setActiveIndex] = useState(2); // Center active index
  const [lightboxImage, setLightboxImage] = useState(null);

  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const sectionRef = useRef(null);
  const autoplayTimerRef = useRef(null);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isTabVisibleRef = useRef(true);

  // Dynamic settings extraction
  const autoplayEnabled = settings?.autoplay ?? true;
  const autoplayDelay = Number(settings?.autoplayDelay) || 5000;
  const infiniteLoop = settings?.infiniteLoop ?? true;
  const pauseOnHover = settings?.pauseOnHover ?? true;

  const displayPhotos = Array.isArray(photos) && photos.length > 0 ? photos : DEFAULT_PHOTOS;

  const fetchSectionData = useCallback(async () => {
    try {
      const [pData, sData] = await Promise.all([
        apiFetch("/api/v1/photo-showcase").catch(() => null),
        apiFetch("/api/v1/photo-showcase/settings").catch(() => null)
      ]);

      const activeList = Array.isArray(pData?.data) && pData.data.length > 0 ? pData.data : DEFAULT_PHOTOS;
      setPhotos(activeList);
      setActiveIndex(Math.floor(activeList.length / 2));

      if (sData?.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...sData.data });
      }
    } catch {
      setPhotos(DEFAULT_PHOTOS);
      setActiveIndex(2);
    }
  }, []);

  useEffect(() => {
    fetchSectionData();
    const unsubscribe = subscribeToCmsChanges((detail) => {
      if (detail?.key === "photo-showcase" || detail?.key === "settings") {
        fetchSectionData();
      }
    });
    return () => unsubscribe();
  }, [fetchSectionData]);

  // ----------------------------------------------------
  // AUTOPLAY CONTROLS
  // ----------------------------------------------------
  const clearAutoplayTimer = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const goToNextSlide = useCallback(() => {
    if (displayPhotos.length < 2) return;

    setActiveIndex((currentIndex) => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= displayPhotos.length) {
        return infiniteLoop ? 0 : currentIndex;
      }
      return nextIndex;
    });
  }, [displayPhotos.length, infiniteLoop]);

  const startAutoplay = useCallback(() => {
    clearAutoplayTimer();

    if (
      !autoplayEnabled ||
      displayPhotos.length < 2 ||
      isHoveredRef.current ||
      isDraggingRef.current ||
      !isTabVisibleRef.current ||
      lightboxImage !== null
    ) {
      return;
    }

    autoplayTimerRef.current = setTimeout(() => {
      goToNextSlide();
    }, autoplayDelay);
  }, [
    autoplayEnabled,
    autoplayDelay,
    displayPhotos.length,
    goToNextSlide,
    clearAutoplayTimer,
    lightboxImage
  ]);

  useEffect(() => {
    startAutoplay();
    return clearAutoplayTimer;
  }, [activeIndex, startAutoplay, clearAutoplayTimer]);

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

  // Navigation Handlers
  const handlePrevious = useCallback(() => {
    clearAutoplayTimer();
    setActiveIndex((currentIndex) =>
      currentIndex === 0
        ? infiniteLoop
          ? displayPhotos.length - 1
          : 0
        : currentIndex - 1
    );
  }, [displayPhotos.length, infiniteLoop, clearAutoplayTimer]);

  const handleNext = useCallback(() => {
    clearAutoplayTimer();
    goToNextSlide();
  }, [goToNextSlide, clearAutoplayTimer]);

  const handleCardClick = (targetIndex, photo) => {
    clearAutoplayTimer();
    if (targetIndex === activeIndex) {
      setLightboxImage(photo);
    } else {
      setActiveIndex(targetIndex);
    }
  };

  // Hover Handlers
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

  // Touch Handlers
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

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "Escape") setLightboxImage(null);
  };

  if (settings.showSection === false) return null;

  const slots = [-2, -1, 0, 1, 2];
  const totalItems = displayPhotos.length;

  return (
    <section
      ref={sectionRef}
      id={settings.anchorId || "photo-showcase"}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnterContainer}
      onMouseLeave={handleMouseLeaveContainer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Scroll-Stopping Photo Showcase"
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
            <Camera className="h-3.5 w-3.5 text-site" /> Photo Retouching &amp; Color Grading
          </div>

          <h2
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight tracking-tight"
            style={{ color: "var(--site-text-color)" }}
          >
            {settings.heading || "Masterpiece High-End Photo Retouching & Color Suite"}
          </h2>

          {settings.showSubheading && (
            <p
              className="text-sm sm:text-base leading-relaxed font-normal max-w-2xl mx-auto"
              style={{ color: "var(--site-text-color)" }}
            >
              {settings.subheading ||
                "Bespoke architectural imagery, high-end editorial photo retouching, and luxury property portfolios crafted with precision."}
            </p>
          )}
        </div>

        {/* 5-Card Vertical Photo Showcase Layout */}
        <div className="relative flex items-center justify-center min-h-[520px] sm:min-h-[580px] px-2 sm:px-4">
          {/* Arrow Navigation */}
          {settings.showArrows && (
            <>
              <button
                type="button"
                onClick={handlePrevious}
                aria-label="Previous Photo"
                className="absolute left-2 sm:left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-sage-border bg-white text-forest shadow-editorial transition-all duration-300 hover:border-[rgb(72,125,72)] hover:bg-[rgb(72,125,72)] hover:text-white hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next Photo"
                className="absolute right-2 sm:right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-sage-border bg-white text-forest shadow-editorial transition-all duration-300 hover:border-[rgb(72,125,72)] hover:bg-[rgb(72,125,72)] hover:text-white hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Cards Flex Container with Symmetric 5-Slot Infinite Wrapping */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 w-full overflow-visible py-4">
            {slots.map((offset) => {
              const photoIndex = (activeIndex + offset + totalItems * 100) % totalItems;
              const photo = displayPhotos[photoIndex];
              if (!photo) return null;

              const isCenter = offset === 0;
              const isMedium = Math.abs(offset) === 1;
              const isSmall = Math.abs(offset) === 2;

              const hideOnMobile = Math.abs(offset) > 0 ? "hidden md:flex" : "flex";
              const hideOnTablet = Math.abs(offset) > 1 ? "hidden lg:flex" : "";

              const imageSrc = mediaUrl(photo.image?.url || photo.image);

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
                  key={`${photo._id || photoIndex}-${offset}`}
                  layout
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  onClick={() => handleCardClick(photoIndex, photo)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleCardClick(photoIndex, photo);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={isCenter ? `Open ${photo.title || "photo"}` : `Show ${photo.title || "photo"}`}
                  style={{ borderRadius: `${settings.cardRadius || 24}px` }}
                  className={`group relative overflow-hidden bg-forest flex-col justify-between transition-all duration-500 shrink-0 ${cardHeightClass} ${hideOnMobile} ${hideOnTablet}`}
                >
                  {/* Photo Display */}
                  <img
                    src={imageSrc}
                    alt={photo.image?.altText || photo.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/20 to-transparent opacity-80 group-hover:opacity-70 transition-opacity" />

                  {/* Top Card Badges */}
                  <div className="relative z-10 p-4 flex items-center justify-between w-full">
                    {photo.badgeText && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-forest/70 backdrop-blur-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-soft">
                        <Sparkles className="h-3 w-3 text-site" />
                        {photo.badgeText}
                      </span>
                    )}

                    {isCenter && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage(photo);
                        }}
                        aria-label="Zoom Photo"
                        className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-forest/60 text-white backdrop-blur-md transition hover:border-[rgb(72,125,72)] hover:bg-[rgb(72,125,72)] active:scale-95"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Center Icon Overlay */}
                  <div className="relative z-10 my-auto flex items-center justify-center">
                    <div
                      className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border border-white/40 bg-white/20 backdrop-blur-md text-white shadow-deep transition-all duration-300 ${
                        isCenter
                          ? "group-hover:scale-110 group-hover:bg-[rgb(72,125,72)] group-hover:border-[rgb(72,125,72)]"
                          : "group-hover:scale-105 group-hover:bg-white/40"
                      }`}
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  {/* Bottom Photo Metadata */}
                  <div className="relative z-10 p-5 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#C8D8BE]">
                      {photo.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-site" />
                          {photo.location}
                        </span>
                      )}
                    </div>

                    <h3 className={`font-serif font-semibold text-white leading-tight ${isCenter ? "text-xl sm:text-2xl" : "text-base"}`}>
                      {photo.propertyName || photo.title}
                    </h3>

                    {isCenter && photo.description && (
                      <p className="text-xs text-white/80 line-clamp-2 leading-relaxed font-normal">
                        {photo.description}
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
            {displayPhotos.map((p, idx) => (
              <button
                key={p._id || idx}
                type="button"
                onClick={() => handleCardClick(idx, p)}
                aria-label={`Go to photo slide ${idx + 1}`}
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
              className="group inline-flex min-h-[50px] items-center justify-center gap-3 rounded-full bg-[rgb(72,125,72)] px-8 py-3.5 text-sm font-semibold text-white shadow-soft transition-all duration-300 hover:bg-[#7C9B69] hover:shadow-sage active:scale-[0.98]"
            >
              <span>{settings.ctaText || "Explore Full Gallery"}</span>
              <ArrowRight className="h-4 w-4 text-white transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </Container>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest/90 p-4 backdrop-blur-md"
            onClick={() => setLightboxImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${lightboxImage.title} photo viewer`}
          >
            <div
              className="relative max-w-4xl w-full rounded-3xl overflow-hidden border border-white/20 bg-forest p-2 shadow-deep"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                aria-label="Close photo viewer"
                className="absolute top-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-[rgb(72,125,72)]"
              >
                <X className="h-5 w-5" />
              </button>

              <img
                src={mediaUrl(lightboxImage.image?.url || lightboxImage.image)}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-full object-contain rounded-2xl"
              />

              <div className="p-5 text-left space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-site">
                  {lightboxImage.category}
                </span>
                <h3 className="font-serif text-2xl text-white font-semibold">{lightboxImage.title}</h3>
                <p className="text-xs text-white/80">{lightboxImage.description}</p>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}
