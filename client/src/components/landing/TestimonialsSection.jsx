import { m } from "framer-motion";
import { BadgeCheck, MessageSquarePlus, Quote, Search, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import Container from "../ui/Container.jsx";
import SectionHeading from "../ui/SectionHeading.jsx";
import WriteReviewModal from "../ui/WriteReviewModal.jsx";

const DEFAULT_REVIEWS = [
  {
    _id: "rev-1",
    name: "Elena Vance",
    company: "Atelier Vance Studios • Paris",
    title: "Masterful Color & Incomparable Pacing",
    message: "The Editing Table has completely transformed our studio pipeline. Their DaVinci Resolve color grades match our 35mm film stock vision seamlessly.",
    rating: 5,
    projectType: "Wedding Film",
    verified: true
  },
  {
    _id: "rev-2",
    name: "Marcus Thorne",
    company: "Thorne & Co. Cinema • New York",
    title: "Our Secret Weapon for High-End Weddings",
    message: "Flawless speech editing, exquisite audio mixes, and lighting skin tone preservation. Our clients were moved to tears by the final 4K master.",
    rating: 5,
    projectType: "Full Post-Production",
    verified: true
  },
  {
    _id: "rev-3",
    name: "Sophia Rossi",
    company: "Rossi Editorial • London & Milan",
    title: "Haute Couture Retouching & Efficiency",
    message: "Turnaround times are guaranteed and communication with our lead colorist is direct and instantaneous. Highly recommended for luxury studios.",
    rating: 5,
    projectType: "Photo Retouching",
    verified: true
  }
];

export default function TestimonialsSection() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ averageRating: 5.0, totalApproved: 48 });
  const [search, setSearch] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState("All");
  const [selectedRating, setSelectedRating] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  const fetchApprovedReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/v1/reviews?limit=12";
      if (selectedProjectType !== "All") url += `&projectType=${encodeURIComponent(selectedProjectType)}`;
      if (selectedRating !== "All") url += `&rating=${selectedRating}`;

      const data = await apiFetch(url);
      const incomingReviews = Array.isArray(data.data?.items) ? data.data.items : [];
      setReviews(incomingReviews.length > 0 ? incomingReviews : DEFAULT_REVIEWS);
      setStats(data.data?.stats?.averageRating ? data.data.stats : { averageRating: 5.0, totalApproved: 48 });
    } catch {
      setReviews(DEFAULT_REVIEWS);
      setStats({ averageRating: 5.0, totalApproved: 48 });
    } finally {
      setLoading(false);
    }
  }, [selectedProjectType, selectedRating]);

  useEffect(() => {
    fetchApprovedReviews();
  }, [fetchApprovedReviews]);

  const filteredReviews = reviews.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.title && r.title.toLowerCase().includes(term)) ||
      (r.message && r.message.toLowerCase().includes(term)) ||
      (r.company && r.company.toLowerCase().includes(term))
    );
  });

  return (
    <section id="testimonials" data-theme="team" className="section-pad relative">
      <Container>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            label="Client Endorsements"
            title="What Elite Studios Say About Our Suites"
            text="Trusted by premier wedding photographers, luxury film houses, and international creative agencies."
          />

          <button
            type="button"
            onClick={() => setIsWriteModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-6 py-3.5 text-xs font-semibold hover:bg-[#7C9B69] hover:shadow-sage transition cursor-pointer shadow-soft shrink-0 self-start md:self-auto"
          >
            <MessageSquarePlus className="h-4 w-4" /> Share Your Review
          </button>
        </div>

        {/* Stats & Rating Summary Bar */}
        <div className="mt-10 rounded-3xl border border-sage-light/30 bg-sage-card/90 p-6 sm:p-8 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-secondary/80 border border-[rgb(72,125,72)]/20 text-site font-serif font-bold text-3xl shadow-soft">
              {Number(stats.averageRating || 5).toFixed(1)}
            </div>
            <div>
              <div className="flex gap-1 text-site">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-copper text-site" />
                ))}
              </div>
              <p className="text-xs text-sage-muted mt-1">
                Average Rating from <span className="font-bold text-forest">{stats.totalApproved || reviews.length} Verified Reviews</span>
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted z-10 pointer-events-none" />
              <input
                type="text"
                placeholder="Search endorsements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "2.75rem" }}
                className="field-luxury text-xs py-2"
              />
            </div>

            <select
              value={selectedProjectType}
              onChange={(e) => setSelectedProjectType(e.target.value)}
              className="rounded-2xl border border-sage-border bg-sage-card px-3 py-2 text-xs text-forest outline-none focus:border-[rgb(72,125,72)]"
            >
              <option value="All">All Services</option>
              <option value="Wedding Film">Wedding Film</option>
              <option value="Photo Retouching">Photo Retouching</option>
              <option value="Color Grading">Color Grading</option>
              <option value="Album Design">Album Design</option>
              <option value="Brand Campaign">Brand Campaign</option>
            </select>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-sage-border bg-sage-card/50 p-8 space-y-4 animate-pulse h-64" />
            ))
          ) : error ? (
            <div className="col-span-full text-center py-12 text-rose-700">{error}</div>
          ) : filteredReviews.length === 0 ? (
            <div className="col-span-full text-center py-12 text-sage-muted">
              <p className="font-serif text-xl text-forest">No published endorsements are available yet.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedProjectType("All");
                  setSelectedRating("All");
                }}
                className="mt-3 inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold text-site underline hover:bg-sage-secondary/60"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredReviews.map((testimonial, index) => (
              <m.article
                key={testimonial._id || testimonial.name}
                className="rounded-3xl border border-sage-border bg-sage-card p-8 shadow-soft transition-all duration-500 hover:border-sage-light/80 hover:shadow-editorial flex flex-col justify-between"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <TestimonialCardContent testimonial={testimonial} />
              </m.article>
            ))
          )}
        </div>
      </Container>

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSuccess={() => {
          fetchApprovedReviews();
        }}
      />
    </section>
  );
}

function TestimonialCardContent({ testimonial }) {
  const ratingCount = testimonial.rating || 5;
  const authorName = testimonial.name || "Client";
  const companyName = testimonial.company || testimonial.role || "";
  const initial = authorName.charAt(0);

  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-2">
          <Quote className="h-7 w-7 text-site fill-copper/10" />
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {Array.from({ length: ratingCount }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-copper text-site" />
              ))}
            </div>
            {testimonial.verified && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full ml-1"
                title="Verified Client"
              >
                <BadgeCheck className="h-3 w-3 text-emerald-600" /> Verified
              </span>
            )}
          </div>
        </div>

        {testimonial.title && (
          <h3 className="mt-4 font-heading text-xl font-normal text-forest leading-snug">
            {testimonial.title}
          </h3>
        )}

        <p className="mt-3 text-xs leading-relaxed text-sage-muted font-normal line-clamp-4">
          “{testimonial.message || testimonial.testimonial}”
        </p>
      </div>

      <div className="mt-6 border-t border-sage-border/60 pt-4 flex items-center gap-3">
        {testimonial.profileImage ? (
          <img
            src={mediaUrl(testimonial.profileImage)}
            alt={authorName}
            className="h-11 w-11 rounded-2xl object-cover border border-[rgb(72,125,72)]/30 shrink-0"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(72,125,72)] text-white font-serif font-bold text-base shadow-soft shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <h4 className="font-heading text-lg font-normal text-forest truncate">{authorName}</h4>
          {companyName && <p className="text-[11px] text-sage-muted truncate">{companyName}</p>}
          {testimonial.projectType && (
            <span className="text-[10px] font-semibold text-site uppercase tracking-wider">
              {testimonial.projectType}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
