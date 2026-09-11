import { AnimatePresence, m } from "framer-motion";
import { Camera, Maximize2, X } from "lucide-react";
import { useState } from "react";
import { mediaUrl } from "../../lib/api.js";
import { useCmsCollection } from "../../lib/useCmsCollection.js";
import Container from "../ui/Container.jsx";

const DEFAULT_WEDDING_GALLERY = [
  {
    _id: "w1",
    title: "Udaipur Royal Palace Wedding",
    category: "Royal Wedding Retouching",
    location: "Udaipur • Rajasthan",
    imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85"
  },
  {
    _id: "w2",
    title: "Traditional Indian Bridal Retouching",
    category: "Skin & Fine Detail",
    location: "New Delhi • India",
    imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85"
  },
  {
    _id: "w3",
    title: "Royal Heritage Mandap Ceremony",
    category: "Filmic Color Science",
    location: "Jaipur • Rajasthan",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=85"
  },
  {
    _id: "w4",
    title: "Grand Sangeet Night Celebrations",
    category: "Cinematic Highlights",
    location: "Mumbai • India",
    imageUrl: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85"
  },
  {
    _id: "w5",
    title: "Henna Mehendi Fine-Art Detail",
    category: "Detail Enhancement",
    location: "Punjab • India",
    imageUrl: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=85"
  },
  {
    _id: "w6",
    title: "Sunset Varmala Heritage Ceremony",
    category: "High-End Color Grading",
    location: "Jodhpur • Rajasthan",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85"
  }
];

export default function WeddingGallerySection() {
  const { items } = useCmsCollection("/api/v1/cms/wedding-gallery", "weddings");
  const displayItems = Array.isArray(items) && items.length > 0 ? items : DEFAULT_WEDDING_GALLERY;
  const [activePhoto, setActivePhoto] = useState(null);

  return (
    <section aria-label="Editorial Wedding Photography Showcase" className="py-24 sm:py-32 bg-sage-card text-forest relative overflow-hidden">
      <Container>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-sage-border/80">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-site shadow-soft">
              <Camera className="h-3.5 w-3.5" /> High-Fashion Retouching
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-normal text-forest leading-tight">
              8K Editorial Retouching & Color Mastery
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-sage-muted max-w-md leading-relaxed">
            Preserving natural skin textures, elegant color palettes, and timeless aesthetic radiance for luxury wedding photography.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-12">
          {displayItems.map((item, idx) => (
            <m.button
              key={item._id || item.id || idx}
              type="button"
              aria-label={`Open ${item.title} photo`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="group relative w-full rounded-3xl overflow-hidden border border-sage-light/60 bg-sage-card text-left shadow-soft hover:shadow-editorial transition-all duration-500"
              onClick={() => setActivePhoto(item)}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-forest/10">
                <img
                  src={mediaUrl(item.imageUrl || item.image || item.src)}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-forest">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-site">
                        {item.category} • {item.location}
                      </span>
                      <h3 className="font-heading text-xl font-semibold">{item.title}</h3>
                    </div>
                    <span className="h-9 w-9 rounded-full bg-sage-card/90 text-forest flex items-center justify-center">
                      <Maximize2 className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </m.button>
          ))}
        </div>
      </Container>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {activePhoto && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest/90 p-4 backdrop-blur-md"
            onClick={() => setActivePhoto(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${activePhoto.title} photo viewer`}
          >
            <div
              className="relative max-w-3xl w-full rounded-3xl overflow-hidden border border-sage-light/40 bg-sage-card shadow-deep p-4 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                aria-label="Close photo viewer"
                className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-sage-border bg-sage-secondary text-forest hover:bg-sage-light/30 hover:text-site"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="max-h-[75vh] w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                <img src={mediaUrl(activePhoto.imageUrl || activePhoto.image || activePhoto.src)} alt="" className="h-full w-full object-contain" />
              </div>

              <div className="px-2 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-site">
                  {activePhoto.category} • {activePhoto.location}
                </span>
                <h3 className="font-heading text-2xl text-forest">{activePhoto.title}</h3>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}
