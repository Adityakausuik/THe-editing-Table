import { ArrowLeft, CheckCircle2, Clock, Film, Layers, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Container from "../components/ui/Container.jsx";
import { apiFetch } from "../lib/api.js";
import NotFoundPage from "./NotFoundPage.jsx";

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadService() {
      setLoading(true);
      try {
        const data = await apiFetch("/api/v1/cms/services");
        if (Array.isArray(data.data)) {
          const found = data.data.find(
            (s) => s.slug === slug || s._id === slug || String(s.id) === slug
          );
          if (found) {
            setService(found);
          }
        }
      } catch {
        setService(null);
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-32 pb-24 min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[rgb(72,125,72)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!service) {
    return <NotFoundPage />;
  }

  const features = Array.isArray(service.features) ? service.features : ["4K Master Delivery", "Color Grading"];
  const deliverables = Array.isArray(service.deliverables) ? service.deliverables : ["Master ProRes 422 File"];

  return (
    <div className="pt-28 pb-16">
      {/* Back Link */}
      <Container className="pt-4">
        <Link to="/services" className="inline-flex items-center gap-2 text-sm text-sage-muted hover:text-site transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to All Services
        </Link>
      </Container>

      {/* Hero Banner */}
      <section className="relative py-16">
        <Container className="max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card/80 px-4 py-1.5 backdrop-blur-md">
            <Film className="h-4 w-4 text-site" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-site">
              {service.category}
            </span>
          </div>

          <h1 className="font-heading text-5xl sm:text-6xl font-normal text-forest leading-[1.1]">
            {service.title}
          </h1>

          <p className="text-xl text-sage-muted leading-relaxed">
            {service.description}
          </p>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-sage-border/60">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-site" />
              <span className="text-sm font-semibold text-forest">Turnaround: {service.turnaround}</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-site" />
              <span className="text-sm font-semibold text-forest">100% Studio Matched</span>
            </div>
          </div>
        </Container>
      </section>

      {/* Deliverables & Features */}
      <section className="py-16 bg-sage-secondary/30 border-y border-sage-border/60">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div className="rounded-3xl border border-sage-border bg-sage-card p-8 space-y-6 shadow-soft">
            <h2 className="font-serif text-3xl text-forest">Key Features</h2>
            <ul className="space-y-4">
              {features.map((feat) => (
                <li key={feat} className="flex items-start gap-3 text-forest">
                  <CheckCircle2 className="h-5 w-5 text-site shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-sage-border bg-sage-card p-8 space-y-6 shadow-soft">
            <h2 className="font-serif text-3xl text-forest">Deliverables</h2>
            <ul className="space-y-4">
              {deliverables.map((item) => (
                <li key={item} className="flex items-start gap-3 text-forest">
                  <Sparkles className="h-5 w-5 text-sage-light shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <Container className="max-w-2xl space-y-6">
          <h2 className="font-serif text-4xl sm:text-5xl text-forest font-normal">
            Ready to Book {service.title}?
          </h2>
          <p className="text-sage-muted">
            Send us your project details or sample gallery and we will set up a dedicated test edit.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button href="/contactus" variant="primary">
              Request Trial Edit
            </Button>
            <Button href="/portfolio" variant="secondary">
              View Sample Work
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
