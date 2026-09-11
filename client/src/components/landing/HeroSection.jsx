/* global setInterval, clearInterval */
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, mediaUrl, subscribeToCmsChanges } from "../../lib/api.js";
import Container from "../ui/Container.jsx";
import EditorialHeroSlider from "./EditorialHeroSlider.jsx";

const DEFAULT_HERO_SLIDES = [
  {
    _id: "default-slide-1",
    slideType: "ceo",
    eyebrow: "WEDDING CINEMA PORTFOLIO",
    title: "Where Stories Meet The Editing Table",
    subtitle: "Cinematic 4K Wedding Films & DaVinci Resolve Color Grading",
    headingLines: ["Where Stories Meet", "The Editing Table"],
    description:
      "Crafting bespoke cinematic wedding films, RAW footage assembly, DaVinci Resolve color grading, and audio mastering for premier wedding studios worldwide.",
    trustLabel: "Cinematic Wedding Films • Color Science • Storytelling",
    mainImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85",
    images: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85"
    ],
    featureItems: ["Cinematic Wedding Films", "35mm Film Emulation", "DaVinci Color Science", "Dolby Sound Design"]
  },
  {
    _id: "default-slide-2",
    slideType: "team",
    eyebrow: "EDITORIAL RETOUCHING PORTFOLIO",
    title: "Crafting Stories Beyond The Frame",
    subtitle: "Haute-Couture Portrait Retouching & Fine-Art Skin Tones",
    headingLines: ["Crafting Stories", "Beyond The Frame"],
    description:
      "High-fashion portrait retouching, frequency separation, natural skin tone preservation, and micro dodge & burn for luxury brands and photographers.",
    trustLabel: "Luxury Retouching • Detail Enhancement • Skin Tones",
    mainImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1600&q=85",
    images: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85"
    ],
    featureItems: ["Frequency Separation", "Micro Dodge & Burn", "Natural Skin Tones", "High-Fashion Finishing"]
  },
  {
    _id: "default-slide-3",
    slideType: "collaborations",
    eyebrow: "COMMERCIAL FILM POST-PRODUCTION",
    title: "Refined Visual Storytelling Suite",
    subtitle: "End-to-End Pre-Production Logistics & Commercial Video Editing",
    headingLines: ["Refined Visual", "Storytelling Suite"],
    description:
      "End-to-end pre-production logistics, commercial reel editing, storyboarding, and 4K master finishing using Premiere Pro & After Effects.",
    trustLabel: "Pre & Post Production • Commercial Reels • 4K Masters",
    mainImage: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=85",
    images: [
      "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1574717024453-354056aef981?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85"
    ],
    featureItems: ["Pre-Production Logistics", "Storyboarding", "Premiere & After Effects", "4K Master Delivery"]
  }
];

export default function HeroSection() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef(null);

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/v1/cms/hero-slides");
      const incomingSlides = data?.data || data?.slides;
      const activeOnly = Array.isArray(incomingSlides)
        ? incomingSlides.filter((s) => s.active !== false && s.status !== "draft" && s.status !== "inactive")
        : [];
      setSlides(activeOnly.sort((a, b) => (a.order || 0) - (b.order || 0)));
      setCurrentIndex(0);
    } catch {
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
    const handleFocus = () => fetchSlides();
    const unsubscribe = subscribeToCmsChanges((detail) => {
      if (detail?.key === "hero-slides") fetchSlides();
    });
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      unsubscribe();
    };
  }, [fetchSlides]);

  const effectiveSlides = Array.isArray(slides) && slides.length > 0 ? slides : DEFAULT_HERO_SLIDES;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === effectiveSlides.length - 1 ? 0 : prev + 1));
  }, [effectiveSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? effectiveSlides.length - 1 : prev - 1));
  }, [effectiveSlides.length]);

  useEffect(() => {
    if (loading || effectiveSlides.length < 2 || isPaused || shouldReduceMotion) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, loading, effectiveSlides.length, isPaused, shouldReduceMotion]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") prevSlide();
    if (e.key === "ArrowRight") nextSlide();
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) nextSlide();
    if (distance < -50) prevSlide();
    setTouchStart(0);
    setTouchEnd(0);
  };

  if (loading || effectiveSlides.length === 0) return null;

  const safeIndex = currentIndex % (effectiveSlides.length || 1);
  const currentSlide = effectiveSlides[safeIndex] || effectiveSlides[0];

  const paddedNum = String(safeIndex + 1).padStart(2, "0");
  const cleanEyebrowText = (currentSlide.eyebrow || "")
    .replace(/^\d{1,2}\s*[-•|:]\s*/, "")
    .trim();
  const displayEyebrow = cleanEyebrowText
    ? `${paddedNum} | ${cleanEyebrowText}`
    : `${paddedNum} | ${currentSlide.title?.toUpperCase() || ""}`;
  const backgroundImage = mediaUrl(
    currentSlide.mainImage || currentSlide.imageGrid?.[0] || currentSlide.images?.[0]
  );

  return (
    <section
      ref={sectionRef}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      aria-label="Editorial Hero Slider"
      className="relative min-h-[calc(100svh-5rem)] flex items-center pt-24 pb-12 overflow-hidden bg-sage-bg select-none outline-none"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {backgroundImage && (
          <m.img
            src={backgroundImage}
            alt=""
            initial={{ scale: 1.05 }}
            animate={{ scale: shouldReduceMotion ? 1.05 : 1.1 }}
            transition={{ duration: 30, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="h-full w-full object-cover blur-[35px] opacity-12"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-ivory/80 via-warm-white/90 to-ivory" />

        <m.div
          animate={{
            x: shouldReduceMotion ? [0, 0] : ["-20%", "20%", "-20%"],
            opacity: shouldReduceMotion ? 0.3 : [0.25, 0.45, 0.25]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(200,216,190,0.4)_0%,rgba(143,174,123,0.1)_50%,transparent_75%)] blur-3xl pointer-events-none"
        />
      </div>

      <Container className="grid min-h-[calc(100svh-10rem)] items-center gap-8 sm:gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 my-auto">
        {/* LEFT SIDE (Order 1): Image Gallery / Slider */}
        <m.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full z-10 order-2 lg:order-1"
        >
          <EditorialHeroSlider
            currentSlide={currentSlide}
            currentIndex={currentIndex}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </m.div>

        {/* RIGHT SIDE (Order 2): Text Content Showcase */}
        <div className="relative z-10 pl-0 order-1 lg:order-2 lg:pl-4">
          <AnimatePresence mode="wait">
            <m.div
              key={currentSlide._id || safeIndex}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -16 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-site border-b border-sage-light/40 pb-1">
                  {displayEyebrow}
                </span>
              </div>

              <div className="space-y-1 sm:space-y-2">
                {Array.isArray(currentSlide.headingLines) && currentSlide.headingLines.length > 0 ? (
                  currentSlide.headingLines.map((line, idx) => (
                    <h1
                      key={idx}
                      className={`font-heading text-3xl sm:text-5xl lg:text-6xl ${
                        idx >= 2 ? "xl:text-7xl font-normal text-site" : "font-normal text-site"
                      } leading-[1.1] tracking-tight`}
                    >
                      {line}
                    </h1>
                  ))
                ) : (
                  <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-normal text-site leading-[1.1] tracking-tight">
                    {currentSlide.title}
                  </h1>
                )}
              </div>

              <p className="text-sm sm:text-base text-sage-muted font-normal leading-relaxed max-w-lg">
                {currentSlide.description}
              </p>

              {/* Action CTA Buttons */}
              <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
                <a
                  href="/portfolio"
                  className="group inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full bg-[rgb(72,125,72)] px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#7C9B69] hover:shadow-sage active:scale-[0.98] sm:w-auto"
                >
                  <span>Explore Our Work</span>
                  <Sparkles className="h-4 w-4 text-white transition-transform duration-300 group-hover:rotate-12" />
                </a>
                <a
                  href="/services"
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-sage-border bg-sage-card/90 px-6 py-3.5 text-sm font-semibold text-forest transition-all duration-300 hover:border-[rgb(72,125,72)] hover:text-site hover:shadow-soft sm:w-auto"
                >
                  <span>Discover Services</span>
                </a>
              </div>
            </m.div>
          </AnimatePresence>

          {/* Botanical Decorative Accent */}
          <div className="absolute -right-12 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 text-site hidden xl:block">
            <svg width="80" height="120" viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M40 0C40 33.1371 13.1371 60 0 60C13.1371 60 40 86.8629 40 120C40 86.8629 66.8629 60 80 60C66.8629 60 40 33.1371 40 0Z" fill="currentColor" />
            </svg>
          </div>

        </div>
      </Container>

    </section>
  );
}
