import { useEffect, useMemo, useState } from "react";
import { apiFetch, subscribeToCmsChanges } from "../../lib/api.js";
import Container from "../ui/Container.jsx";

const DEFAULT_GLOBAL_REACH = {
  enabled: true,
  heading: "TRUSTED BY PREMIERE PRODUCTION HOUSES & CREATIVE AGENCIES",
  description: "Collaborating with creative teams, production houses and businesses across the globe to bring visual stories to life.",
  speed: 35,
  direction: "left",
  pauseOnHover: true,
  countries: [
    { id: "US", code: "US", name: "United States", flag: "🇺🇸", active: true, order: 1 },
    { id: "GB", code: "GB", name: "United Kingdom", flag: "🇬🇧", active: true, order: 2 },
    { id: "FR", code: "FR", name: "France", flag: "🇫🇷", active: true, order: 3 },
    { id: "IT", code: "IT", name: "Italy", flag: "🇮🇹", active: true, order: 4 },
    { id: "AE", code: "AE", name: "UAE", flag: "🇦🇪", active: true, order: 5 },
    { id: "CH", code: "CH", name: "Switzerland", flag: "🇨🇭", active: true, order: 6 },
    { id: "JP", code: "JP", name: "Japan", flag: "🇯🇵", active: true, order: 7 },
    { id: "AU", code: "AU", name: "Australia", flag: "🇦🇺", active: true, order: 8 },
    { id: "IN", code: "IN", name: "India", flag: "🇮🇳", active: true, order: 9 },
    { id: "MC", code: "MC", name: "Monaco", flag: "🇲🇨", active: true, order: 10 }
  ]
};

export default function GlobalReachSection() {
  const [data, setData] = useState(DEFAULT_GLOBAL_REACH);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const res = await apiFetch("/api/v1/cms/collaborations/global-reach");
        if (active && res?.data) {
          setData((prev) => ({
            ...prev,
            ...res.data,
            countries: Array.isArray(res.data.countries) && res.data.countries.length > 0
              ? res.data.countries
              : prev.countries
          }));
        }
      } catch {
        // Safe offline fallback
      }
    }

    loadData();

    // Subscribe to CMS changes if available
    const unsub = typeof subscribeToCmsChanges === "function"
      ? subscribeToCmsChanges((entity) => {
          if (entity === "globalReach" || entity === "sitesettings" || entity === "settings") {
            loadData();
          }
        })
      : null;

    return () => {
      active = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const isEnabled = data.enabled !== false;
  const activeCountries = useMemo(() => {
    const list = Array.isArray(data.countries) ? data.countries : [];
    return list
      .filter((c) => c && c.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [data.countries]);

  if (!isEnabled || activeCountries.length === 0) {
    return null;
  }

  // Ensure enough items to fill the marquee seamlessly
  // Repeat array so total items is at least 14 before duplicating for track
  let baseItems = [...activeCountries];
  while (baseItems.length < 12) {
    baseItems = [...baseItems, ...activeCountries];
  }

  const speedDuration = Math.max(12, Math.min(100, Number(data.speed) || 35));
  const isRight = data.direction === "right";

  return (
    <section
      aria-label="Global Reach and International Collaborations"
      className="relative z-10 border-b border-sage-border/70 bg-sage-bg/95 backdrop-blur-md py-12 sm:py-16 md:py-20 overflow-hidden transition-colors duration-500"
    >
      <Container className="text-center">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-sage-border/80 bg-sage-card/90 px-3.5 py-1 text-[11px] sm:text-xs font-medium uppercase tracking-widest text-site shadow-xs mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-site animate-pulse" />
          Global Reach &amp; Collaborations
        </div>

        {/* Section Heading */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-serif font-semibold tracking-tight text-forest-900 max-w-4xl mx-auto leading-tight sm:leading-snug">
          {data.heading || DEFAULT_GLOBAL_REACH.heading}
        </h2>

        {/* Section Description */}
        <p className="mt-3.5 sm:mt-4 text-sm sm:text-base text-charcoal-600 max-w-2xl mx-auto leading-relaxed">
          {data.description || DEFAULT_GLOBAL_REACH.description}
        </p>
      </Container>

      {/* Marquee Ticker Container */}
      <div className="relative mt-8 sm:mt-12 w-full overflow-hidden">
        {/* Left & Right Elegant Edge Gradient Fades */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 md:w-40 z-20 bg-gradient-to-r from-sage-bg via-sage-bg/80 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 md:w-40 z-20 bg-gradient-to-l from-sage-bg via-sage-bg/80 to-transparent"
        />

        {/* Scrolling Track: 2 identical sets of baseItems for a continuous seamless loop */}
        <div
          className={`flex w-max items-center ${
            data.pauseOnHover !== false ? "hover:[animation-play-state:paused]" : ""
          }`}
          style={{
            animation: `${isRight ? "marquee-scroll-right" : "marquee-scroll-left"} ${speedDuration}s linear infinite`
          }}
        >
          {/* Track 1 */}
          <div className="flex shrink-0 items-center gap-6 sm:gap-10 md:gap-14 pr-6 sm:pr-10 md:pr-14">
            {baseItems.map((country, idx) => (
              <CountryPill key={`track1-${country.id || country.code}-${idx}`} country={country} />
            ))}
          </div>

          {/* Track 2 (Exact Duplicate for Seamless Loop) */}
          <div
            aria-hidden="true"
            className="flex shrink-0 items-center gap-6 sm:gap-10 md:gap-14 pr-6 sm:pr-10 md:pr-14"
          >
            {baseItems.map((country, idx) => (
              <CountryPill key={`track2-${country.id || country.code}-${idx}`} country={country} />
            ))}
          </div>
        </div>
      </div>

      {/* Scoped Keyframes for Marquee Animation */}
      <style>{`
        @keyframes marquee-scroll-left {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes marquee-scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none !important;
            overflow-x: auto;
          }
        }
      `}</style>
    </section>
  );
}

function CountryPill({ country }) {
  const code = (country.code || "").toLowerCase();
  const flagEmoji = country.flag || "🌐";
  const name = country.name || country.code || "Global";

  return (
    <div className="flex items-center gap-3 sm:gap-4 shrink-0 select-none">
      <div className="group/item flex items-center gap-2.5 sm:gap-3 rounded-full border border-sage-border/80 bg-sage-card/90 px-4 sm:px-5 py-2 sm:py-2.5 shadow-xs transition-all duration-300 hover:border-site/50 hover:bg-sage-card hover:shadow-soft hover:-translate-y-0.5">
        {/* National Flag Graphic with Emoji Fallback */}
        <span className="relative flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[2px] shadow-2xs border border-sage-border/60 bg-sage-secondary/40">
          {code && code.length === 2 ? (
            <>
              <img
                src={`https://flagcdn.com/w40/${code}.png`}
                srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
                width="24"
                height="16"
                alt={`${name} flag`}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".fallback-emoji");
                  if (fallback) fallback.style.display = "inline";
                }}
              />
              <span className="fallback-emoji hidden text-sm leading-none" aria-hidden="true">
                {flagEmoji}
              </span>
            </>
          ) : (
            <span className="text-sm leading-none" aria-hidden="true">
              {flagEmoji}
            </span>
          )}
        </span>

        {/* Country Name */}
        <span className="text-xs sm:text-sm md:text-base font-medium tracking-wide text-charcoal-800 group-hover/item:text-forest-900 transition-colors whitespace-nowrap">
          {name}
        </span>
      </div>

      {/* Elegant Separator */}
      <span
        aria-hidden="true"
        className="text-[10px] sm:text-xs text-site/60 select-none font-serif tracking-widest pl-1"
      >
        ✦
      </span>
    </div>
  );
}
