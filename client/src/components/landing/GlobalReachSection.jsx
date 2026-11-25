import { useEffect, useState, useRef, useCallback } from "react";
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

  // Sync with CMS if custom heading/description is defined
  useEffect(() => {
    let active = true;
    async function loadCmsData() {
      try {
        const res = await apiFetch("/api/v1/cms/collaborations/global-reach");
        if (active && res?.data) {
          setCmsConfig(res.data);
        }
      } catch {
        // Safe offline fallback
      }
    }

    loadCmsData();

    const unsub = typeof subscribeToCmsChanges === "function"
      ? subscribeToCmsChanges((entity) => {
          if (entity === "globalReach" || entity === "sitesettings" || entity === "settings") {
            loadCmsData();
          }
        })
      : null;

    return () => {
      active = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const heading = cmsConfig?.heading || GLOBAL_REACH_CONFIG.heading;
  const description = cmsConfig?.description || GLOBAL_REACH_CONFIG.description;
  const isEnabled = cmsConfig?.enabled !== false;

  const activeLocation = GLOBAL_LOCATIONS[selectedIndex] || GLOBAL_LOCATIONS[0];

  // Automatic sequential location rotation
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % GLOBAL_LOCATIONS.length);
    }, GLOBAL_REACH_CONFIG.rotationIntervalMs);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle card click
  const handleCardClick = (index) => {
    setSelectedIndex(index);
    setIsPaused(true);

    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, GLOBAL_REACH_CONFIG.userPauseDurationMs);
  };

  // Handle manual globe interaction pause
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
        <div className="text-center max-w-4xl mx-auto space-y-3.5">
          {/* Eyebrow with horizontal line dividers */}
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <span className="h-[1px] w-12 sm:w-20 bg-[#CBD6C5]" aria-hidden="true" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#3E5C3E]">
              {GLOBAL_REACH_CONFIG.eyebrowLabel}
            </span>
            <span className="h-[1px] w-12 sm:w-20 bg-[#CBD6C5]" aria-hidden="true" />
          </div>

          {/* Heading in elegant serif */}
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-normal tracking-tight text-[#1B3322] leading-[1.18]">
            {heading}
          </h2>

          {/* Supporting Description */}
          <p className="text-xs sm:text-sm text-[#5B6D55] max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Main Interactive Stage: 3D Globe (Left) + 2x2 Location Cards (Right) */}
        <div className="mt-10 sm:mt-14 lg:mt-16 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] items-center gap-8 sm:gap-10 lg:gap-12">
          {/* Left: Interactive 3D Earth Globe */}
          <div className="relative w-full flex items-center justify-center">
            <Interactive3DGlobe
              activeLocation={activeLocation}
              onSelectLocation={setSelectedIndex}
              onUserInteractionChange={handleGlobeInteraction}
            />
          </div>

          {/* Right: Status Indicator & 2x2 Location Grid */}
          <div className="flex flex-col justify-center space-y-6 sm:space-y-7 max-w-xl mx-auto lg:mx-0 w-full">
            {/* Live Indicator Pill */}
            <div className="flex items-center gap-2 select-none self-start">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#487D48] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#487D48]" />
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3E5C3E]">
                LOCATIONS UPDATING
              </span>
            </div>

            {/* 2x2 Grid of Location Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full">
              {GLOBAL_LOCATIONS.map((loc, idx) => {
                const isSelected = idx === selectedIndex;
                const flagCode = (loc.countryCode || "").toLowerCase();

                return (
                  <button
                    key={loc.id}
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
                        <span className="fallback-flag hidden text-lg leading-none" aria-hidden="true">
                          {loc.flagEmoji}
                        </span>
                      </span>

                      {/* Country & City Name */}
                      <div className="min-w-0">
                        <p className="font-heading text-base sm:text-[17px] font-medium text-[#1B3322] leading-snug truncate">
                          {loc.country}
                        </p>
                        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556D4F] mt-0.5 truncate">
                          {loc.city}
                        </p>
                      </div>
                    </div>

                    {/* Right Arrow Icon */}
                    <div className="shrink-0 pl-2">
                      <ArrowRight
                        className={`h-4 w-4 transition-transform duration-300 ${
                          isSelected
                            ? "text-[#1B3322] translate-x-1"
                            : "text-[#4A6346] group-hover:text-[#1B3322] group-hover:translate-x-1"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Subtle Helper Text with Lines */}
            <div className="pt-2 flex items-center justify-center gap-3 sm:gap-4 select-none">
              <span className="h-[1px] w-8 sm:w-14 bg-[#CBD6C5]" aria-hidden="true" />
              <p className="font-serif italic text-xs sm:text-[13px] text-[#4E6248] tracking-wide text-center">
                {GLOBAL_REACH_CONFIG.bottomHint}
              </p>
              <span className="h-[1px] w-8 sm:w-14 bg-[#CBD6C5]" aria-hidden="true" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
