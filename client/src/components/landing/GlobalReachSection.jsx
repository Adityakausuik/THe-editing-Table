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
      className="relative z-10 border-b border-[#E3ECE0]/80 bg-[#FAFBF8] py-14 sm:py-20 lg:py-24 overflow-hidden transition-colors duration-500"
    >
      <Container>
        {/* Editorial Section Header with Decorative Lines */}
        <div className="text-center max-w-4xl mx-auto space-y-3.5 px-2">
          {/* Eyebrow with horizontal line dividers */}
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <span className="h-[1px] w-10 sm:w-20 bg-[#CBD6C5]" aria-hidden="true" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#78866A]">
              {GLOBAL_REACH_CONFIG.eyebrowLabel}
            </span>
            <span className="h-[1px] w-10 sm:w-20 bg-[#CBD6C5]" aria-hidden="true" />
          </div>

          {/* Heading in Deep Forest Green (#263D2D) */}
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-normal tracking-tight text-[#263D2D] leading-[1.18]">
            {heading}
          </h2>

          {/* Supporting Description in Soft Grey (#777D76) */}
          <p className="text-xs sm:text-sm text-[#777D76] max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Main Interactive Stage: 3D Globe (Left) + 2x2 Location Cards (Right) */}
        <div className="mt-10 sm:mt-14 lg:mt-16 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] items-center gap-8 sm:gap-10 lg:gap-12">
          {/* Left: Interactive 3D Earth Globe */}
          <div className="relative w-full flex items-center justify-center">
            <Interactive3DGlobe
              activeLocation={activeLocation}
              locations={allLocations}
              onSelectLocation={setSelectedIndex}
              onUserInteractionChange={handleGlobeInteraction}
            />
          </div>

          {/* Right: Status Indicator & 2x2 Location Grid */}
          <div className="flex flex-col justify-center space-y-5 sm:space-y-7 max-w-xl mx-auto lg:mx-0 w-full px-1">
            {/* Live Indicator Pill */}
            <div className="flex items-center gap-2 select-none self-start">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#487D48] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#487D48]" />
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#78866A]">
                LOCATIONS UPDATING
              </span>
            </div>

            {/* 2x2 Grid of Location Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full">
              {cardLocations.map((loc, idx) => {
                const isSelected = idx === (selectedIndex % cardLocations.length);
                const flagCode = (loc.countryCode || "").toLowerCase();

                return (
                  <button
                    key={loc.id || `${loc.country}-${loc.city}-${idx}`}
                    type="button"
                    onClick={() => handleCardClick(idx)}
                    aria-pressed={isSelected}
                    className={`group relative flex items-center justify-between rounded-xl px-4 sm:px-5 py-3.5 sm:py-4 transition-all duration-300 text-left outline-none cursor-pointer ${
                      isSelected
                        ? "bg-[#E6EFE2] border-[1.5px] border-[#5E8252] shadow-[0_4px_16px_rgba(40,65,35,0.08)]"
                        : "bg-white border border-[#E3ECE0] hover:border-[#8BAF79] hover:bg-[#F6FAF4]/80 shadow-[0_2px_8px_rgba(40,65,35,0.02)]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Flag Image with Emoji Fallback */}
                      <span className="relative flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-[#D5E0CF] bg-[#F2F7F0] shadow-2xs">
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
                        <span className="fallback-flag text-base leading-none" aria-hidden="true">
                          {loc.flag || "🌐"}
                        </span>
                      </span>

                      {/* Country & City Name in Designated Typography */}
                      <div className="min-w-0">
                        <p className="font-heading text-base sm:text-[17px] font-medium text-[#263D2D] leading-snug truncate">
                          {loc.country}
                        </p>
                        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#526B55] mt-0.5 truncate">
                          {loc.city}
                        </p>
                      </div>
                    </div>

                    {/* Right Arrow Icon */}
                    <div className="shrink-0 pl-2">
                      <ArrowRight
                        className={`h-4 w-4 transition-transform duration-300 ${
                          isSelected
                            ? "text-[#263D2D] translate-x-1"
                            : "text-[#526B55] group-hover:text-[#263D2D] group-hover:translate-x-1"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
