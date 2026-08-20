import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { FALLBACK_MEDIA_URL, mediaUrl } from "../../lib/api.js";

export default function EditorialHeroSlider({
  currentSlide,
  currentIndex = 0,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) {
  const shouldReduceMotion = useReducedMotion();

  if (!currentSlide) return null;

  const rawImages = currentSlide.images || currentSlide.imageGrid || [];
  const slideImages = Array.isArray(rawImages)
    ? rawImages
    : (typeof rawImages === "string" ? [rawImages] : []);
  const slideType = currentSlide.slideType || "ceo";

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 1.015, y: shouldReduceMotion ? 0 : 8 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.7,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: shouldReduceMotion ? 0 : 0.08
      }
    },
    exit: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.985,
      y: shouldReduceMotion ? 0 : -8,
      transition: { duration: shouldReduceMotion ? 0 : 0.4 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label="Hero Luxury Editorial Showcase Carousel"
      role="region"
      className="relative w-full max-w-xl mx-auto rounded-3xl border border-sage-border/70 bg-sage-card/70 p-3.5 sm:p-5 shadow-editorial backdrop-blur-md transition-all duration-500 hover:border-sage-light focus:outline-none"
    >
      {/* Ambient Champagne Glow */}
      <div className="absolute -inset-4 rounded-3xl bg-sage-light/15 blur-3xl pointer-events-none -z-10" aria-hidden="true" />

      {/* Main Slide Content Canvas */}
      <div className="relative overflow-hidden rounded-2xl min-h-[360px] sm:min-h-[420px]">
        <AnimatePresence mode="wait">
          <m.div
            key={currentSlide._id || currentIndex}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full h-full"
          >
            {/* SLIDE 1: Responsive editorial collage */}
            {slideType === "ceo" && (
              <div className="grid h-[360px] grid-cols-3 grid-rows-2 gap-2 p-1 sm:h-[420px] sm:grid-cols-4 sm:gap-3">
                {/* Dominant portrait: two-thirds width on mobile, half width from tablet upward. */}
                <m.div
                  variants={itemVariants}
                  className="relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-sage-light/80 bg-sage-card shadow-sage ring-2 ring-sage-light/40"
                >
                  <img
                    src={mediaUrl(slideImages[0] || currentSlide.mainImage || FALLBACK_MEDIA_URL)}
                    alt="CEO Leadership Portrait"
                    loading="eager"
                    decoding="sync"
                    fetchPriority="high"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_MEDIA_URL; }}
                    className="h-full w-full object-cover object-top transition-transform duration-700 hover:scale-105"
                  />
                </m.div>

                {/* Two supporting images on mobile; four complete the mosaic on larger screens. */}
                {slideImages.slice(1, 5).map((imgUrl, idx) => (
                  <m.div
                    key={idx}
                    variants={itemVariants}
                    className={`relative overflow-hidden rounded-xl border border-sage-border bg-sage-card sm:rounded-2xl ${
                      idx >= 2 ? "hidden sm:block" : ""
                    }`}
                  >
                    <img
                      src={mediaUrl(imgUrl)}
                      alt={`CEO Direction moment ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </m.div>
                ))}
              </div>
            )}

            {/* SLIDE 2: CREATIVE TEAM LAYERED PORTRAIT STRIPS */}
            {slideType === "team" && (
              <div className="relative h-[360px] sm:h-[420px] w-full overflow-hidden rounded-2xl border border-sage-border p-2">
                {/* Large Background Team Group Image */}
                <m.div variants={itemVariants} className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={mediaUrl(slideImages[0] || currentSlide.mainImage || FALLBACK_MEDIA_URL)}
                    alt="Creative Team Workspace"
                    className="h-full w-full object-cover filter grayscale-[40%] contrast-105 brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-obsidian/30 to-transparent" />
                </m.div>

                {/* Overlapping Vertical Foreground Strips */}
                <div className="relative z-10 h-full flex items-end justify-center gap-2 sm:gap-3 pb-3 px-2">
                  {slideImages.slice(1, 4).map((imgUrl, idx) => (
                    <m.div
                      key={idx}
                      variants={itemVariants}
                      className={`relative h-[65%] w-1/3 overflow-hidden rounded-2xl border border-sage-light/60 shadow-deep backdrop-blur-md ${
                        idx === 1 ? "h-[75%] border-[rgb(72,125,72)] ring-2 ring-[rgb(72,125,72)]/40" : "filter grayscale-[20%]"
                      }`}
                    >
                      <img
                        src={mediaUrl(imgUrl)}
                        alt={`Team member ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                    </m.div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 3: BRAND COLLABORATIONS (5 Vertical Editorial Panels) */}
            {slideType === "collaborations" && (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 h-[360px] sm:h-[420px] w-full overflow-hidden rounded-2xl border border-sage-border p-1">
                {slideImages.slice(0, 5).map((imgUrl, idx) => (
                  <m.div
                    key={idx}
                    variants={itemVariants}
                    className="h-full w-full overflow-hidden rounded-xl border border-sage-light/30 bg-sage-card relative group"
                  >
                    <img
                      src={mediaUrl(imgUrl)}
                      alt={`Brand collaboration ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </m.div>
                ))}
              </div>
            )}

            {/* FALLBACK / DEFAULT SLIDE SHOWCASE */}
            {slideType !== "ceo" && slideType !== "team" && slideType !== "collaborations" && (
              <div className="relative h-[360px] sm:h-[420px] w-full overflow-hidden rounded-2xl border border-sage-light/40 bg-sage-card flex items-center justify-center p-2">
                <img
                  src={mediaUrl(slideImages[0] || currentSlide.mainImage || FALLBACK_MEDIA_URL)}
                  alt={currentSlide.title || "Editorial Showcase"}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_MEDIA_URL; }}
                  className="h-full w-full object-cover rounded-xl"
                />
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
