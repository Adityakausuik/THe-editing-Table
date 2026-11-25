import { m } from "framer-motion";
import { ArrowUpRight, Award, CheckCircle2, Film, Palette, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container.jsx";
import { useCmsCollection } from "../lib/useCmsCollection.js";

const categoryIcons = {
  "Video Editing": Film,
  "Color Grading": Palette,
  Retouching: Award
};

export default function ServicesPage() {
  const { items: services, loading, error } = useCmsCollection("/api/v1/cms/services", "services");

  return (
    <div className="pt-24 sm:pt-28 pb-16 sm:pb-20 bg-sage-bg text-forest space-y-12">
      <Container className="space-y-10">
        <div className="text-center space-y-3.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-site shadow-xs">
            <Sparkles className="h-3.5 w-3.5" /> Full Post-Production Capabilities
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-forest leading-tight">
            Post-Production Services Suite
          </h1>
          <p className="text-xs sm:text-sm text-sage-muted leading-relaxed max-w-2xl mx-auto">
            From RAW assembly to final 4K master delivery, our suite provides bespoke editorial editing, film emulation, color grading, and high-fashion retouching.
          </p>
        </div>

        {loading && <p className="text-center text-sm text-sage-muted">Loading services...</p>}
        {error && <p className="text-center text-sm text-rose-700">{error}</p>}
        {!loading && !error && services.length === 0 && (
          <p className="text-center text-sm text-sage-muted">No published services are available yet.</p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {services.map((service, idx) => {
            const Icon = categoryIcons[service.category] || Film;
            const features = Array.isArray(service.features) ? service.features : [];
            return (
              <m.div
                key={service._id || service.id || idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="rounded-2xl border border-sage-border/80 bg-white p-6 sm:p-7 transition-all duration-300 hover:border-site/50 flex flex-col justify-between shadow-xs"
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-sage-secondary border border-sage-border text-site flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-site bg-sage-secondary/70 px-2.5 py-0.5 rounded-full border border-[rgb(72,125,72)]/20">
                      {service.turnaround}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="font-heading text-xl sm:text-2xl font-normal text-forest">{service.title}</h2>
                    <p className="text-xs text-site/80 italic font-medium">{service.tagline}</p>
                    <p className="text-xs text-sage-muted leading-relaxed">{service.description}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-sage-border/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-site">Key Deliverables</span>
                    <ul className="space-y-1 text-xs text-sage-muted">
                      {features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-site shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-sage-border/40">
                  <Link
                    to={`/servicesdetails/${service.slug || service._id || service.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-site transition-colors"
                  >
                    <span>View Detailed Package Specs</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </m.div>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
