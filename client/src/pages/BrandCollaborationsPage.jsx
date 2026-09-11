import { m } from "framer-motion";
import { Award } from "lucide-react";
import Container from "../components/ui/Container.jsx";
import { mediaUrl } from "../lib/api.js";
import { useCmsCollection } from "../lib/useCmsCollection.js";

export default function BrandCollaborationsPage() {
  const { items, loading, error } = useCmsCollection("/api/v1/cms/collaborations", "collaborations");

  return (
    <div className="py-24 sm:py-32 bg-sage-bg text-forest space-y-12">
      <Container className="space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-site shadow-soft">
            <Award className="h-4 w-4" /> Commercial Brand Campaigns
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal text-forest">
            Brand Collaborations & Campaigns
          </h1>
          <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
            Collaborating with global luxury brands, fashion houses, and editorial studios.
          </p>
        </div>

        {loading && <p className="text-center text-sm text-sage-muted">Loading collaborations...</p>}
        {error && <p className="text-center text-sm text-rose-700">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-center text-sm text-sage-muted">No published brand collaborations are available yet.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <m.div
              key={item._id || item.id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="group rounded-3xl border border-sage-light/60 bg-sage-card p-6 shadow-soft hover:shadow-editorial transition-all space-y-4"
            >
              {(item.coverImage || item.heroImage) && (
                <div className="h-44 rounded-2xl overflow-hidden bg-forest/5 border border-sage-border">
                  <img src={mediaUrl(item.coverImage || item.heroImage)} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-site bg-sage-secondary/70 px-2.5 py-0.5 rounded-full border border-[rgb(72,125,72)]/20">
                  {item.brandName} • {item.category}
                </span>
                <h3 className="font-heading text-2xl text-forest font-semibold">{item.title}</h3>
                <p className="text-xs text-sage-muted leading-relaxed">{item.shortDescription}</p>
              </div>
            </m.div>
          ))}
        </div>
      </Container>
    </div>
  );
}
