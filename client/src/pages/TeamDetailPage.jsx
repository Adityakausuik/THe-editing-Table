import { ArrowLeft, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Container from "../components/ui/Container.jsx";
import { apiFetch, mediaUrl } from "../lib/api.js";
import NotFoundPage from "./NotFoundPage.jsx";

export default function TeamDetailPage() {
  const { slug } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMember() {
      setLoading(true);
      try {
        const data = await apiFetch("/api/v1/cms/team");
        if (Array.isArray(data.data)) {
          const found = data.data.find(
            (m) => m.slug === slug || m._id === slug || String(m.id) === slug
          );
          if (found) {
            setMember(found);
          }
        }
      } catch {
        setMember(null);
      } finally {
        setLoading(false);
      }
    }
    loadMember();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-32 pb-24 min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[rgb(72,125,72)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!member) {
    return <NotFoundPage />;
  }

  const name = member.fullName || member.name;
  const designation = member.designation || member.role;
  const bio = member.fullBio || member.shortBio || member.bio || "";
  const skills = Array.isArray(member.skills) ? member.skills : ["DaVinci Resolve", "Color Science", "HDR Color"];
  const image = mediaUrl(member.profileImage || member.avatar || member.image);

  return (
    <div className="pt-28 pb-16">
      {/* Back Link */}
      <Container className="pt-4">
        <Link to="/team" className="inline-flex items-center gap-2 text-sm text-sage-muted hover:text-site transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Team
        </Link>
      </Container>

      <section className="py-12">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] items-start">
          {/* Profile Image */}
          {image && (
            <div className="rounded-3xl border border-sage-light/40 bg-sage-card p-3 shadow-editorial overflow-hidden">
              <img
                src={image}
                alt={name}
                className="w-full h-[450px] object-cover rounded-2xl"
              />
            </div>
          )}

          {/* Profile Content */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-site">
                {designation}
              </span>
              <h1 className="font-heading text-5xl font-normal text-forest">{name}</h1>
            </div>

            <p className="text-lg text-sage-muted leading-relaxed">{bio}</p>

            <div className="rounded-3xl border border-sage-border bg-sage-card p-6 space-y-4 shadow-soft">
              <h3 className="font-heading text-xl text-forest flex items-center gap-2">
                <Award className="h-5 w-5 text-site" /> Specialized Skills & Software
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="text-xs bg-sage-secondary/70 border border-sage-border/60 px-3 py-1.5 rounded-full text-forest font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-sage-border flex justify-between items-center">
              <span className="text-xs text-sage-muted">Available for retainer projects</span>
              <Button href="/contactus" variant="primary">
                Assign Artist to Project
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
