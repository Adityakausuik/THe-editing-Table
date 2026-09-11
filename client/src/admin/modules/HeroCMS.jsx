/* global console, confirm */
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  ImageIcon,
  LayoutPanelTop,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import MediaUploadDropzone from "../components/MediaUploadDropzone.jsx";

export default function HeroCMS() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [editingSlide, setEditingSlide] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/v1/cms/hero-slides/admin");
      setSlides(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("HeroCMS fetch error:", err);
      if (err.status === 401) setSlides([]);
      setError({ statusCode: err.status || 0, message: err.message || "Network error connecting to API server." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleSaveSlide = async (e) => {
    e.preventDefault();
    if (!editingSlide) return;
    setSaving(true);
    setError(null);

    try {
      const isNew = !editingSlide._id || editingSlide._id.startsWith("new-");
      const url = isNew
        ? "/api/v1/cms/hero-slides/admin"
        : `/api/v1/cms/hero-slides/admin/${editingSlide._id}`;

      const method = isNew ? "POST" : "PATCH";

      await apiFetch(url, {
        method,
        body: JSON.stringify(editingSlide)
      });

      setSavedMsg("Hero slide saved successfully!");
      setTimeout(() => setSavedMsg(""), 3000);
      setEditingSlide(null);
      fetchSlides();
    } catch (err) {
      console.error("Save slide error:", err);
      setError({ statusCode: err.status || 0, message: err.message || "Network error saving Hero slide." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (slide) => {
    const updatedStatus = !slide.active;
    setError(null);
    try {
      await apiFetch(`/api/v1/cms/hero-slides/admin/${slide._id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: updatedStatus })
      });

      setSavedMsg(`Slide "${slide.title}" ${updatedStatus ? "activated" : "deactivated"}.`);
      setTimeout(() => setSavedMsg(""), 3000);
      fetchSlides();
    } catch (err) {
      console.error("Toggle active error:", err);
      setError({ statusCode: err.status || 0, message: err.message || "Network error updating slide status." });
    }
  };

  const cleanPrefix = (str = "") => {
    return String(str)
      .replace(/^\d{1,2}\s*[-•]\s*/, "")
      .trim();
  };

  const reindexSlides = (list = []) => {
    return list.map((s, idx) => {
      const num = idx + 1;
      const padded = String(num).padStart(2, "0");
      const labelText = cleanPrefix(s.label) || cleanPrefix(s.title) || "EDITORIAL SHOWCASE";
      const eyebrowText = cleanPrefix(s.eyebrow) || cleanPrefix(s.title) || "EDITORIAL SHOWCASE";
      return {
        ...s,
        order: num,
        label: `${padded} — ${labelText.toUpperCase()}`,
        eyebrow: `${padded} • ${eyebrowText.toUpperCase()}`
      };
    });
  };

  const persistReorder = async (reorderedList) => {
    setError(null);
    try {
      const payload = reorderedList.map((s, idx) => ({ id: s._id, order: idx + 1 }));

      const data = await apiFetch("/api/v1/cms/hero-slides/admin/reorder", {
        method: "PUT",
        body: JSON.stringify({ slides: payload })
      });
      setSlides(Array.isArray(data.data) ? data.data : reorderedList);
      setSavedMsg("Slide reordered successfully.");
      setTimeout(() => setSavedMsg(""), 2000);
    } catch (err) {
      console.error("Persist reorder error:", err);
      setError({ statusCode: err.status || 0, message: err.message || "Network error saving slide order." });
      fetchSlides();
    }
  };

  const handleMoveSlide = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    const reindexed = reindexSlides(newSlides);
    persistReorder(reindexed);
  };

  const handleDeleteSlide = async (id) => {
    if (!confirm("Are you sure you want to delete this Hero slide?")) return;
    setError(null);

    try {
      if (String(id).startsWith("new-")) {
        setEditingSlide(null);
        return;
      }

      await apiFetch(`/api/v1/cms/hero-slides/admin/${id}`, {
        method: "DELETE"
      });

      setSavedMsg("Slide deleted and slide sequence re-indexed.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchSlides();
    } catch (err) {
      console.error("Delete slide error:", err);
      setError({ statusCode: err.status || 0, message: err.message || "Network error deleting Hero slide." });
    }
  };

  const handleCreateNew = () => {
    const nextOrder = slides.length + 1;
    const padded = String(nextOrder).padStart(2, "0");

    setEditingSlide({
      _id: `new-${Date.now()}`,
      slideType: "ceo",
      layoutType: "ceo_editorial",
      slideKey: `slide_${nextOrder}`,
      label: `${padded} — NEW EDITORIAL SLIDE`,
      eyebrow: `${padded} • BRAND SHOWCASE`,
      title: "",
      headingLines: [],
      description: "",
      subtitle: "",
      tag: "",
      quote: "",
      ctaText: "",
      ctaLink: "",
      featureItems: [],
      trustLabel: "",
      mainImage: "",
      images: [],
      imageGrid: [],
      order: nextOrder,
      slideNumber: nextOrder,
      active: true,
      status: "published"
    });
  };

  const activeSlideCount = slides.filter((slide) => slide.active).length;
  const inactiveSlideCount = slides.length - activeSlideCount;

  return (
    <div className="space-y-6">
      {/* Hero CMS overview */}
      <section className="overflow-hidden rounded-[2rem] border border-sage-border/70 bg-sage-card shadow-soft">
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-site">
              <LayoutPanelTop className="h-4 w-4" aria-hidden="true" />
              Hero &amp; Home CMS
            </span>
            <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-forest sm:text-3xl">
              Homepage hero slides
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-sage-muted">
              Manage slide content, visibility, media and display order from one synchronized workspace.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={fetchSlides}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sage-border bg-sage-card px-5 py-2.5 text-xs font-semibold text-forest transition hover:border-[rgb(72,125,72)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] px-5 py-2.5 text-xs font-semibold text-white shadow-sage transition hover:bg-[#7C9B69]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add hero slide
          </button>
        </div>
      </div>

        <div className="grid grid-cols-3 border-t border-sage-border/60 bg-sage-secondary/35">
          {[
            { label: "Total slides", value: slides.length },
            { label: "Published", value: activeSlideCount },
            { label: "Hidden", value: inactiveSlideCount }
          ].map((metric, index) => (
            <div
              key={metric.label}
              className={`px-4 py-4 text-center sm:px-6 ${index > 0 ? "border-l border-sage-border/60" : ""}`}
            >
              <div className="text-xl font-semibold text-forest sm:text-2xl">{metric.value}</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sage-muted">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Messages */}
      {savedMsg && (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-soft">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          {savedMsg}
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-col justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-soft sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold text-rose-950">
                {error.statusCode === 401 ? "Admin session required" : "Unable to synchronize hero slides"}
              </div>
              <p className="mt-1 text-xs leading-5">{error.message}</p>
            </div>
          </div>
          {error.statusCode === 401 && (
            <a
              href="/admin/login"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-[rgb(72,125,72)] px-5 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-[#7C9B69]"
            >
              Log in to admin
            </a>
          )}
        </div>
      )}

      {/* Slides Listing */}
      <div className="grid gap-4 xl:grid-cols-2">
        {loading && slides.length === 0 && (
          <div className="col-span-full flex min-h-52 flex-col items-center justify-center rounded-[2rem] border border-sage-border bg-sage-card p-8 text-center shadow-soft">
            <RotateCcw className="h-6 w-6 animate-spin text-site" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-forest">Loading hero slides</p>
            <p className="mt-1 text-xs text-sage-muted">Synchronizing with the live homepage.</p>
          </div>
        )}
        {!loading && !error && slides.length === 0 && (
          <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-sage-border bg-sage-card p-8 text-center shadow-soft">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-secondary text-site">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-lg font-semibold text-forest">No hero slides yet</p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-sage-muted">Create and publish your first slide to display it on the homepage.</p>
            <button
              type="button"
              onClick={handleCreateNew}
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] px-5 py-2 text-xs font-semibold text-white shadow-sage"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create first slide
            </button>
          </div>
        )}
        {slides.map((slide, idx) => (
          <article
            key={slide._id || idx}
            className={`flex min-w-0 flex-col rounded-[2rem] border bg-sage-card p-5 shadow-soft transition-all duration-300 sm:p-6 ${
              slide.active ? "border-sage-border/80" : "border-rose-200 bg-rose-50/20"
            }`}
          >
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[rgb(72,125,72)] px-2.5 py-0.5 rounded-full">
                    Slide {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sage-muted bg-sage-secondary px-2.5 py-0.5 rounded-full border border-sage-border/40">
                    {slide.slideKey}
                  </span>
                  <span className={`ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${slide.active ? "text-emerald-700" : "text-rose-700"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${slide.active ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {slide.active ? "Published" : "Hidden"}
                  </span>
                </div>

                <div className="mt-5 space-y-1.5">
                  <span className="block truncate text-[11px] font-bold uppercase tracking-[0.16em] text-site">
                    {slide.label || slide.eyebrow}
                  </span>
                  <h2 className="truncate text-xl font-semibold tracking-tight text-forest">
                    {slide.title || "Untitled hero slide"}
                  </h2>
                </div>

                <p className="mt-2 min-h-10 text-xs leading-5 text-sage-muted line-clamp-2">
                  {slide.description || "No description has been added to this slide."}
                </p>

                {/* Thumbnails Preview */}
                {Array.isArray(slide.images) && slide.images.length > 0 && (
                  <div className="mt-4 flex min-h-12 items-center gap-2 overflow-hidden" aria-label={`${slide.images.length} slide images`}>
                    {slide.images.slice(0, 5).map((img, i) => (
                      <div
                        key={i}
                        className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-sage-border bg-forest/5"
                      >
                        <img
                          src={mediaUrl(typeof img === "string" ? img : img.url)}
                          alt={`${slide.title || "Hero slide"} preview ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                    {slide.images.length > 5 && (
                      <span className="text-[10px] font-semibold text-sage-muted pl-1">
                        +{slide.images.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Slide action controls */}
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-sage-border/50 pt-4">
                <button
                  type="button"
                  onClick={() => handleMoveSlide(idx, -1)}
                  disabled={idx === 0}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sage-border text-sage-muted transition hover:text-forest disabled:cursor-not-allowed disabled:opacity-30"
                  title="Move Up"
                  aria-label={`Move ${slide.title || "slide"} up`}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => handleMoveSlide(idx, 1)}
                  disabled={idx === slides.length - 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sage-border text-sage-muted transition hover:text-forest disabled:cursor-not-allowed disabled:opacity-30"
                  title="Move Down"
                  aria-label={`Move ${slide.title || "slide"} down`}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleActive(slide)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    slide.active
                      ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      : "border-warm-grey/30 text-sage-muted hover:text-forest"
                  }`}
                  title={slide.active ? "Deactivate Slide" : "Activate Slide"}
                  aria-label={`${slide.active ? "Hide" : "Publish"} ${slide.title || "slide"}`}
                >
                  {slide.active ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingSlide(slide)}
                  className="order-first inline-flex min-h-10 w-full flex-1 items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-[#7C9B69] sm:order-none sm:w-auto"
                >
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                  Edit content
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteSlide(slide._id)}
                  className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                  title="Delete Slide"
                  aria-label={`Delete ${slide.title || "slide"}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
          </article>
        ))}
      </div>

      {/* SLIDE EDIT / CREATE MODAL (FIXED HEADER, SCROLLABLE BODY, FIXED STICKY FOOTER) */}
      {editingSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-3 sm:p-6 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hero-editor-title"
            className="relative my-auto flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-sage-light/40 bg-sage-card shadow-deep"
          >
            {/* Modal Fixed Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-sage-border/60 bg-sage-card px-5 py-4 sm:px-7 sm:py-5">
              <div className="min-w-0 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-site">
                  {editingSlide._id?.startsWith("new-") ? "Create hero slide" : "Hero slide editor"}
                </span>
                <h2 id="hero-editor-title" className="truncate text-xl font-semibold tracking-tight text-forest sm:text-2xl">
                  {editingSlide._id?.startsWith("new-") ? "Add new hero slide" : (editingSlide.title || "Edit untitled slide")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlide(null)}
                className="ml-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sage-border text-sage-muted transition hover:bg-sage-secondary hover:text-forest"
                aria-label="Close hero slide editor"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSlide} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Form Body */}
              <div className="flex-1 space-y-5 overflow-y-auto bg-sage-card p-5 text-left no-scrollbar sm:p-7">
                <section className="space-y-5 rounded-3xl border border-sage-border/70 bg-sage-secondary/20 p-4 sm:p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-forest">Slide content</h3>
                    <p className="mt-1 text-xs leading-5 text-sage-muted">
                      These fields are displayed directly in the homepage hero.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                        Gallery layout *
                      </label>
                      <select
                        value={editingSlide.slideType || "ceo"}
                        onChange={(event) => {
                          const slideType = event.target.value;
                          let layoutType = "ceo_editorial";
                          if (slideType === "team") layoutType = "team_layered";
                          if (slideType === "collaborations") layoutType = "brand_strips";
                          setEditingSlide({ ...editingSlide, slideType, layoutType });
                        }}
                        className="field-luxury text-xs"
                      >
                        <option value="ceo">Editorial mosaic</option>
                        <option value="team">Layered gallery</option>
                        <option value="collaborations">Vertical image strips</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                        Visibility *
                      </label>
                      <select
                        value={editingSlide.status || (editingSlide.active ? "published" : "inactive")}
                        onChange={(event) => {
                          const status = event.target.value;
                          setEditingSlide({ ...editingSlide, status, active: status === "published" });
                        }}
                        className="field-luxury text-xs"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="inactive">Hidden</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                      Slide name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingSlide.title}
                      onChange={(event) => setEditingSlide({ ...editingSlide, title: event.target.value })}
                      className="field-luxury text-xs"
                      placeholder="Editorial retouching portfolio"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                      Eyebrow text
                    </label>
                    <input
                      type="text"
                      value={editingSlide.eyebrow || ""}
                      onChange={(event) => setEditingSlide({ ...editingSlide, eyebrow: event.target.value })}
                      className="field-luxury text-xs font-semibold uppercase"
                      placeholder="EDITORIAL RETOUCHING PORTFOLIO"
                    />
                    <p className="mt-1.5 text-[11px] leading-4 text-sage-muted">Slide numbering is added automatically.</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                      Hero heading
                    </label>
                    <textarea
                      rows={3}
                      value={Array.isArray(editingSlide.headingLines) ? editingSlide.headingLines.join("\n") : ""}
                      onChange={(event) =>
                        setEditingSlide({
                          ...editingSlide,
                          headingLines: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean)
                        })
                      }
                      className="field-luxury py-3 text-xs"
                      placeholder={"Crafting Stories\nBeyond The Frame"}
                    />
                    <p className="mt-1.5 text-[11px] leading-4 text-sage-muted">Use a new line where the heading should break.</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={editingSlide.description || ""}
                      onChange={(event) => setEditingSlide({ ...editingSlide, description: event.target.value })}
                      className="field-luxury py-3 text-xs"
                      placeholder="Add a concise description for this slide."
                    />
                  </div>
                </section>

                <section className="space-y-4 rounded-3xl border border-sage-border/70 bg-sage-secondary/20 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage-card text-site shadow-soft">
                      <ImageIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-forest">Hero gallery</h3>
                      <p className="mt-1 text-xs leading-5 text-sage-muted">
                        Upload up to five images. The first image is used as the featured image and page background.
                      </p>
                    </div>
                  </div>

                  <MediaUploadDropzone
                    folder="hero"
                    value={editingSlide.images || []}
                    onChange={(urls) => setEditingSlide({
                      ...editingSlide,
                      images: urls,
                      imageGrid: urls,
                      mainImage: urls[0] || ""
                    })}
                    multiple
                    maxFiles={5}
                    label="Upload hero gallery images"
                    description="Drag and drop images or choose files"
                  />
                </section>
              </div>

              {/* Fixed Sticky Modal Footer */}
              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-sage-border/60 bg-sage-card/95 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-7 sm:py-5">
                <button
                  type="button"
                  onClick={() => setEditingSlide(null)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-sage-border bg-sage-card px-5 py-2.5 text-xs font-semibold text-forest transition hover:border-[rgb(72,125,72)] sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] px-6 py-2.5 text-xs font-semibold text-white shadow-sage transition hover:bg-[#7C9B69] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Save className="h-4 w-4" aria-hidden="true" /> {saving ? "Saving..." : "Save synchronized slide"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
