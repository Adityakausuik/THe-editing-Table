import { AnimatePresence, m } from "framer-motion";
import { ArrowUpRight, Film, Play, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FALLBACK_MEDIA_URL, mediaUrl } from "../../lib/api.js";
import { useCmsCollection } from "../../lib/useCmsCollection.js";
import Container from "../ui/Container.jsx";

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

export default function PortfolioSection() {
  const { items } = useCmsCollection("/api/v1/cms/portfolio", "portfolio");
  const displayItems = Array.isArray(items) && items.length > 0 ? items : DEFAULT_PORTFOLIO_ITEMS;
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const categories = useMemo(
    () => ["All", ...new Set(displayItems.map((item) => item.category).filter(Boolean))],
    [displayItems]
  );

  const filteredItems = displayItems.filter((item) => {
    if (activeCategory === "All") return true;
    return (item.category || "").toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <section aria-label="Selected Portfolio Projects" className="py-24 sm:py-32 bg-sage-bg text-forest relative overflow-hidden">
      <Container>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-sage-border/80">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-site shadow-soft">
              <Film className="h-3.5 w-3.5" /> Featured Showcases
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-forest leading-tight">
              Selected Editorial & Cinematic Works
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-12">
          {filteredItems.map((item, idx) => (
            <m.button
              key={item._id || item.id || idx}
              type="button"
              aria-label={`Open ${item.title} showcase`}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="group relative w-full rounded-3xl overflow-hidden border border-sage-light/60 bg-sage-card text-left shadow-soft hover:shadow-editorial transition-all duration-500"
              onClick={() => setSelectedVideo(item)}
            >
              {/* Image Preview Container */}
              <div className="relative aspect-[16/10] overflow-hidden bg-forest/10">
                <img
                  src={mediaUrl(item.coverImage || item.image)}
                  alt={item.title}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_MEDIA_URL; }}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-obsidian/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-sage-card/90 border border-sage-light/80 text-site flex items-center justify-center shadow-sage transition-transform duration-300 group-hover:scale-110">
                    <Play className="h-5 w-5 ml-0.5" />
                  </div>
                </div>

                {/* Category Badge */}
                <span className="absolute top-4 left-4 rounded-full border border-sage-light/60 bg-sage-card/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-site backdrop-blur-md shadow-soft">
                  {item.category}
                </span>
              </div>

              {/* Card Footer */}
              <div className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-forest group-hover:text-site transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-sage-muted">{item.client}</p>
                </div>

                <span className="h-8 w-8 rounded-full border border-sage-border text-forest flex items-center justify-center group-hover:border-[rgb(72,125,72)] group-hover:bg-[rgb(72,125,72)] group-hover:text-white transition-all">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </m.button>
          ))}
        </div>
      </Container>

      {/* Video Lightbox Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest/90 p-4 backdrop-blur-md"
            onClick={() => setSelectedVideo(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedVideo.title} showcase`}
          >
            <div
              className="relative max-w-4xl w-full rounded-3xl overflow-hidden border border-sage-light/40 bg-obsidian shadow-deep p-4 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                aria-label="Close showcase"
                className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-sage-light/40 bg-forest/60 text-white hover:bg-[rgb(72,125,72)]"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                <img src={mediaUrl(selectedVideo.coverImage || selectedVideo.image)} alt="" className="h-full w-full object-cover filter brightness-75" />
              </div>

              <div className="px-2 space-y-1 text-forest">
                <span className="text-[10px] font-bold uppercase tracking-widest text-site">
                  {selectedVideo.category} Showcase
                </span>
                <h3 className="font-heading text-2xl">{selectedVideo.title}</h3>
                <p className="text-xs text-white/70">{selectedVideo.description}</p>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}
