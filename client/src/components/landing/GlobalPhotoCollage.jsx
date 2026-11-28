import { useState, useEffect, useMemo, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import photo1 from "../../assets/global-showcase/photo-1-veil.jpg";
import photo2 from "../../assets/global-showcase/photo-2-bridal-party.jpg";
import photo3 from "../../assets/global-showcase/photo-3-ceremony.jpg";
import photo4 from "../../assets/global-showcase/photo-4-royal-arch.jpg";

/**
 * Editorial Photography Collage Dataset
 * Matches the 4 photographs provided by the user, linked to the global locations.
 */
const DEFAULT_COLLAGE_PHOTOS = [
  {
    id: "p1-veil",
    src: photo1,
    title: "Jashan & Jasdeep",
    country: "Switzerland",
    city: "ZURICH",
    countryCode: "ch",
    aspect: "portrait",
    alt: "Fine-art outdoor wedding portrait with romantic veil in nature"
  },
  {
    id: "p2-bridal",
    src: photo2,
    title: "The Mayfair Bridal Party",
    country: "United Kingdom",
    city: "LONDON",
    countryCode: "gb",
    aspect: "portrait",
    alt: "Bridal party celebration in soft champagne, peach and pearl tones"
  },
  {
    id: "p3-ceremony",
    src: photo3,
    title: "Heritage Anand Karaj",
    country: "India",
    city: "CHANDIGARH",
    countryCode: "in",
    aspect: "landscape",
    alt: "Traditional Indian royal wedding ceremony on handcrafted floor rug"
  },
  {
    id: "p4-archway",
    src: photo4,
    title: "The Royal Archway Nuptials",
    country: "Canada",
    city: "TORONTO",
    countryCode: "ca",
    aspect: "landscape",
    alt: "Royal architectural archway wedding nuptials with floral adornment"
  }
];

/**
 * 4 Slot Layout definitions creating an artistic, overlapping collage
 * resembling photographs naturally pasted onto vintage paper.
 */
const COLLAGE_SLOTS = [
  {
    // Slot 0: Top-Left (Hero Landscape / Anchor)
    className: "top-0 left-0 w-[58%] h-[200px] sm:h-[230px] md:h-[250px] z-10",
    rotation: -2.5,
    borderRadius: "2px",
    shadow: "shadow-[0_14px_28px_-6px_rgba(35,45,30,0.18),0_4px_10px_rgba(35,45,30,0.08)]"
  },
  {
    // Slot 1: Top-Right (Tall Editorial Portrait, overlapping right edge of slot 0)
    className: "top-2 right-0 w-[45%] h-[210px] sm:h-[240px] md:h-[265px] z-12",
    rotation: 2.2,
    borderRadius: "2px",
    shadow: "shadow-[0_16px_32px_-6px_rgba(35,45,30,0.2),0_6px_12px_rgba(35,45,30,0.08)]"
  },
  {
    // Slot 2: Bottom-Right (Medium Landscape / Accent, overlapping slot 1)
    className: "bottom-1 right-2 w-[54%] h-[180px] sm:h-[205px] md:h-[225px] z-15",
    rotation: -1.8,
    borderRadius: "2px",
    shadow: "shadow-[0_16px_30px_-6px_rgba(35,45,30,0.22),0_4px_12px_rgba(35,45,30,0.09)]"
  },
  {
    // Slot 3: Bottom-Left (Portrait, overlapping under slot 0 and over slot 2)
    className: "bottom-0 left-4 w-[44%] h-[175px] sm:h-[195px] md:h-[215px] z-14",
    rotation: 1.6,
    borderRadius: "2px",
    shadow: "shadow-[0_12px_26px_-6px_rgba(35,45,30,0.18),0_4px_10px_rgba(35,45,30,0.08)]"
  }
];

export default function GlobalPhotoCollage({
  activeLocation,
  onPhotoClick,
  rotationIndex = 0,
  isPaused = false
}) {
  const [internalOffset, setInternalOffset] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Reorder photos to highlight active location when changed
  const orderedPhotos = useMemo(() => {
    if (!activeLocation?.country) return DEFAULT_COLLAGE_PHOTOS;

    const countryName = activeLocation.country.toLowerCase();
    const primaryIdx = DEFAULT_COLLAGE_PHOTOS.findIndex(
      (p) => p.country.toLowerCase() === countryName || p.countryCode === activeLocation.countryCode?.toLowerCase()
    );

    if (primaryIdx === -1) return DEFAULT_COLLAGE_PHOTOS;

    // Shift array so the active country photo sits at index 0
    return [
      ...DEFAULT_COLLAGE_PHOTOS.slice(primaryIdx),
      ...DEFAULT_COLLAGE_PHOTOS.slice(0, primaryIdx)
    ];
  }, [activeLocation]);

  // Synchronize internal rotation with parent rotationIndex
  useEffect(() => {
    setInternalOffset(rotationIndex % 4);
  }, [rotationIndex]);

  // Clockwise placement: each photo maps to a slot shifted by internalOffset
  const slotAssignments = useMemo(() => {
    return orderedPhotos.map((photo, i) => {
      // Clockwise slot sequence: 0 -> 1 -> 2 -> 3 -> 0
      const slotIndex = (i + internalOffset) % 4;
      return {
        photo,
        slot: COLLAGE_SLOTS[slotIndex],
        slotIndex
      };
    });
  }, [orderedPhotos, internalOffset]);

  // Active highlighted photo (slot 0 hero)
  const currentHeroPhoto = useMemo(() => {
    const heroAssignment = slotAssignments.find((a) => a.slotIndex === 0);
    return heroAssignment ? heroAssignment.photo : orderedPhotos[0];
  }, [slotAssignments, orderedPhotos]);

  const handleDotClick = (idx) => {
    setInternalOffset(idx);
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* ================= COLLAGE FRAME ================= */}
      {/* 
        Container sized to hold the overlapping photographs naturally
        with ample padding and safe clearance from the globe.
      */}
      <div className="relative w-full max-w-[500px] h-[360px] sm:h-[400px] md:h-[430px] lg:h-[440px] mx-auto">
        {slotAssignments.map(({ photo, slot, slotIndex }, i) => {
          const isHovered = hoveredIndex === photo.id;
          const isHero = slotIndex === 0;

          return (
            <m.div
              key={photo.id}
              layout
              transition={{
                layout: { duration: 0.85, ease: [0.25, 1, 0.5, 1] }
              }}
              onMouseEnter={() => setHoveredIndex(photo.id)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onPhotoClick?.(photo)}
              style={{
                rotate: isHovered ? 0 : `${slot.rotation}deg`,
                scale: isHovered ? 1.05 : 1,
                zIndex: isHovered ? 40 : undefined
              }}
              className={`absolute cursor-pointer transition-all duration-300 ${slot.className} ${slot.shadow} group`}
            >
              {/* 
                Photographic Print Border:
                Looks like an authentic fine-art photographic paper print
                (crisp off-white paper border, subtle paper sheen, NO card box)
              */}
              <div className="relative w-full h-full p-1.5 sm:p-2 bg-[#FAF8F5] rounded-[2px] overflow-hidden border border-[#EDE7DC]/70">
                {/* Photo image */}
                <div className="relative w-full h-full overflow-hidden rounded-[1px] bg-[#E7E2D8]">
                  <img
                    src={photo.src}
                    alt={photo.alt || photo.title}
                    loading="lazy"
                    className="w-full h-full object-cover object-center filter saturate-[1.04] contrast-[1.02] transition-transform duration-500 ease-out group-hover:scale-105"
                  />

                  {/* Subtle photographic emulsion gloss reflection */}
                  <div
                    className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/15 pointer-events-none opacity-60 group-hover:opacity-30 transition-opacity duration-300"
                    aria-hidden="true"
                  />

                  {/* Subtle active glow for active country photo */}
                  {isHero && (
                    <div
                      className="absolute inset-0 border border-white/60 pointer-events-none rounded-[1px]"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            </m.div>
          );
        })}
      </div>

      {/* ================= EDITORIAL CAPTION & PAGINATION ================= */}
      {/* 
        Matches the visual reference (media_1795855490278_a695d164.jpg):
        Large elegant serif couple/project title + pagination dots underneath.
      */}
      <div className="mt-4 sm:mt-5 flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          <m.div
            key={currentHeroPhoto.id + currentHeroPhoto.title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center"
          >
            <h3 className="font-heading text-lg sm:text-xl md:text-2xl font-normal uppercase tracking-[0.08em] text-[#243526]">
              {currentHeroPhoto.title}
            </h3>
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.16em] text-[#697A62] mt-0.5">
              {currentHeroPhoto.country} • {currentHeroPhoto.city}
            </p>
          </m.div>
        </AnimatePresence>

        {/* 4 Pagination Indicator Dots matching reference mockup */}
        <div className="flex items-center gap-2 mt-2.5" role="tablist" aria-label="Photo Showcase Slide Indicators">
          {[0, 1, 2, 3].map((idx) => {
            const isActive = internalOffset === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDotClick(idx)}
                aria-label={`Jump to showcase photo ${idx + 1}`}
                aria-selected={isActive}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? "w-2.5 h-2.5 bg-[#3B4E38] scale-110"
                    : "w-2 h-2 bg-[#9FB098]/60 hover:bg-[#687C62]"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
