import { m } from "framer-motion";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container.jsx";
import { mediaUrl } from "../lib/api.js";
import { useCmsCollection } from "../lib/useCmsCollection.js";

export default function BlogListingPage() {
  const { items: posts, loading, error } = useCmsCollection("/api/v1/cms/blog", "blogs");
  const [search, setSearch] = useState("");

  const filteredPosts = posts.filter((p) => (p.title || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="py-16 sm:py-20 bg-sage-bg text-forest space-y-8">
      <Container className="space-y-8">
        <div className="text-center space-y-3.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-site shadow-xs">
            <BookOpen className="h-3.5 w-3.5" /> Editorial Journal & Craft Insights
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-forest">
            Post-Production Journal
          </h1>
          <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
            Deep-dives into film emulation, color grading science, RAW workflow optimization, and editorial art direction.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search journal articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.75rem" }}
            className="field-luxury text-sm"
          />
        </div>

        {loading && <p className="text-center text-sm text-sage-muted">Loading journal articles...</p>}
        {error && <p className="text-center text-sm text-rose-700">{error}</p>}
        {!loading && !error && filteredPosts.length === 0 && (
          <p className="text-center text-sm text-sage-muted">No published journal articles are available yet.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post, idx) => (
            <m.div
              key={post._id || post.id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="group rounded-2xl border border-sage-border/80 bg-white p-5 shadow-xs hover:border-site/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                {post.coverImage && (
                  <div className="h-40 rounded-xl overflow-hidden bg-forest/5 border border-sage-border">
                    <img src={mediaUrl(post.coverImage)} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-site bg-sage-secondary/70 px-2.5 py-0.5 rounded-full border border-[rgb(72,125,72)]/20">
                    {post.category} • {post.readTime}
                  </span>
                  <h2 className="font-heading text-lg sm:text-xl font-normal text-forest group-hover:text-site transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-xs text-sage-muted leading-relaxed line-clamp-3">{post.excerpt}</p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-sage-border/40 flex items-center justify-between">
                <Link
                  to={`/blog/${post.slug || post._id || post.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-forest group-hover:text-site transition-colors"
                >
                  Read Full Article <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </m.div>
          ))}
        </div>
      </Container>
    </div>
  );
}
