/**
 * Reusable Global Reach & International Locations Dataset
 * Designed to easily add or update international hubs, coordinates, and metadata.
 */

export const GLOBAL_LOCATIONS = [
  {
    id: "uae-dubai",
    country: "UAE",
    city: "DUBAI",
    label: "Dubai, UAE",
    countryCode: "ae",
    flagEmoji: "🇦🇪",
    lat: 25.2048,
    lon: 55.2708,
    order: 1
  },
  {
    id: "ch-zurich",
    country: "Switzerland",
    city: "ZURICH",
    label: "Zurich, Switzerland",
    countryCode: "ch",
    flagEmoji: "🇨🇭",
    lat: 47.3769,
    lon: 8.5417,
    order: 2
  },
  {
    id: "gb-london",
    country: "United Kingdom",
    city: "LONDON",
    label: "London, UK",
    countryCode: "gb",
    flagEmoji: "🇬🇧",
    lat: 51.5074,
    lon: -0.1278,
    order: 3
  },
  {
    id: "in-chandigarh",
    country: "India",
    city: "CHANDIGARH",
    label: "Chandigarh, India",
    countryCode: "in",
    flagEmoji: "🇮🇳",
    lat: 30.7333,
    lon: 76.7794,
    order: 4
  }
];

export const GLOBAL_REACH_CONFIG = {
  rotationIntervalMs: 5000,
  userPauseDurationMs: 8000,
  eyebrowLabel: "GLOBAL REACH & COLLABORATIONS",
  heading: "Trusted by Premiere Production Houses & Creative Agencies",
  description: "Collaborating with creative teams, production houses and businesses across the globe to bring visual stories to life.",
  bottomHint: "Select a location to explore our global network"
};
