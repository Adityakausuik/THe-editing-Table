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
    <section aria-label="Post-Production Services Suite" className="py-16 sm:py-20 lg:py-24 bg-sage-bg text-forest relative border-b border-sage-border/60">
      <Container>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-sage-border/80">
          <div className="space-y-2.5 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-site">
              Core Capabilities &amp; Post-Production Suite
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-[2.5rem] font-normal text-forest leading-tight">
              Handcrafted Post-Production Built for Visual Excellence
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-sage-muted max-w-md leading-relaxed">
            Every frame edited, graded, and retouched with meticulous precision to elevate your visual storytelling and delight your clients.
          </p>
        </div>

        <div className="grid gap-0 md:grid-cols-3 pt-10 divide-y md:divide-y-0 md:divide-x divide-sage-border/70">
          {displayServices.map((service, idx) => {
            const Icon = categoryIcons[service.category] || Film;
            return (
              <m.div
                key={service._id || service.id || idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="group py-8 md:py-0 md:px-8 first:md:pl-0 last:md:pr-0 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-sage-secondary border border-sage-border/80 text-site flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-site px-2.5 py-0.5 rounded-full border border-[rgb(72,125,72)]/25">
                      {service.turnaround}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-heading text-xl sm:text-2xl font-normal text-forest group-hover:text-site transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-xs text-site/80 italic font-medium">{service.tagline}</p>
                    <p className="text-xs sm:text-sm text-sage-muted leading-relaxed line-clamp-3">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="pt-5 mt-6 border-t border-sage-border/40 flex items-center justify-between">
                  <Link
                    to={`/servicesdetails/${service.slug || service._id || service.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest group-hover:text-site transition-colors"
                  >
                    <span>Explore Service Suite</span>
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
