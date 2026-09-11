/* global navigator, alert */
import { ArrowLeft, Share2, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Container from "../components/ui/Container.jsx";
import { apiFetch, mediaUrl } from "../lib/api.js";
import NotFoundPage from "./NotFoundPage.jsx";

export default function BlogDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPost() {
      setLoading(true);
      try {
        const data = await apiFetch("/api/v1/cms/blog");
        if (Array.isArray(data.data)) {
          const found = data.data.find(
            (p) => p.slug === slug || p._id === slug || String(p.id) === slug
          );
          if (found) {
            setPost(found);
            setRelatedPosts(
              data.data.filter((p) => p._id !== found._id && p.slug !== slug).slice(0, 2)
            );
          }
        }
      } catch {
        setPost(null);
        setRelatedPosts([]);
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-32 pb-24 min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[rgb(72,125,72)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!post) {
    return <NotFoundPage />;
  }

  const tags = Array.isArray(post.tags) ? post.tags : ["Editing", "Color Grading"];
  const authorName = typeof post.author === "string" ? post.author : post.author?.name;
  const authorRole = typeof post.author === "object" ? post.author?.role : "Post-Production Team";

  return (
    <div className="pt-28 pb-16">
      {/* Back Link */}
      <Container className="pt-4">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-sage-muted hover:text-site transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to All Articles
        </Link>
      </Container>

      {/* Article Header */}
      <section className="py-12">
        <Container className="max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-site">
              {post.category}
            </span>
            <span className="text-xs text-sage-muted">• {post.readTime}</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal text-forest leading-[1.1]">
            {post.title}
          </h1>

          <p className="text-lg text-sage-muted leading-relaxed">{post.excerpt}</p>

          <div className="flex items-center justify-between border-y border-sage-border/60 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sage-light/20 flex items-center justify-center text-site font-serif font-bold">
                {authorName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-forest">{authorName}</p>
                <p className="text-xs text-sage-muted">{authorRole}</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: post.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Article link copied to clipboard!");
                }
              }}
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sage-border px-4 py-2 text-xs text-forest transition-colors hover:border-[rgb(72,125,72)] hover:bg-sage-secondary/60"
            >
              <Share2 className="h-3.5 w-3.5" /> Share Article
            </button>
          </div>
        </Container>
      </section>

      {/* Cover Image */}
      {post.coverImage && (
        <section className="pb-12">
          <Container className="max-w-4xl">
            <img
              src={mediaUrl(post.coverImage)}
              alt={post.title}
              className="w-full h-[450px] object-cover rounded-3xl border border-sage-border shadow-editorial"
            />
          </Container>
        </section>
      )}

      {/* Article Content */}
      <section className="pb-20">
        <Container className="max-w-3xl space-y-6 leading-relaxed text-forest font-sans text-base">
          <div
            className="space-y-6 text-sage-muted"
            dangerouslySetInnerHTML={{ __html: (post.content || post.excerpt || "").replace(/\n/g, "<br/>") }}
          />

          <div className="pt-8 border-t border-sage-border/60 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs bg-sage-secondary/60 px-3 py-1.5 rounded-full text-forest">
                <Tag className="h-3 w-3 text-site" /> {tag}
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-sage-secondary/40 border-t border-sage-border/60">
          <Container className="max-w-4xl">
            <h2 className="font-heading text-3xl text-forest mb-8">Related Articles</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {relatedPosts.map((rel) => (
                <div key={rel._id || rel.id} className="rounded-2xl border border-sage-border bg-sage-card p-6 space-y-3">
                  <span className="text-xs font-semibold text-site uppercase">{rel.category}</span>
                  <h3 className="font-heading text-xl font-normal text-forest">
                    <Link to={`/blog/${rel.slug || rel._id}`}>{rel.title}</Link>
                  </h3>
                  <p className="text-xs text-sage-muted line-clamp-2">{rel.excerpt}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}
    </div>
  );
}
