import { m } from "framer-motion";
import { Camera, Maximize2 } from "lucide-react";
import { useState } from "react";
import Container from "../components/ui/Container.jsx";
import ImageZoomModal from "../components/ui/ImageZoomModal.jsx";
import { mediaUrl } from "../lib/api.js";
import { useCmsCollection } from "../lib/useCmsCollection.js";

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

export default function WeddingGalleryPage() {
  const { items: incomingItems, loading, error } = useCmsCollection("/api/v1/cms/wedding-gallery", "weddings");
  const items = Array.isArray(incomingItems) && incomingItems.length > 0 ? incomingItems : DEFAULT_WEDDING_GALLERY;
  const [activePhoto, setActivePhoto] = useState(null);

  return (
    <div className="py-24 sm:py-32 bg-sage-bg text-forest space-y-12">
      <Container className="space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-site shadow-soft">
            <Camera className="h-4 w-4" /> 8K Editorial Photography Retouching
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal text-forest">
            Wedding Photography Gallery
          </h1>
          <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
            High-fashion wedding photo retouching, skin texture preservation, and color science.
          </p>
        </div>

        {loading && <p className="text-center text-sm text-sage-muted">Loading wedding gallery...</p>}
        {error && <p className="text-center text-sm text-rose-700">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-center text-sm text-sage-muted">No published wedding gallery images are available yet.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <m.button
              key={item._id || item.id || idx}
              type="button"
              aria-label={`Open ${item.title} photo`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="group relative w-full rounded-3xl overflow-hidden border border-sage-light/60 bg-sage-card text-left shadow-soft transition-all duration-500 hover:shadow-editorial"
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

      <ImageZoomModal
        isOpen={!!activePhoto}
        onClose={() => setActivePhoto(null)}
        imageSrc={activePhoto ? mediaUrl(activePhoto.imageUrl || activePhoto.image || activePhoto.src) : ""}
        imageName={activePhoto?.title}
        imageRole={activePhoto ? `${activePhoto.category} • ${activePhoto.location}` : ""}
      />
    </div>
  );
}
