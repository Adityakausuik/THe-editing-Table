import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import PhotoGlobe from "./PhotoGlobe.jsx";
import PhotoLightbox from "./PhotoLightbox.jsx";
import defaultPhotos from "../data/photoData.js";
import { apiFetch, mediaUrl, subscribeToCmsChanges } from "../lib/api.js";
import "../styles/photo-globe.css";

/**
 * PhotoGlobeSection Component
 * Top-level section wrapper for the 3D Photographic Earth gallery.
 * Features Bona Nova typography, luxury sage color palette, interactive
 * 3D spherical projection, CMS live sync, and an accessible fullscreen lightbox.
 */
export function PhotoGlobeSection({
  heading = "Photography",
  subheading = "Stories captured from every angle.",
  instruction = "Drag to explore • Click to view",
  photos: propPhotos,
  className = "",
}) {
  const [photos, setPhotos] = useState(propPhotos || defaultPhotos);
  const [activePhoto, setActivePhoto] = useState(null);

  // Sync with CMS if available, otherwise fall back smoothly to default luxury photos
  useEffect(() => {
    if (propPhotos && propPhotos.length > 0) {
      setPhotos(propPhotos);
      return;
    }

    let isMounted = true;

    const loadCmsPhotos = async () => {
      try {
        const res = await apiFetch("/api/v1/photo-showcase");
        if (isMounted && Array.isArray(res?.data) && res.data.length > 0) {
          const formatted = res.data.map((item, idx) => ({
            id: item._id || idx + 1,
            src: mediaUrl(item.image?.url || item.image || item.src),
            thumbnail: mediaUrl(item.image?.url || item.image || item.thumbnail || item.src),
            title: item.title || "Editorial Showcase",
            location: item.location || item.propertyName || "Global Atelier",
            category: item.category || item.badgeText || "Editorial",
            duration: item.duration || "",
            description: item.description || "",
            alt: item.title || "Editorial photography",
            aspectRatio: "3/4",
          }));
          setPhotos(formatted);
        }
      } catch {
        // Silently preserve default curated photography
      }
    };

    loadCmsPhotos();

    const unsubscribe = subscribeToCmsChanges("photo-showcase", () => {
      loadCmsPhotos();
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [propPhotos]);

  const handleSelectPhoto = (photo) => {
    setActivePhoto(photo);
  };

  const handleCloseLightbox = () => {
    setActivePhoto(null);
  };

  return (
    <section
      id="photo-showcase"
      className={`photo-globe-section ${className}`}
      aria-label="Photography Portfolio 3D Globe Showcase"
    >
      {/* Editorial Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 mb-4 md:mb-6">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F2F7F0] border border-[#E3EBDD] mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#8FAE7B]" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#2F3A2F]">
            Interactive 3D Gallery
          </span>
        </div>

        {/* Main H1 in Bona Nova Serif */}
        <h2 className="font-heading font-serif text-4xl sm:text-5xl md:text-6xl text-[#2F3A2F] tracking-tight font-normal">
          {heading}
        </h2>

        {/* Subheading in Clean Sans */}
        {subheading && (
          <p className="mt-3 text-base sm:text-lg text-[#687567] max-w-xl mx-auto font-sans font-light">
            {subheading}
          </p>
        )}

        {/* Interactive Instruction Pill */}
        {instruction && (
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#E3EBDD] bg-[#FFFFFF] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#8FAE7B] animate-pulse" aria-hidden="true" />
            <span className="text-xs tracking-wider uppercase text-[#2F3A2F] font-medium">
              {instruction}
            </span>
          </div>
        )}
      </div>

      {/* 3D Photo Globe Viewport */}
      <PhotoGlobe photos={photos} onSelectPhoto={handleSelectPhoto} />

      {/* Accessible Fullscreen Lightbox Modal */}
      <PhotoLightbox
        isOpen={Boolean(activePhoto)}
        photo={activePhoto}
        photos={photos}
        onClose={handleCloseLightbox}
        onSelectPhoto={handleSelectPhoto}
      />
    </section>
  );
}

export default PhotoGlobeSection;
