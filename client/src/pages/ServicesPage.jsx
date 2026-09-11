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
    <div className="py-24 sm:py-32 bg-sage-bg text-forest space-y-16">
      <Container className="space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-site shadow-soft">
            <Sparkles className="h-4 w-4" /> Full Post-Production Capabilities
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal text-forest">
            Post-Production Services Suite
          </h1>
          <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
            From RAW assembly to final 4K master delivery, our suite provides bespoke editorial editing, film emulation, color grading, and high-fashion retouching.
          </p>
        </div>

        {loading && <p className="text-center text-sm text-sage-muted">Loading services...</p>}
        {error && <p className="text-center text-sm text-rose-700">{error}</p>}
        {!loading && !error && services.length === 0 && (
          <p className="text-center text-sm text-sage-muted">No published services are available yet.</p>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          {services.map((service, idx) => {
            const Icon = categoryIcons[service.category] || Film;
            const features = Array.isArray(service.features) ? service.features : [];
            return (
              <m.div
                key={service._id || service.id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="rounded-3xl border border-sage-light/60 bg-sage-card p-8 shadow-soft hover:shadow-editorial hover:border-[rgb(72,125,72)]/70 transition-all flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-sage-secondary border border-sage-light/40 text-site flex items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-site bg-sage-secondary/70 px-3 py-1 rounded-full border border-[rgb(72,125,72)]/20">
                      {service.turnaround}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl font-semibold text-forest">{service.title}</h2>
                    <p className="text-xs text-sage-muted italic">{service.tagline}</p>
                    <p className="text-xs text-sage-muted leading-relaxed">{service.description}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-sage-border/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-site">Key Deliverables</span>
                    <ul className="space-y-1.5 text-xs text-sage-muted">
                      {features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-site shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-sage-border/40">
                  <Link
                    to={`/servicesdetails/${service.slug || service._id || service.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:text-site transition-colors"
                  >
                    View Detailed Package Specs <ArrowUpRight className="h-4 w-4" />
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
