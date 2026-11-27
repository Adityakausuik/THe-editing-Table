import { AnimatePresence, m } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Palette, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Container from "../ui/Container.jsx";
import SectionHeading from "../ui/SectionHeading.jsx";

// Import exact uploaded showcase images
import amritToorCard from "../../assets/colour-showcase/showcase-card-amrit-toor.jpg";
import amritToorPhoto from "../../assets/colour-showcase/photo-amrit-toor.jpg";
import prabhSimarCard from "../../assets/colour-showcase/showcase-card-prabh-simar.jpg";
import prabhSimarPhoto from "../../assets/colour-showcase/photo-prabh-simar.jpg";
import champagnePeachPhoto from "../../assets/colour-showcase/colour-grade-champagne-peach.jpg";
import royalCeremonyPhoto from "../../assets/colour-showcase/colour-grade-royal-ceremony.jpg";

const SHOWCASE_ITEMS = [
  {
    id: "amrit-toor",
    title: "Amrit Toor",
    subtitle: "Emerald Depths & Antique Gold",
    cardPosition: "left", // Reference Image 1: Card on Left, Photo on Right
    cardBg: "#FAF4F0",
    photo: amritToorPhoto,
    fullCardImage: amritToorCard,
    aspectRatio: "aspect-[1/1.05]",
    palette: [
      { name: "Velvet Emerald", hex: "#163024" },
      { name: "Antique Gold", hex: "#C5A059" },
      { name: "Royal Wine", hex: "#8C2D3B" },
      { name: "Porcelain Ivory", hex: "#EADAC9" }
    ],
    editorialNote:
      "Raman and the team at Deep Photography were great to work with. I got exactly what I wanted and in amazing high quality video. They were very easy to work with and very timely getting the videos back to us. The editing was great, you can tell he really cares about his craft and strives to give you the best possible product. Raman is very creative and he can sense what moments are going to look great on camera. I highly recommend Raman and his team at Deep Photography.",
    colorScience: "Custom skin tone isolation preserving natural highlights while enriching deep velvet greens, intricate kundan jewelry micro-contrast, and golden embroidery luminosity without digital clipping.",
    linkText: "View her story"
  },
  {
    id: "prabh-simar",
    title: "Prabh & Simar",
    subtitle: "35mm Crimson Velvet & Daylight Warmth",
    cardPosition: "right", // Reference Image 2: Photo on Left, Card on Right
    cardBg: "#FAF3EF",
    photo: prabhSimarPhoto,
    fullCardImage: prabhSimarCard,
    aspectRatio: "aspect-[1/1.37]",
    palette: [
      { name: "Silk Crimson", hex: "#961C24" },
      { name: "Tuscan Shadow", hex: "#2D221E" },
      { name: "Golden Hour Glow", hex: "#DF9C75" },
      { name: "Warm Skin Highlight", hex: "#F7ECE6" }
    ],
    editorialNote:
      "Deep Photography covered our entire wedding and did an absolutely amazing job. I was blown away by his team's work and he completed and delivered the content in a timely manner. Everyone in our family loved his work. The photography and videography were top notch. We needed to make adjustments to the content and he made sure to have it all done on time. His prices were also the best on the market. Above all, his team was very kind, supportive, understanding and adaptive throughout the entire process. I will always recommend Deep Photography to anyone that needs photography/videography work done. My family and I are 100% satisfied.",
    colorScience: "Kodachrome-inspired split-toning calibrated for deep silk red fabrics, preserving natural warm daylight skin roll-off, shadow detail recovery, and clean contrast without digital harshness.",
    linkText: "View story"
  },
  {
    id: "champagne-peach",
    title: "Heritage Bridal Reception",
    subtitle: "Soft Pastel Champagne & Pearl Tones",
    cardPosition: "left",
    cardBg: "#F7F4F0",
    photo: champagnePeachPhoto,
    fullCardImage: champagnePeachPhoto,
    aspectRatio: "aspect-[2/3]",
    palette: [
      { name: "Pastel Peach", hex: "#E8BEAC" },
      { name: "Silver Pearl", hex: "#D8D2C6" },
      { name: "Champagne Silk", hex: "#F4EAE2" },
      { name: "Muted Shadow", hex: "#2C2B29" }
    ],
    editorialNote:
      "A delicate, high-key celebration captured with luminous champagne hues. Our color timing unified contrasting blush and peach bridesmaid ensembles against intricate silver bridal zardozi work. By preserving organic highlight roll-off and silky skin tones, the final grade captures the radiant, airy emotion of the celebration.",
    colorScience: "High-key luxury bridal grading balancing multi-subject pastel silk attire, ambient white drapery highlight recovery, fine silver embroidery sparkle, and authentic luminous skin tones.",
    linkText: "View full grade"
  },
  {
    id: "royal-ceremony",
    title: "Traditional Royal Ceremony",
    subtitle: "Regal Warmth & Multi-Tone Archway",
    cardPosition: "right",
    cardBg: "#FAF4EE",
    photo: royalCeremonyPhoto,
    fullCardImage: royalCeremonyPhoto,
    aspectRatio: "aspect-[3/2]",
    palette: [
      { name: "Ceremonial Red", hex: "#B22222" },
      { name: "Pistachio Sage", hex: "#8FA876" },
      { name: "Terracotta Arch", hex: "#C59B73" },
      { name: "Ivory Gold", hex: "#E4C582" }
    ],
    editorialNote:
      "An intricate ceremony under an earthen terracotta archway celebrating generational family traditions. Our color grading engineered distinct chromatic separation between rich bridal crimson, pistachio green, and golden silk, while maintaining authentic warmth across varying complexions in ambient room illumination.",
    colorScience: "Complex multi-palette calibration balancing contrasting bridal red, pistachio sage, and sandy architectural arches under warm ceremony lighting with cinematic color separation.",
    linkText: "View ceremony grade"
  }
];

export default function ColourShowcaseSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [direction, setDirection] = useState(1);

  const activeItem = SHOWCASE_ITEMS[currentIndex];

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? SHOWCASE_ITEMS.length - 1 : prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === SHOWCASE_ITEMS.length - 1 ? 0 : prev + 1));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeModalItem) {
        if (e.key === "Escape") setActiveModalItem(null);
        return;
      }
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, activeModalItem]);

  return (
    <section
      id="colour-grading-showcase"
      data-section="colour-grading"
      aria-label="Color Grading & Colour Showcase"
      className="py-20 sm:py-28 lg:py-32 bg-[#FAF8F5] text-[#263D2D] relative overflow-hidden border-b border-sage-border/80"
    >
      <Container className="space-y-12 sm:space-y-16">
        {/* Header matching site's luxury editorial typography */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sage-border/80">
          <SectionHeading
            align="left"
            label="COLOR SCIENCE & SIGNATURE GRADING"
            title="Mastering Mood, Depth & Signature Color"
            text="Every visual story carries its own emotional language. From deep 35mm velvet saturation to luminous pastel daylight and royal ceremonial warmth, explore our bespoke color science tailored for premiere filmmakers."
          />

          {/* Carousel Arrows */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous color grade showcase"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#263D2D]/20 bg-white text-[#263D2D] transition-all duration-300 hover:bg-[#263D2D] hover:text-white shadow-xs cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-xs font-semibold tracking-wider text-sage-muted font-sans select-none px-1">
              0{currentIndex + 1} / 0{SHOWCASE_ITEMS.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next color grade showcase"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#263D2D]/20 bg-white text-[#263D2D] transition-all duration-300 hover:bg-[#263D2D] hover:text-white shadow-xs cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Style Filter Pills */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          {SHOWCASE_ITEMS.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`filter-pill text-xs sm:text-[13px] px-4 py-1.5 transition-all duration-300 cursor-pointer ${
                currentIndex === idx ? "is-active" : ""
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.palette[0].hex }} />
              {item.title}
            </button>
          ))}
        </div>

        {/* Featured Showcase Stage (Faithfully reproducing the reference layout) */}
        <div className="relative min-h-[440px] sm:min-h-[500px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <m.div
              key={activeItem.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <div
                className={`flex flex-col ${
                  activeItem.cardPosition === "left" ? "lg:flex-row" : "lg:flex-row-reverse"
                } items-center justify-center gap-6 lg:gap-0 max-w-6xl mx-auto relative`}
              >
                {/* Editorial Overlapping Card */}
                <div
                  className={`w-full max-w-xl lg:max-w-none lg:w-[58%] z-20 rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-14 shadow-lg border border-[#F0E6DF] transition-all duration-500 text-center ${
                    activeItem.cardPosition === "left"
                      ? "lg:-mr-16 lg:text-left"
                      : "lg:-ml-16 lg:text-left"
                  }`}
                  style={{ backgroundColor: activeItem.cardBg }}
                >
                  {/* Circular Quote Emblem Badge: ( ” ) */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-[#263D2D]/30 flex items-center justify-center mx-auto lg:mx-0 mb-6 bg-white/40">
                    <span className="font-serif text-2xl sm:text-3xl text-[#263D2D] leading-none select-none">
                      &#8221;
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#263D2D] tracking-tight mb-2">
                    {activeItem.title}
                  </h3>

                  {/* Subtitle / Tonal Palette Tag */}
                  <p className="text-xs sm:text-[13px] font-sans font-semibold tracking-wider uppercase text-[#78866A] mb-5">
                    {activeItem.subtitle}
                  </p>

                  {/* Editorial Body Text */}
                  <p className="font-sans text-xs sm:text-sm text-[#263D2D]/80 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-6">
                    {activeItem.editorialNote}
                  </p>

                  {/* Color Palette Swatch Strip */}
                  <div className="pt-2 pb-5 border-t border-[#263D2D]/10">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#78866A] block mb-2">
                      Engineered Color Palette
                    </span>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3">
                      {activeItem.palette.map((swatch) => (
                        <div
                          key={swatch.name}
                          className="flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 border border-[#263D2D]/10 shadow-2xs"
                          title={`${swatch.name} (${swatch.hex})`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: swatch.hex }}
                          />
                          <span className="text-[11px] font-medium text-[#263D2D]/90 whitespace-nowrap">{swatch.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Link */}
                  <button
                    type="button"
                    onClick={() => setActiveModalItem(activeItem)}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-sans font-medium tracking-wide text-[#263D2D]/70 hover:text-[#263D2D] transition-colors cursor-pointer group"
                  >
                    <span>{activeItem.linkText}</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">&gt;</span>
                  </button>
                </div>

                {/* Prominent Photo Showcase */}
                <div
                  className="w-full lg:w-[48%] relative group cursor-pointer z-10"
                  onClick={() => setActiveModalItem(activeItem)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View full ${activeItem.title} color grade`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveModalItem(activeItem);
                  }}
                >
                  <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl border border-white/60 bg-white">
                    <img
                      src={activeItem.photo}
                      alt={`${activeItem.title} color grading showcase`}
                      className="w-full h-auto max-h-[500px] lg:max-h-[520px] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />

                    {/* Subtle Overlay Badge on Hover */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-[#263D2D] shadow-lg backdrop-blur-sm">
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>Inspect Full Color Grade</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Thumbnail Selector Strip: Displays All 4 Provided Images Side-by-Side */}
        <div className="pt-8 border-t border-sage-border/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#487D48]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#263D2D]">
                All Color Grading Suites (Click to inspect)
              </span>
            </div>
            <span className="text-xs text-sage-muted hidden sm:inline">
              Use arrow keys or click any suite to preview
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SHOWCASE_ITEMS.map((item, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={`group relative text-left rounded-2xl overflow-hidden border transition-all duration-300 p-2.5 bg-white cursor-pointer ${
                    isSelected
                      ? "border-[#487D48] ring-2 ring-[#487D48]/20 shadow-md"
                      : "border-sage-border hover:border-[#487D48]/50 shadow-xs"
                  }`}
                >
                  <div className="relative aspect-[16/11] overflow-hidden rounded-xl bg-forest/5 mb-2.5">
                    <img
                      src={item.photo}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute bottom-2 left-2 flex gap-1 bg-black/40 backdrop-blur-sm p-1 rounded-full">
                      {item.palette.slice(0, 3).map((sw) => (
                        <span
                          key={sw.name}
                          className="w-2.5 h-2.5 rounded-full border border-white/40"
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                    </div>
                  </div>
                  <h4 className="font-serif text-sm font-semibold text-[#263D2D] truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-sage-muted truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </Container>

      {/* High-Resolution Inspection Lightbox Modal */}
      <AnimatePresence>
        {activeModalItem && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-6 backdrop-blur-md"
            onClick={() => setActiveModalItem(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeModalItem.title} full color grade`}
          >
            <div
              className="relative max-w-4xl w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 bg-[#162118] text-white shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                aria-label="Close color grade viewer"
                className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Full Image Presentation */}
              <div className="relative rounded-2xl overflow-hidden bg-black/60 flex items-center justify-center max-h-[60vh]">
                <img
                  src={activeModalItem.fullCardImage || activeModalItem.photo}
                  alt={`${activeModalItem.title} full color grade inspection`}
                  className="max-h-[60vh] w-auto max-w-full object-contain mx-auto"
                />
              </div>

              {/* Color Science & Palette Breakdown */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-emerald-400">
                      Signature Grade Palette
                    </span>
                    <h3 className="font-serif text-2xl font-normal text-white">
                      {activeModalItem.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeModalItem.palette.map((swatch) => (
                      <div
                        key={swatch.name}
                        className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        <span className="text-[11px] text-white/90">{swatch.hex}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs text-white/80 leading-relaxed">
                  <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300 block mb-1">
                      Color Science Approach
                    </span>
                    <p>{activeModalItem.colorScience}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300 block mb-1">
                      Client Review
                    </span>
                    <p className="italic">"{activeModalItem.editorialNote.slice(0, 220)}..."</p>
                  </div>
                </div>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}
