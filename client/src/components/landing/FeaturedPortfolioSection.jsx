import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { apiFetch, mediaUrl, subscribeToCmsChanges } from "../../lib/api.js";
import { getYouTubeId } from "../../utils/youtube.js";
import Container from "../ui/Container.jsx";

// Curated authentic fallback items matching the visual direction of the editorial mockup
const DEFAULT_FEATURED_PORTFOLIO = [
  {
    _id: "fp-1",
    id: "fp-1",
    title: "Cinematic Film Production",
    category: "Commercial Film",
    client: "Arri & Red RAW Cinema",
    coverImage: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    description: "4K RAW cinema camera post-production, multi-camera sync, pacing and DaVinci color grading.",
    isPublished: true,
    active: true,
    order: 1
  },
  {
    _id: "fp-2",
    id: "fp-2",
    title: "Royal Heritage Wedding",
    category: "Weddings",
    client: "Luxury Bridal Cinema",
    coverImage: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    description: "Heritage wedding editorial retouching, fine jewelry skin tone preservation, and cinematic color grade.",
    isPublished: true,
    active: true,
    order: 2
  },
  {
    _id: "fp-3",
    id: "fp-3",
    title: "Alpine River Expeditions",
    category: "Brand Campaign",
    client: "Outdoor Narrative Films",
    coverImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    description: "Aerial mountain cinematography, natural light color timing, dynamic HDR mastering and sound design.",
    isPublished: true,
    active: true,
    order: 3
  },
  {
    _id: "fp-4",
    id: "fp-4",
    title: "Artisanal Botanical Still",
    category: "Commercial",
    client: "Culinary & Beverage Brand",
    coverImage: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    description: "High-end product color refinement, glass reflection cleanup, and micro contrast calibration.",
    isPublished: true,
    active: true,
    order: 4
  },
  {
    _id: "fp-5",
    id: "fp-5",
    title: "The Glass House Estate",
    category: "Photography",
    client: "Architectural Retouching Suite",
    coverImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=85",
    videoUrl: "",
    description: "High-end photo editing and micro dodge-and-burn retouching for luxury architectural & editorial imagery.",
    isPublished: true,
    active: true,
    order: 5
  },
  {
    _id: "fp-6",
    id: "fp-6",
    title: "Amalfi Coast Editorial",
    category: "Fashion Film",
    client: "Creative Post-Production",
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    description: "High-fashion editorial color science, 35mm film emulation, and skin texture preservation.",
    isPublished: true,
    active: true,
    order: 6
  }
];

export default function FeaturedPortfolioSection() {
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  const sliderRef = useRef(null);
  const pauseTimerRef = useRef(null);

  // Fetch actual published portfolio items from Admin Portfolio CMS
  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/cms/portfolio");
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      // Filter for published & active items, sorted by order
      const published = list.filter((item) => item && item.isPublished !== false && item.active !== false);
      if (published.length > 0) {
        published.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setPortfolioItems(published);
      } else {
        setPortfolioItems(DEFAULT_FEATURED_PORTFOLIO);
      }
    } catch {
      // Safe offline fallback
      setPortfolioItems(DEFAULT_FEATURED_PORTFOLIO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();

    // Subscribe to live CMS changes via WebSocket
    const unsub = typeof subscribeToCmsChanges === "function"
      ? subscribeToCmsChanges((entity) => {
          if (!entity || entity === "portfolio" || entity === "PortfolioItem" || entity === "settings") {
            fetchPortfolio();
          }
        })
      : null;

    // Cross-tab synchronization via BroadcastChannel
    let channel;
    if (typeof BroadcastChannel === "function") {
      try {
        channel = new BroadcastChannel("editing-table-cms");
        channel.onmessage = (e) => {
          if (e.data?.key === "portfolio" || e.data?.module === "portfolio") {
            fetchPortfolio();
          }
        };
      } catch {
        // ignore
      }
    }

    return () => {
      if (typeof unsub === "function") unsub();
      if (channel) {
        try {
          channel.close();
        } catch {
          // ignore
        }
      }
    };
  }, [fetchPortfolio]);

  const items = useMemo(() => {
    return portfolioItems.length > 0 ? portfolioItems : DEFAULT_FEATURED_PORTFOLIO;
  }, [portfolioItems]);

  const totalItems = items.length;

  // Pause automatic rotation temporarily on user interaction
  const triggerInteractionPause = () => {
    setIsPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 7000);
  };

  // Scroll to a specific card index smoothly
  const scrollToIndex = useCallback((index) => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const cards = container.querySelectorAll(".portfolio-card");
    if (cards[index]) {
      const cardLeft = cards[index].offsetLeft;
      container.scrollTo({ left: cardLeft, behavior: "smooth" });
      setCurrentIndex(index);
    }
  }, []);

  // Slide navigation handlers
  const handlePrev = useCallback(() => {
    triggerInteractionPause();
    const prevIdx = (currentIndex - 1) < 0 ? totalItems - 1 : currentIndex - 1;
    scrollToIndex(prevIdx);
  }, [currentIndex, totalItems, scrollToIndex]);

  const handleNext = useCallback(() => {
    triggerInteractionPause();
    const nextIdx = (currentIndex + 1) >= totalItems ? 0 : currentIndex + 1;
    scrollToIndex(nextIdx);
  }, [currentIndex, totalItems, scrollToIndex]);

  // Automatic sequential slider rotation (every 4.5 seconds)
  useEffect(() => {
    if (isPaused || totalItems <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) >= totalItems ? 0 : prev + 1;
        if (sliderRef.current) {
          const cards = sliderRef.current.querySelectorAll(".portfolio-card");
          if (cards[next]) {
            sliderRef.current.scrollTo({ left: cards[next].offsetLeft, behavior: "smooth" });
          }
        }
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, totalItems]);

  // Sync index on manual user scroll/swipe
  const handleScroll = () => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const scrollLeft = container.scrollLeft;
    const cards = container.querySelectorAll(".portfolio-card");
    let closestIndex = 0;
    let minDiff = Infinity;
    cards.forEach((card, i) => {
      const diff = Math.abs(card.offsetLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });
    if (closestIndex !== currentIndex) {
      setCurrentIndex(closestIndex);
    }
  };

  // Compute pagination dots count (up to 4 dots)
  const paginationCount = Math.min(4, Math.max(1, totalItems));
  const activeDotIndex = currentIndex % paginationCount;

  return (
    <section
      id="portfolio"
      data-section="featured-portfolio"
      aria-label="Featured Portfolio Showcase"
      className="py-14 sm:py-18 lg:py-22 bg-[#F8FBF7] border-b border-[#E3ECE0]/70 overflow-hidden relative scroll-mt-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.4fr] xl:grid-cols-[1fr_2.6fr] items-center gap-8 sm:gap-10 lg:gap-10 xl:gap-12">
          {/* ================= LEFT SIDE: Content & Action ================= */}
          <div className="flex flex-col justify-center space-y-4 sm:space-y-5 max-w-lg lg:max-w-none">
            {/* Small label: FEATURED WORK */}
            <div className="flex items-center gap-3 select-none">
              <span className="h-[1px] w-6 sm:w-10 bg-[#CBD6C5]" aria-hidden="true" />
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#78866A]">
                FEATURED WORK
              </span>
              <span className="h-[1px] w-6 sm:w-10 bg-[#CBD6C5]" aria-hidden="true" />
            </div>

            {/* Main Heading: Stories We’ve Brought to Life */}
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-normal tracking-tight text-[#263D2D] leading-[1.18]">
              Stories We’ve Brought to Life
            </h2>

            {/* Description: A curated selection of our latest photo and video work — from brand films to cinematic campaigns. */}
            <p className="text-xs sm:text-sm text-[#777D76] leading-relaxed max-w-sm">
              A curated selection of our latest photo and video work — from brand films to cinematic campaigns.
            </p>

            {/* Green Explore Portfolio Button with Arrow */}
            <div className="pt-2">
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 rounded-full bg-[#263D2D] px-6 py-3 text-xs sm:text-[13px] font-medium text-white shadow-soft transition-all duration-200 hover:bg-[#1A2B20] hover:shadow-sage active:scale-[0.98] w-fit"
              >
                <span>Explore Portfolio</span>
                <ArrowRight className="h-3.5 w-3.5 stroke-[2.2]" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* ================= RIGHT SIDE: Horizontal Media Slider ================= */}
          <div className="relative w-full flex flex-col justify-center min-w-0">
            {/* Slider Stage with Arrow Navigation Buttons */}
            <div className="relative flex items-center gap-2 sm:gap-3 w-full">
              {/* Previous Slide Arrow Button */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous portfolio project"
                className="hidden sm:flex h-9 w-9 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-full border border-[#D5E0CF] bg-white/95 text-[#263D2D] shadow-xs backdrop-blur-sm transition-all duration-200 hover:bg-[#F2F7F0] hover:border-[#487D48] active:scale-95 cursor-pointer z-10"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2.4]" />
              </button>

              {/* Slider Viewport Window */}
              <div
                ref={sliderRef}
                onScroll={handleScroll}
                onTouchStart={triggerInteractionPause}
                className="w-full flex overflow-x-auto scroll-smooth no-scrollbar select-none snap-x snap-mandatory gap-3 sm:gap-3.5 lg:gap-4 py-1"
                style={{ scrollbarWidth: "none" }}
              >
                {items.map((item, idx) => {
                  const imageUrl = item.coverImage || item.image || item.thumbnail;
                  const hasVideo = Boolean(item.videoUrl);
                  const imageSrc = imageUrl ? mediaUrl(imageUrl) : DEFAULT_FEATURED_PORTFOLIO[idx % DEFAULT_FEATURED_PORTFOLIO.length].coverImage;

                  return (
                    <div
                      key={item._id || item.id || idx}
                      className="portfolio-card group relative shrink-0 snap-start w-[70%] xs:w-[55%] sm:w-[45%] md:w-[32%] lg:w-[calc(25%-12px)] xl:w-[calc(25%-12px)] transition-all duration-300"
                    >
                      {/* Elegant Rounded Rectangular Media Card (3:4 aspect ratio) */}
                      <div
                        onClick={() => {
                          if (hasVideo) {
                            setActiveVideoModal({
                              title: item.title,
                              videoUrl: item.videoUrl,
                              category: item.category
                            });
                          }
                        }}
                        className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl lg:rounded-3xl bg-[#E8EFE5] border border-[#E3ECE0] shadow-xs ${
                          hasVideo ? "cursor-pointer" : ""
                        }`}
                      >
                        {/* Media Image */}
                        <img
                          src={imageSrc}
                          alt={item.title || "Portfolio showcase project"}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = DEFAULT_FEATURED_PORTFOLIO[0].coverImage;
                          }}
                        />

                        {/* Subtle Editorial Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-75 transition-opacity duration-300" />

                        {/* Video Play Indicator Overlay at Bottom-Right */}
                        {hasVideo && (
                          <div
                            className="absolute bottom-3 right-3 sm:bottom-3.5 sm:right-3.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-black/40 border border-white/70 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-[#263D2D] group-hover:scale-110 shadow-soft"
                            aria-label="Play project video"
                          >
                            <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-white ml-0.5" />
                          </div>
                        )}

                        {/* Subtle Category & Title Badge on Hover/Mobile */}
                        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {item.category && (
                            <span className="inline-block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-white bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Next Slide Arrow Button */}
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next portfolio project"
                className="hidden sm:flex h-9 w-9 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-full border border-[#D5E0CF] bg-white/95 text-[#263D2D] shadow-xs backdrop-blur-sm transition-all duration-200 hover:bg-[#F2F7F0] hover:border-[#487D48] active:scale-95 cursor-pointer z-10"
              >
                <ChevronRight className="h-4 w-4 stroke-[2.4]" />
              </button>
            </div>

            {/* Mobile Arrow Controls (visible only on small mobile screens) */}
            <div className="flex sm:hidden items-center justify-between mt-3 px-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous portfolio project"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D5E0CF] bg-white text-[#263D2D] shadow-xs active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next portfolio project"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D5E0CF] bg-white text-[#263D2D] shadow-xs active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Pagination Indicators below the 4 cards */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-5 select-none" aria-hidden="true">
              {Array.from({ length: paginationCount }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    scrollToIndex(idx);
                    triggerInteractionPause();
                  }}
                  aria-label={`Jump to slide ${idx + 1}`}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                    activeDotIndex === idx
                      ? "w-5 sm:w-6 bg-[#263D2D]"
                      : "w-1.5 sm:w-2 bg-[#CBD6C5] hover:bg-[#78866A]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>

      {/* ================= VIDEO LIGHTBOX MODAL ================= */}
      {activeVideoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveVideoModal(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title & Close Button */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 inset-x-0 z-10">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C8D8BE]">
                  {activeVideoModal.category || "Featured Portfolio"}
                </p>
                <h3 className="text-sm sm:text-base font-heading font-medium text-white truncate max-w-md">
                  {activeVideoModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                aria-label="Close video player"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-[16/9] w-full bg-black flex items-center justify-center">
              {getYouTubeId(activeVideoModal.videoUrl) ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(activeVideoModal.videoUrl)}?autoplay=1&playsinline=1`}
                  title={activeVideoModal.title || "Portfolio Video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : (
                <video
                  src={mediaUrl(activeVideoModal.videoUrl)}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
