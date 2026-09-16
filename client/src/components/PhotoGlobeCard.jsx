import React, { forwardRef, memo } from "react";
import { Sparkles, MapPin, Maximize2, Eye } from "lucide-react";

/**
 * PhotoGlobeCard Component
 * Renders an individual 3D photographic editorial card based on the visual
 * reference design with frosted pill badges, muted gradients, and Bona Nova typography.
 * Forwarded ref enables direct DOM style manipulation during the 60 FPS animation loop.
 */
export const PhotoGlobeCard = memo(
  forwardRef(function PhotoGlobeCard(
    { photo, onClick, onFocus },
    ref
  ) {
    const handleClick = (e) => {
      e.stopPropagation();
      if (onClick) {
        onClick(photo, e);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) onClick(photo, e);
      }
    };

    return (
      <article
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={`View photography: ${photo.title}, ${photo.location || "Editorial"}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className="photo-globe-card group focus:outline-none focus:ring-2 focus:ring-[#8FAE7B] focus:ring-offset-2 select-none"
      >
        <div className="photo-globe-card-media select-none">
          {/* Base Photography Image */}
          <img
            src={photo.thumbnail || photo.src}
            alt={photo.alt || photo.title}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={(e) => {
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";
            }}
            className="photo-globe-card-img select-none pointer-events-none"
          />

          {/* Specular Reflective Highlight */}
          <div className="photo-globe-card-reflection" aria-hidden="true" />

          {/* Category Pill Badge */}
          {photo.category && (
            <div className="photo-globe-badge pointer-events-none">
              <Sparkles className="w-3 h-3 text-[#C8D8BE]" aria-hidden="true" />
              <span>{photo.category}</span>
            </div>
          )}

          {/* Top Right Expand Icon */}
          <div className="photo-globe-expand-badge pointer-events-none" aria-hidden="true">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>

          {/* Center View Indicator */}
          <div className="photo-globe-center-action pointer-events-none" aria-hidden="true">
            <Eye className="w-5 h-5 text-white" />
          </div>

          {/* Bottom Vignette & Metadata */}
          <div className="photo-globe-card-footer pointer-events-none">
            {photo.location && (
              <div className="photo-globe-card-location">
                <MapPin className="w-3 h-3 text-[#C8D8BE] flex-shrink-0" aria-hidden="true" />
                <span>{photo.location}</span>
                {photo.duration && (
                  <>
                    <span className="text-white/40">•</span>
                    <span>{photo.duration}</span>
                  </>
                )}
              </div>
            )}

            <h3 className="photo-globe-card-title">
              {photo.title}
            </h3>

            {photo.description && (
              <p className="photo-globe-card-desc">
                {photo.description}
              </p>
            )}
          </div>
        </div>
      </article>
    );
  })
);

PhotoGlobeCard.displayName = "PhotoGlobeCard";

export default PhotoGlobeCard;
