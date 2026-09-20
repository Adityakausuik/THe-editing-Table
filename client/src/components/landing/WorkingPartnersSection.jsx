import { m, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import { mediaUrl } from "../../lib/api.js";
import { useCmsCollection } from "../../lib/useCmsCollection.js";
import Container from "../ui/Container.jsx";

const DEFAULT_PARTNERS = [
  {
    _id: "p1",
    name: "Atelier Vance Cinema",
    locationTag: "🇺🇸 🇫🇷 New York • Paris",
    category: "Luxury Wedding Films",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85",
    website: "https://ateliervance.com"
  },
  {
    _id: "p2",
    name: "Maison de L'Amour",
    locationTag: "🇬🇧 🇮🇹 London • Amalfi",
    category: "Editorial Film Studio",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85",
    website: "https://maisondelamour.com"
  },
  {
    _id: "p3",
    name: "Aura Creative House",
    locationTag: "🇺🇸 🇯🇵 Los Angeles • Tokyo",
    category: "Commercial & Fashion Post",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=85",
    website: "https://auracreative.com"
  },
  {
    _id: "p4",
    name: "Vogue Lumière Studio",
    locationTag: "🇮🇹 Milan • Lake Como",
    category: "High-Fashion & Runway Cinema",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=85",
    website: "/portfolio"
  },
  {
    _id: "p5",
    name: "Al-Mirage Creative",
    locationTag: "🇦🇪 Dubai • Abu Dhabi",
    category: "Royal Wedding Films & Commercials",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85",
    website: "/portfolio"
  },
  {
    _id: "p6",
    name: "Heritage & Crown Productions",
    locationTag: "🇮🇳 Mumbai • Udaipur",
    category: "Grand Heritage Wedding Cinema",
    image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=85",
    website: "/portfolio"
  },
  {
    _id: "p7",
    name: "St. Moritz Motion Arts",
    locationTag: "🇨🇭 Zurich • St. Moritz",
    category: "Alpine & Destination Films",
    image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=85",
    website: "/portfolio"
  },
  {
    _id: "p8",
    name: "Riviera Cinema Collective",
    locationTag: "🇫🇷 🇲🇨 Cannes • Monaco",
    category: "Festival & Editorial Post",
    image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=85",
    website: "/portfolio"
  },
  {
    _id: "p9",
    name: "Pacific Harbor Studios",
    locationTag: "🇦🇺 Sydney • Melbourne",
    category: "Commercial & Narrative Color",
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=85",
    website: "/portfolio"
  }
];

export default function WorkingPartnersSection() {
  const shouldReduceMotion = useReducedMotion();
  const { items: partners } = useCmsCollection("/api/v1/cms/partners", "partners");
  const displayPartners = Array.isArray(partners) && partners.length > 0 ? partners : DEFAULT_PARTNERS;

  return (
    <section
      aria-label="Working Partners & Global Production Houses"
      className="relative py-24 sm:py-32 bg-sage-bg text-forest overflow-hidden border-t border-sage-border/60"
    >
      {/* Background Soft Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sage-light/10 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <Container>
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-sage-border/80">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-site shadow-soft">
              <Building2 className="h-3.5 w-3.5" /> Collaborative Network
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-forest leading-tight">
              Trusted by Premier Production Houses &amp; Creative Agencies
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-sage-muted max-w-md leading-relaxed">
            We partner with leading global studios, destination wedding filmmakers, and creative directors to deliver high-end post-production excellence across borders.
          </p>
        </div>

        {/* Global Partners Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 pt-12">
          {displayPartners.map((partner, index) => {
            const partnerName = partner.name || partner.companyName || "Partner Studio";
            const locationTag = partner.locationTag || partner.tag || partner.location || "Global";
            const category = partner.category || "Production House";
            const partnerImage = partner.image || partner.logo || partner.logoUrl || partner.imageUrl || partner.thumbnail || "";
            const href = partner.website && partner.website !== "#" ? partner.website : "/portfolio";
            const isExternal = /^https?:\/\//i.test(href);

            return (
              <m.a
                key={partner._id || partner.id || index}
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className="group relative rounded-3xl border border-sage-light/50 bg-sage-card p-6 sm:p-7 shadow-soft transition-all duration-500 hover:border-[rgb(72,125,72)]/70 hover:shadow-editorial hover:-translate-y-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Location Tag & Action Arrow */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sage-border bg-sage-secondary/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-site">
                      <MapPin className="h-3 w-3 text-site shrink-0" />
                      {locationTag}
                    </span>

                    <span className="h-8 w-8 rounded-full border border-sage-border bg-sage-card text-forest flex items-center justify-center transition-all duration-300 group-hover:border-[rgb(72,125,72)] group-hover:bg-[rgb(72,125,72)] group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>

                  {/* Country / Partner Image Display */}
                  <div className="relative aspect-[16/10] w-full rounded-2xl border border-sage-border/60 bg-sage-secondary/40 overflow-hidden shadow-soft transition-all duration-500 group-hover:border-[rgb(72,125,72)]/50">
                    {partnerImage ? (
                      <img
                        src={mediaUrl(partnerImage)}
                        alt={`${partnerName} - ${locationTag}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          const fallback = event.currentTarget.nextElementSibling;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="absolute inset-0 items-center justify-center font-serif text-3xl font-bold text-site bg-sage-secondary/80"
                      style={{ display: partnerImage ? "none" : "flex" }}
                    >
                      {partnerName?.[0] || "P"}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-forest/40 via-transparent to-transparent pointer-events-none opacity-50 group-hover:opacity-25 transition-opacity" />
                  </div>

                  {/* Brand Name */}
                  <h3 className="font-heading text-2xl font-semibold text-forest group-hover:text-site transition-colors duration-300">
                    {partnerName}
                  </h3>
                </div>

                <div className="pt-6 mt-6 border-t border-sage-border/40 flex items-center justify-between text-xs text-sage-muted">
                  <span>{category}</span>
                  <span className="font-semibold text-site group-hover:text-site transition-colors flex items-center gap-1">
                    <span>View Portfolio</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </m.a>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
