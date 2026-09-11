import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Container from "../components/ui/Container.jsx";
import { apiFetch, mediaUrl } from "../lib/api.js";
import NotFoundPage from "./NotFoundPage.jsx";

export default function BrandCollaborationDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      setLoading(true);
      try {
        const data = await apiFetch("/api/v1/cms/collaborations");
        if (Array.isArray(data.data)) {
          const found = data.data.find(
            (b) => b.slug === slug || b._id === slug || String(b.id) === slug
          );
          if (found) {
            setProject(found);
          }
        }
      } catch {
        setProject(null);
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-32 pb-24 min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[rgb(72,125,72)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return <NotFoundPage />;
  }

  const services = Array.isArray(project.services) ? project.services : ["Editorial Edit", "Color Grading"];

  return (
    <div className="pt-28 pb-16">
      {/* Back Link */}
      <Container className="pt-4">
        <Link to="/brand-collaborations" className="inline-flex items-center gap-2 text-sm text-sage-muted hover:text-site transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Brand Collaborations
        </Link>
      </Container>

      {/* Hero Banner */}
      <section className="py-12">
        <Container className="max-w-4xl space-y-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-site">
            {project.category} • {project.brandName}
          </span>

          <h1 className="font-heading text-5xl sm:text-6xl font-normal text-forest leading-[1.1]">
            {project.title}
          </h1>

          <p className="text-xl text-sage-muted leading-relaxed">{project.shortDescription}</p>

          <div className="flex flex-wrap gap-2 pt-2">
            {services.map((srv) => (
              <span key={srv} className="text-xs bg-sage-secondary/70 border border-sage-border px-3 py-1 rounded-full text-forest">
                {srv}
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* Media Image */}
      {(project.coverImage || project.heroImage) && (
        <section className="pb-16">
          <Container className="max-w-4xl">
            <img
              src={mediaUrl(project.coverImage || project.heroImage)}
              alt={project.title}
              className="w-full h-[500px] object-cover rounded-3xl border border-sage-border shadow-editorial"
            />
          </Container>
        </section>
      )}

      {/* Case Study Details */}
      <section className="pb-20">
        <Container className="max-w-3xl space-y-8">
          <div className="space-y-4">
            <h2 className="font-heading text-3xl text-forest">Campaign Overview & Strategy</h2>
            <p className="text-sage-muted leading-relaxed">{project.fullDescription || project.shortDescription}</p>
          </div>

          <div className="rounded-3xl border border-sage-border bg-sage-card p-8 space-y-4 shadow-soft">
            <h3 className="font-heading text-2xl text-forest">Services Delivered</h3>
            <ul className="space-y-3">
              {services.map((srv) => (
                <li key={srv} className="flex items-center gap-3 text-forest">
                  <CheckCircle2 className="h-5 w-5 text-site shrink-0" />
                  <span>{srv}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8 border-t border-sage-border flex justify-between items-center">
            <span className="text-xs text-sage-muted">Client: {project.brandName}</span>
            <Button href="/contactus" variant="primary">
              Propose Campaign Edit
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
