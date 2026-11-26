import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { apiFetch, subscribeToCmsChanges } from "../../lib/api.js";
import Container from "../ui/Container.jsx";
import Interactive3DGlobe from "./Interactive3DGlobe.jsx";
import { GLOBAL_LOCATIONS, GLOBAL_REACH_CONFIG } from "../../data/globalLocations.js";

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

    // Listen to BroadcastChannel directly for instant cross-tab sync
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

  // Featured 4 locations for public 2x2 grid
  const cardLocations = useMemo(() => {
    const featured = allLocations.filter((l) => l.featured);
    const chosen = featured.length >= 4 ? featured.slice(0, 4) : allLocations.slice(0, 4);
    return chosen.length > 0 ? chosen : GLOBAL_LOCATIONS.slice(0, 4);
  }, [allLocations]);

  // Active location highlighted on globe
  const activeLocation = cardLocations[selectedIndex % cardLocations.length] || cardLocations[0];

  // Automatic sequential location rotation (every 5 seconds)
  useEffect(() => {
    if (isPaused || cardLocations.length === 0) return;

    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % cardLocations.length);
    }, GLOBAL_REACH_CONFIG.rotationIntervalMs);

    return () => clearInterval(interval);
  }, [isPaused, cardLocations.length]);

  // Handle manual card click
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
      className="relative z-10 border-b border-[#E3ECE0]/80 bg-[#FAFBF8] py-10 sm:py-12 lg:py-14 overflow-hidden transition-colors duration-500 scroll-mt-20"
    >
      <Container className="max-w-[1240px]">
        {/* Responsive Balanced Layout: 2 Columns on Desktop/Laptop, Single Column on Mobile/Tablet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 xl:gap-12 items-center">
          {/* ================= LEFT COLUMN: Editorial Intro & Supporting Content ================= */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-3 sm:space-y-4 max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
            {/* Eyebrow Label with decorative accent lines */}
            <div className="flex items-center justify-center lg:justify-start gap-2.5 sm:gap-3 select-none">
              <span className="h-[1px] w-6 sm:w-8 bg-[#CBD6C5]" aria-hidden="true" />
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#78866A]">
                {GLOBAL_REACH_CONFIG.eyebrowLabel}
              </span>
              <span className="h-[1px] w-6 sm:w-8 bg-[#CBD6C5] lg:hidden" aria-hidden="true" />
            </div>

            {/* Heading in Deep Forest Green (#263D2D) */}
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl lg:text-[1.95rem] xl:text-[2.2rem] font-normal tracking-tight text-[#263D2D] leading-[1.2]">
              {heading}
            </h2>

            {/* Supporting Description in Soft Grey (#777D76) */}
            <p className="text-xs sm:text-[13px] md:text-sm text-[#777D76] leading-relaxed max-w-lg mx-auto lg:mx-0">
              {description}
            </p>

            {/* Supporting Meta / Key Pillars */}
            <div className="pt-1 sm:pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D5E0CF] bg-[#F2F7F0]/90 px-3 py-1 text-[11px] sm:text-xs font-medium text-[#263D2D]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#487D48] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#487D48]" />
                </span>
                <span>Active Global Studios</span>
              </div>
              <span className="text-[11px] sm:text-xs text-[#78866A] hidden sm:inline">
                Worldwide Remote Editorial Delivery
              </span>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: 3D Globe & Location Cards ================= */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-3 sm:space-y-4 w-full">
            {/* 3D Interactive Earth Globe */}
            <div className="w-full flex items-center justify-center">
              <Interactive3DGlobe
                activeLocation={activeLocation}
                locations={allLocations}
                onSelectLocation={setSelectedIndex}
                onUserInteractionChange={handleGlobeInteraction}
              />
            </div>

            {/* Compact 2-Column Location Cards Grid */}
            <div className="w-full max-w-[540px]">
              <div className="flex items-center justify-between mb-1.5 px-1 select-none">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78866A] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#487D48]" />
                  Hubs & Locations
                </span>
                <span className="text-[10px] text-[#777D76] italic hidden sm:inline">
                  Select a location to rotate globe
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
                {cardLocations.map((loc, idx) => {
                  const isSelected = idx === (selectedIndex % cardLocations.length);
                  const flagCode = (loc.countryCode || "").toLowerCase();

                  return (
                    <button
                      key={loc.id || `${loc.country}-${loc.city}-${idx}`}
                      type="button"
                      onClick={() => handleCardClick(idx)}
                      aria-pressed={isSelected}
                      className={`group relative flex items-center justify-between rounded-xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 transition-all duration-200 text-left outline-none cursor-pointer border ${
                        isSelected
                          ? "bg-[#E6EFE2] border-[#5E8252] shadow-[0_2px_10px_rgba(40,65,35,0.08)] scale-[1.01]"
                          : "bg-white/95 border-[#E3ECE0] hover:border-[#8BAF79] hover:bg-white shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        {/* Flag Image with Emoji Fallback */}
                        <span className="relative flex h-4 sm:h-5 w-6 sm:w-7 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-[#D5E0CF] bg-[#F2F7F0]">
                          {loc.flagUrl ? (
                            <img
                              src={loc.flagUrl}
                              alt={`${loc.country} flag`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : flagCode ? (
                            <img
                              src={`https://flagcdn.com/w80/${flagCode}.png`}
                              srcSet={`https://flagcdn.com/w160/${flagCode}.png 2x`}
                              alt={`${loc.country} flag`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fallback = e.currentTarget.parentElement?.querySelector(".fallback-flag");
                                if (fallback) fallback.style.display = "inline";
                              }}
                            />
                          ) : null}
                          <span className="fallback-flag text-xs leading-none" aria-hidden="true">
                            {loc.flag || "🌐"}
                          </span>
                        </span>

                        {/* Country & City Name */}
                        <div className="min-w-0">
                          <p className="font-heading text-xs sm:text-[13px] font-medium text-[#263D2D] leading-tight truncate">
                            {loc.country}
                          </p>
                          <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.12em] text-[#526B55] leading-tight truncate mt-0.5">
                            {loc.city}
                          </p>
                        </div>
                      </div>

                      {/* Right Arrow Icon */}
                      <div className="shrink-0 pl-1">
                        <ArrowRight
                          className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200 ${
                            isSelected
                              ? "text-[#263D2D] translate-x-0.5"
                              : "text-[#78866A] group-hover:text-[#263D2D] group-hover:translate-x-0.5"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
