import { useSiteSettings } from "../../lib/useSiteSettings.js";

const DEFAULT_TRUST_ITEMS = [
  "Vogue Weddings",
  "Harper's Bazaar",
  "Grace Ormonde",
  "WedLuxe Magazine",
  "Style Me Pretty",
  "Over The Moon",
  "Junebug Weddings"
];

export default function TrustStrip() {
  const { settings } = useSiteSettings();
  const cmsTrustItems = settings.publicContent?.trustItems;
  const trustItems = Array.isArray(cmsTrustItems) && cmsTrustItems.length > 0
    ? cmsTrustItems
    : DEFAULT_TRUST_ITEMS;

  return (
    <section data-theme="about" className="border-y border-sage-border/60 bg-sage-secondary/70 py-6 overflow-hidden" aria-label="Trusted by">
      <div className="relative flex overflow-x-hidden">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12 text-sm font-medium uppercase tracking-[0.2em] text-sage-muted">
          {[...trustItems, ...trustItems, ...trustItems].map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-12">
              <span className="hover:text-site transition-colors">{item}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-sage-light" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
