import { m } from "framer-motion";
import { ArrowUpRight, Award, Film, Palette } from "lucide-react";
import { Link } from "react-router-dom";
import { useCmsCollection } from "../../lib/useCmsCollection.js";
import Container from "../ui/Container.jsx";

const categoryIcons = {
  "Video Editing": Film,
  "Color Grading": Palette,
  Retouching: Award
};

const DEFAULT_SERVICES = [
  {
    _id: "srv-1",
    title: "Editorial Video Editing",
    slug: "video-editing",
    category: "Video Editing",
    tagline: "Pacing, Rhythm & Storytelling",
    description: "Multi-cam RAW editing, narrative pacing, music licensing integration, and master exports for wedding films and trailers.",
    turnaround: "5-7 Days"
  },
  {
    _id: "srv-2",
    title: "High-End Color Grading",
    slug: "color-grading",
    category: "Color Grading",
    tagline: "35mm & Kodak Emulation",
    description: "Custom DaVinci Resolve color science, skin tone preservation, highlight roll-off, and film stock emulation.",
    turnaround: "3-5 Days"
  },
  {
    _id: "srv-3",
    title: "Luxury Portrait Retouching",
    slug: "retouching",
    category: "Retouching",
    tagline: "High-Fashion Frequency Separation",
    description: "Non-destructive skin retouching, background cleanup, garment smoothing, and editorial color finishing for wedding albums.",
    turnaround: "4-6 Days"
  }
];

export default function ServicesSection() {
  const { items: services } = useCmsCollection("/api/v1/cms/services", "services");
  const displayServices = Array.isArray(services) && services.length > 0 ? services : DEFAULT_SERVICES;

  return (
    <section aria-label="Post-Production Services Suite" className="py-24 sm:py-32 bg-sage-card text-forest relative">
      <Container>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-sage-border/80">
          <div className="space-y-3 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-site">
              Core Capabilities & Post-Production Suite
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-forest leading-tight">
              Handcrafted Post-Production Built for Visual Excellence
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-sage-muted max-w-md leading-relaxed">
            Every frame edited, graded, and retouched with meticulous precision to elevate your visual storytelling and delight your clients.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 pt-12">
          {displayServices.map((service, idx) => {
            const Icon = categoryIcons[service.category] || Film;
            return (
              <m.div
                key={service._id || service.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative rounded-3xl border border-sage-border/80 bg-sage-card p-7 sm:p-8 shadow-soft hover:shadow-editorial hover:border-[rgb(72,125,72)]/70 transition-all duration-500 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-sage-secondary border border-sage-light/40 text-site flex items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-site bg-sage-secondary/70 px-3 py-1 rounded-full border border-[rgb(72,125,72)]/20">
                      {service.turnaround}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-heading text-2xl font-semibold text-forest group-hover:text-site transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-xs text-sage-muted italic">{service.tagline}</p>
                    <p className="text-xs text-sage-muted leading-relaxed line-clamp-3">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-sage-border/40 flex items-center justify-between">
                  <Link
                    to={`/servicesdetails/${service.slug || service._id || service.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-forest group-hover:text-site transition-colors"
                  >
                    Explore Service Suite <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </m.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
