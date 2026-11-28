import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { apiFetch, subscribeToCmsChanges } from "../../lib/api.js";
import Container from "../ui/Container.jsx";
import GlobalPhotoCollage from "./GlobalPhotoCollage.jsx";
const Interactive3DGlobe = lazy(() => import("./Interactive3DGlobe.jsx"));
import { GLOBAL_LOCATIONS, GLOBAL_REACH_CONFIG } from "../../data/globalLocations.js";

/**
 * Clean SVG / Flag representations ensuring crisp rendering across all browsers.
 */
function CountryFlag({ code, country }) {
  const normalized = (code || "").toLowerCase();

  if (normalized === "ch") {
    // Switzerland Flag
    return (
      <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
        <rect width="32" height="32" fill="#D52B1E" />
        <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" rx="0.5" />
        <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" rx="0.5" />
      </svg>
    );
  }

  if (normalized === "ca") {
    // Canada Flag
    return (
      <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
        <rect width="32" height="32" fill="#D80027" />
        <rect x="8" width="16" height="32" fill="#F0F0F0" />
        {/* Stylized Maple Leaf */}
        <path
          d="M16 8l1.5 3.5 2.5-.8-1 3.3 2.5 1-1.8 1.8.8 3.2-3-.8-1.5 4-1.5-4-3 .8.8-3.2-1.8-1.8 2.5-1-1-3.3 2.5.8L16 8z"
          fill="#D80027"
        />
      </svg>
    );
  }

  // Use high-res flagcdn with fallback
  return (
    <img
      src={`https://flagcdn.com/w80/${normalized}.png`}
      srcSet={`https://flagcdn.com/w160/${normalized}.png 2x`}
      alt={`${country} flag`}
      loading="lazy"
      className="h-full w-full object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

export default function GlobalReachSection() {
  const [cmsConfig, setCmsConfig] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimerRef = useRef(null);

  // Sync with live backend API & listen for Admin changes
  const loadCmsData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/cms/collaborations/global-reach");
      if (res?.data) {
        setCmsConfig(res.data);
      }
    } catch {
      // Safe offline fallback
    }
  }, []);

  useEffect(() => {
    loadCmsData();

    // Subscribe to CMS changes via WebSocket / BroadcastChannel
    const unsub = typeof subscribeToCmsChanges === "function"
      ? subscribeToCmsChanges((entity) => {
          if (entity === "globalReach" || entity === "sitesettings" || entity === "settings") {
            loadCmsData();
          }
        })
      : null;

    let channel;
    if (typeof BroadcastChannel === "function") {
      try {
        channel = new BroadcastChannel("editing-table-cms");
        channel.onmessage = (e) => {
          if (e.data?.key === "globalReach") {
            loadCmsData();
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
  }, [loadCmsData]);

  const heading = cmsConfig?.heading || GLOBAL_REACH_CONFIG.heading;
  const description = cmsConfig?.description || GLOBAL_REACH_CONFIG.description;
  const isEnabled = cmsConfig?.enabled !== false;

  // Locations derived from live backend or fallback
  const allLocations = useMemo(() => {
    const raw = Array.isArray(cmsConfig?.locations) && cmsConfig.locations.length > 0
      ? cmsConfig.locations
      : GLOBAL_LOCATIONS;
    return raw.filter((l) => l.active !== false);
  }, [cmsConfig?.locations]);

  // Featured 4 locations for public hubs strip (matching reference design)
  const cardLocations = useMemo(() => {
    const featured = allLocations.filter((l) => l.featured);
    const chosen = featured.length >= 4 ? featured.slice(0, 4) : allLocations.slice(0, 4);
    return chosen.length > 0 ? chosen : GLOBAL_LOCATIONS.slice(0, 4);
  }, [allLocations]);

  // Active location highlighted on globe & collage
  const activeLocation = cardLocations[selectedIndex % cardLocations.length] || cardLocations[0];

  // Automatic sequential location & photo rotation (every 5 seconds)
  useEffect(() => {
    if (isPaused || cardLocations.length === 0) return;

    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % cardLocations.length);
    }, GLOBAL_REACH_CONFIG.rotationIntervalMs);

    return () => clearInterval(interval);
  }, [isPaused, cardLocations.length]);

  // Handle manual location pill click
  const handleCardClick = (index) => {
    setSelectedIndex(index);
    setIsPaused(true);

    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, GLOBAL_REACH_CONFIG.userPauseDurationMs);
  };

  // Handle manual 3D globe interaction pause
  const handleGlobeInteraction = useCallback((interacting) => {
    if (interacting) {
      setIsPaused(true);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    } else {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => {
        setIsPaused(false);
      }, GLOBAL_REACH_CONFIG.userPauseDurationMs);
    }
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <section
      id="global-reach"
      aria-label="Global Reach and International Collaborations"
      className="relative z-10 border-b border-[#D8D2C2]/80 bg-[#EFE9DC] py-12 sm:py-16 lg:py-20 overflow-hidden transition-colors duration-500 scroll-mt-20"
      style={{
        background: "radial-gradient(ellipse at 50% 25%, #F6F2E9 0%, #EFE8DC 55%, #E6DEC9 100%)"
      }}
    >
      {/* ================= EDITORIAL PAPER TEXTURE & NOISE OVERLAY ================= */}
      {/* 
        Creates the warm paper grain and natural texture matching reference image.
        Uses pure SVG filter turbulence for zero latency and crisp rendering.
      */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.24] mix-blend-multiply select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <filter id="paper-grain-texture">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.88  0 0 0 0 0.84  0 0 0 0 0.78  0 0 0 0.65 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-grain-texture)" />
      </svg>

      {/* Subtle giant quotation mark watermark in top-right matching reference mockup */}
      <div
        className="absolute -right-4 sm:right-6 lg:right-12 top-4 lg:top-8 select-none pointer-events-none text-[150px] sm:text-[190px] lg:text-[240px] font-serif leading-none text-[#5A6D52]/[0.06] font-bold"
        aria-hidden="true"
      >
        “
      </div>

      <Container className="relative z-10 max-w-[1240px]">
        {/* ================= 1. CENTERED EDITORIAL HEADER ================= */}
        {/* Matches reference mockup (media_1795855490278_a695d164.jpg) */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-12 lg:mb-16 select-none">
          {/* Eyebrow with horizontal accent lines */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 select-none mb-3">
            <span className="h-[1px] w-8 sm:w-16 bg-[#8C9C84]/60" aria-hidden="true" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-[#4E6347]">
              {GLOBAL_REACH_CONFIG.eyebrowLabel}
            </span>
            <span className="h-[1px] w-8 sm:w-16 bg-[#8C9C84]/60" aria-hidden="true" />
          </div>

          {/* Bold Serif Heading */}
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-normal tracking-tight text-[#1D2B1F] leading-[1.18] uppercase">
            {heading}
          </h2>

          {/* Subtitle / Editorial description */}
          <p className="mt-3.5 text-xs sm:text-sm md:text-[15px] text-[#5C6757] leading-relaxed max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* ================= 2. MAIN SHOWCASE: PHOTOS (LEFT) + GLOBE (RIGHT) ================= */}
        {/* 
          Balanced layout:
          Desktop: 2 columns with generous clearance so photos and globe do not collide.
          Mobile: Stacked vertically without breaking globe layout or interactions.
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-10 xl:gap-14 items-center">
          {/* LEFT: Photo Showcase Collage */}
          <div className="lg:col-span-6 w-full flex flex-col items-center justify-center">
            <GlobalPhotoCollage
              activeLocation={activeLocation}
              rotationIndex={selectedIndex}
              isPaused={isPaused}
              onPhotoClick={() => {
                // Pause rotation when user inspects photos
                setIsPaused(true);
                if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
                pauseTimerRef.current = setTimeout(() => {
                  setIsPaused(false);
                }, GLOBAL_REACH_CONFIG.userPauseDurationMs);
              }}
            />
          </div>

          {/* RIGHT: 3D Interactive Earth Globe (Preserved completely intact!) */}
          <div className="lg:col-span-6 w-full flex flex-col items-center justify-center">
            <div className="w-full flex items-center justify-center min-h-[280px] sm:min-h-[340px] lg:min-h-[420px]">
              <Suspense
                fallback={
                  <div className="h-[280px] sm:h-[340px] lg:h-[420px] w-full flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full border-2 border-[#CBD6C5] border-t-[#263D2D] animate-spin" />
                  </div>
                }
              >
                <Interactive3DGlobe
                  activeLocation={activeLocation}
                  locations={allLocations}
                  onSelectLocation={setSelectedIndex}
                  onUserInteractionChange={handleGlobeInteraction}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* ================= 3. BOTTOM HUBS & LOCATIONS PILL STRIP ================= */}
        {/* Matches reference mockup (media_1795855490278_a695d164.jpg) */}
        <div className="mt-10 sm:mt-12 lg:mt-16 w-full">
          <div className="flex items-center gap-2 mb-3 px-1 select-none">
            <span className="h-2 w-2 rounded-full bg-[#466640] animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#4E6347]">
              HUBS &amp; LOCATIONS
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
            {cardLocations.map((loc, idx) => {
              const isSelected = idx === (selectedIndex % cardLocations.length);

              return (
                <button
                  key={loc.id || `${loc.country}-${loc.city}-${idx}`}
                  type="button"
                  onClick={() => handleCardClick(idx)}
                  aria-pressed={isSelected}
                  className={`group relative flex items-center justify-between rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 transition-all duration-200 text-left outline-none cursor-pointer border ${
                    isSelected
                      ? "bg-[#D6E2D1] border-[#4F6C47] shadow-[0_3px_12px_rgba(40,65,35,0.12)] scale-[1.01]"
                      : "bg-[#F7F4EC]/90 border-[#DCD4C2] hover:border-[#839F77] hover:bg-white shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {/* Flag representation */}
                    <span className="relative flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-[#C8C0AF] bg-[#EFECE4] shadow-xs">
                      <CountryFlag code={loc.countryCode} country={loc.country} />
                    </span>

                    {/* Country & City Name */}
                    <div className="min-w-0">
                      <p className="font-heading text-xs sm:text-[13px] font-medium text-[#1E2E22] leading-tight truncate">
                        {loc.country}
                      </p>
                      <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4E6347] leading-tight truncate mt-0.5">
                        {loc.city}
                      </p>
                    </div>
                  </div>

                  {/* Right Arrow Icon */}
                  <div className="shrink-0 pl-1.5">
                    <ArrowRight
                      className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200 ${
                        isSelected
                          ? "text-[#1E2E22] translate-x-0.5"
                          : "text-[#788870] group-hover:text-[#1E2E22] group-hover:translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
