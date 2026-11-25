import { m } from "framer-motion";
import { ArrowUpRight, Play, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import Container from "../components/ui/Container.jsx";
import { mediaUrl } from "../lib/api.js";
import { useCmsCollection } from "../lib/useCmsCollection.js";

const DEFAULT_PORTFOLIO_ITEMS = [
  {
    _id: "p1",
    title: "The Glass House Estate",
    category: "Photography",
    client: "Editorial Retouching Suite",
    coverImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85",
    description: "High-end photo editing and micro dodge-and-burn retouching for luxury architectural & editorial imagery."
  },
  {
    _id: "p2",
    title: "Tuscan Sun Twilight Vows",
    category: "Weddings",
    client: "Cinematic Wedding Cinema",
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
    description: "Cinematic 4K wedding highlight edit featuring custom 35mm film color science and audio mastering."
  },
  {
    _id: "p3",
    title: "Amalfi Coast Editorial",
    category: "Films",
    client: "Creative Post-Production",
    coverImage: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85",
    description: "Professional film post-production with Dolby Vision HDR grading, sound design, and master finishing."
  }
];

export default function PortfolioPage() {
  const { items: incomingItems, loading, error } = useCmsCollection("/api/v1/cms/portfolio", "portfolio");
  const items = Array.isArray(incomingItems) && incomingItems.length > 0 ? incomingItems : DEFAULT_PORTFOLIO_ITEMS;
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = useMemo(
    () => ["All", ...new Set(items.map((item) => item.category).filter(Boolean))],
    [items]
  );

  const filteredItems = items.filter((item) => {
    if (activeCategory === "All") return true;
    return (item.category || "").toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="pt-24 sm:pt-28 pb-16 sm:pb-20 bg-sage-bg text-forest space-y-10">
      <Container className="space-y-10">
        <div className="text-center space-y-3.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-site shadow-xs">
            <Sparkles className="h-3.5 w-3.5" /> 4K Film Portfolio Showcase
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-forest leading-tight">
            Selected Editorial &amp; Wedding Films
          </h1>
          <p className="text-xs sm:text-sm text-sage-muted leading-relaxed max-w-2xl mx-auto">
            Explore our curated portfolio of luxury wedding films, fashion brand campaigns, and commercial edits.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
              className={`filter-pill ${activeCategory === cat ? "is-active" : ""}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-sm text-sage-muted">Loading portfolio...</p>}
        {error && <p className="text-center text-sm text-rose-700">{error}</p>}
        {!loading && !error && filteredItems.length === 0 && (
          <p className="text-center text-sm text-sage-muted">No published portfolio projects are available yet.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => (
            <m.div
              key={item._id || item.id || idx}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="group relative rounded-2xl overflow-hidden border border-sage-border/80 bg-white transition-all duration-300 hover:border-site/50 shadow-xs"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-forest/10">
                <img
                  src={mediaUrl(item.coverImage || item.image)}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-11 w-11 rounded-full bg-white/95 border border-sage-border text-site flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Play className="h-4 w-4 ml-0.5" />
                  </div>
                </div>
                <span className="absolute top-3.5 left-3.5 rounded-full border border-sage-border bg-white/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-site backdrop-blur-md">
                  {item.category}
                </span>
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg sm:text-xl font-normal text-forest group-hover:text-site transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-sage-muted mt-0.5">{item.client}</p>
                </div>
                <span className="h-8 w-8 rounded-full border border-sage-border text-forest flex items-center justify-center group-hover:border-[rgb(72,125,72)] group-hover:bg-[rgb(72,125,72)] group-hover:text-white transition-all">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </m.div>
          ))}
        </div>
      </Container>
    </div>
  );
}
