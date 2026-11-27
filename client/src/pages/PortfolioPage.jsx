import { AnimatePresence, m } from "framer-motion";
import { ArrowUpRight, Film, Play, X } from "lucide-react";
import { useMemo, useState } from "react";
import Container from "../components/ui/Container.jsx";
import { mediaUrl } from "../lib/api.js";
import { useCmsCollection } from "../lib/useCmsCollection.js";
import { getYouTubeId } from "../utils/youtube.js";

const DEFAULT_PORTFOLIO_ITEMS = [
  {
    _id: "p1",
    title: "Cinematic Film Production",
    category: "Commercial Film",
    client: "Arri & Red RAW Cinema",
    coverImage: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85",
    description: "4K RAW cinema camera post-production, multi-camera sync, pacing and DaVinci color grading."
  },
  {
    _id: "p2",
    title: "Royal Heritage Wedding",
    category: "Weddings",
    client: "Luxury Bridal Cinema",
    coverImage: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85",
    description: "Heritage wedding editorial retouching, fine jewelry skin tone preservation, and cinematic color grade."
  },
  {
    _id: "p3",
    title: "Alpine River Expeditions",
    category: "Brand Campaign",
    client: "Outdoor Narrative Films",
    coverImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    description: "Aerial mountain cinematography, natural light color timing, dynamic HDR mastering and sound design."
  },
  {
    _id: "p4",
    title: "Artisanal Botanical Still",
    category: "Commercial",
    client: "Culinary & Beverage Brand",
    coverImage: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1200&q=85",
    description: "High-end product color refinement, glass reflection cleanup, and micro contrast calibration."
  },
  {
    _id: "p5",
    title: "The Glass House Estate",
    category: "Photography",
    client: "Editorial Retouching Suite",
    coverImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85",
    description: "High-end photo editing and micro dodge-and-burn retouching for luxury architectural & editorial imagery."
  },
  {
    _id: "p6",
    title: "Amalfi Coast Editorial",
    category: "Films",
    client: "Creative Post-Production",
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
    description: "Professional film post-production with Dolby Vision HDR grading, sound design, and master finishing."
  }
];

export default function PortfolioPage() {
  const { items: incomingItems, loading, error } = useCmsCollection("/api/v1/cms/portfolio", "portfolio");
  const items = Array.isArray(incomingItems) && incomingItems.length > 0 ? incomingItems : DEFAULT_PORTFOLIO_ITEMS;
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedVideo, setSelectedVideo] = useState(null);
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
            <Film className="h-3.5 w-3.5" /> 4K Film Portfolio Showcase
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
              onClick={() => setSelectedVideo(item)}
              role="button"
              tabIndex={0}
              aria-label={`Open ${item.title} showcase`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedVideo(item); }}
              className="group relative rounded-2xl overflow-hidden border border-sage-border/80 bg-white transition-all duration-300 hover:border-site/50 shadow-xs cursor-pointer text-left"
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
                className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-sage-light/40 bg-forest/60 text-white hover:bg-[rgb(72,125,72)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                {selectedVideo.videoUrl ? (
                  getYouTubeId(selectedVideo.videoUrl) ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(selectedVideo.videoUrl)}?autoplay=1&playsinline=1`}
                      title={selectedVideo.title || "Portfolio Video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <video
                      src={mediaUrl(selectedVideo.videoUrl)}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                    />
                  )
                ) : (
                  <img src={mediaUrl(selectedVideo.coverImage || selectedVideo.image)} alt="" className="h-full w-full object-cover filter brightness-75" />
                )}
              </div>

              <div className="px-2 space-y-1 text-white">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9dc07a]">
                  {selectedVideo.category} Showcase
                </span>
                <h3 className="font-heading text-2xl text-white">{selectedVideo.title}</h3>
                {selectedVideo.description && (
                  <p className="text-xs text-white/70">{selectedVideo.description}</p>
                )}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
