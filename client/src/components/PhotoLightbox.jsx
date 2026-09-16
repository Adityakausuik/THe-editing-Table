import React, { useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";

/**
 * PhotoLightbox Component
 * Accessible, full-viewport dialog modal with high-res photography display,
 * keyboard controls (Escape, ArrowLeft, ArrowRight), and touch swipe gestures.
 */
export function PhotoLightbox({
  isOpen,
  photo,
  photos = [],
  onClose,
  onSelectPhoto,
}) {
  const closeButtonRef = useRef(null);
  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);

  const currentIndex = photo ? photos.findIndex((p) => p.id === photo.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectPhoto) {
      onSelectPhoto(photos[currentIndex - 1]);
    } else if (photos.length > 0 && onSelectPhoto) {
      // Loop to end
      onSelectPhoto(photos[photos.length - 1]);
    }
  }, [currentIndex, hasPrev, onSelectPhoto, photos]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectPhoto) {
      onSelectPhoto(photos[currentIndex + 1]);
    } else if (photos.length > 0 && onSelectPhoto) {
      // Loop to start
      onSelectPhoto(photos[0]);
    }
  }, [currentIndex, hasNext, onSelectPhoto, photos]);

  // Keyboard navigation & scroll locking
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto focus close button for accessibility
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Touch swipe handling
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  return (
    <AnimatePresence>
      {isOpen && photo && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={photo.title || "Photo Lightbox"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#131A13]/90 backdrop-blur-xl"
          onClick={onClose}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar / Close & Navigation Info */}
          <div className="absolute top-4 left-4 right-4 md:top-6 md:left-8 md:right-8 flex items-center justify-between z-10 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#C8D8BE] bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
                {currentIndex + 1} / {photos.length}
              </span>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close photography modal"
              className="pointer-events-auto p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#8FAE7B]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous photograph"
            className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#8FAE7B]"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next photograph"
            className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#8FAE7B]"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Center Content Container */}
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center bg-[#1A241A] rounded-[28px] overflow-hidden shadow-2xl border border-white/15"
          >
            {/* Main High-Res Image */}
            <div className="relative w-full max-h-[68vh] overflow-hidden flex items-center justify-center bg-black/40">
              <img
                src={photo.src}
                alt={photo.alt || photo.title}
                className="w-full h-full max-h-[68vh] object-contain"
              />

              {/* Floating Category Pill */}
              {photo.category && (
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-xs font-medium text-white">
                  <Sparkles className="w-3 h-3 text-[#C8D8BE]" />
                  <span>{photo.category}</span>
                </div>
              )}
            </div>

            {/* Footer Metadata */}
            <div className="w-full p-6 md:p-8 bg-[#1A241A] flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-white/10">
              <div className="flex-1">
                {photo.location && (
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8FAE7B] mb-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{photo.location}</span>
                    {photo.duration && (
                      <>
                        <span className="text-white/40">•</span>
                        <span>{photo.duration}</span>
                      </>
                    )}
                  </div>
                )}
                <h2 className="font-heading font-serif text-2xl md:text-3xl text-white font-medium">
                  {photo.title}
                </h2>
                {photo.description && (
                  <p className="mt-2 text-sm text-[#C8D8BE]/80 max-w-2xl font-sans">
                    {photo.description}
                  </p>
                )}
              </div>

              {/* Mobile Prev/Next Controls */}
              <div className="flex md:hidden items-center justify-between pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-medium"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-medium"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PhotoLightbox;
