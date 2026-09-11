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
    <div className="py-24 sm:py-32 bg-sage-bg text-forest space-y-12">
      <Container className="space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-site shadow-soft">
            <Sparkles className="h-4 w-4" /> 4K Film Portfolio Showcase
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal text-forest">
            Selected Editorial & Wedding Films
          </h1>
          <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
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
              className="group relative rounded-3xl overflow-hidden border border-sage-light/60 bg-sage-card shadow-soft hover:shadow-editorial transition-all duration-500"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-forest/10">
                <img
                  src={mediaUrl(item.coverImage || item.image)}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-sage-card/90 border border-sage-light/80 text-site flex items-center justify-center shadow-sage transition-transform duration-300 group-hover:scale-110">
                    <Play className="h-5 w-5 ml-0.5" />
                  </div>
                </div>
                <span className="absolute top-4 left-4 rounded-full border border-sage-light/60 bg-sage-card/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-site backdrop-blur-md">
                  {item.category}
                </span>
              </div>

              <div className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-forest group-hover:text-site transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-sage-muted">{item.client}</p>
                </div>
                <span className="h-8 w-8 rounded-full border border-sage-border text-forest flex items-center justify-center group-hover:border-[rgb(72,125,72)] group-hover:bg-[rgb(72,125,72)] group-hover:text-white transition-all">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </m.div>
          ))}
        </div>
      </Container>
    </div>
  );
}
