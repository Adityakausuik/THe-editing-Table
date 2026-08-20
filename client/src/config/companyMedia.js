/**
 * Centralized Media & Asset Configuration for The Editing Table
 * Provides high-resolution, curated creative production media for Hero, Services,
 * Portfolio, Wedding Gallery, and About sections with built-in fallbacks.
 */

export const companyMedia = {
  hero: [
    {
      url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85",
      altText: "Bespoke Architectural & Estate Post-Production",
      title: "Where Stories Meet The Editing Table"
    },
    {
      url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85",
      altText: "Luxury Wedding Cinematography & Editorial Color Grading",
      title: "Crafting Stories Beyond The Frame"
    },
    {
      url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=85",
      altText: "Fine-Art Wedding Photography & High-End Retouching",
      title: "Refined Visual Storytelling"
    }
  ],

  services: {
    photoEditing: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=85",
    retouching: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    colorGrading: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85",
    cropAndRefine: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
    detailEnhancement: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85",
    videoEditing: "https://images.unsplash.com/photo-1574717024453-354056aef981?auto=format&fit=crop&w=1200&q=85",
    weddingPostProduction: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
    filmPostProduction: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=85"
  },

  weddings: [
    {
      url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
      title: "Château de Provence Twilight Ceremony",
      category: "Wedding Cinema"
    },
    {
      url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85",
      title: "Tuscan Estate Fine-Art Portraiture",
      category: "Luxury Wedding Retouching"
    },
    {
      url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85",
      title: "Amalfi Coast Editorial Reception",
      category: "Color Science & Grading"
    },
    {
      url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=85",
      title: "Lake Como Villa Vows",
      category: "Full Post-Production Suite"
    }
  ],

  portfolio: [
    {
      url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85",
      title: "The Glass House Sunset Retouching",
      category: "High-End Photo Retouching"
    },
    {
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
      title: "Manhattan Sky Loft Editorial",
      category: "Architectural Photography"
    },
    {
      url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85",
      title: "Château de Bellevue Heritage Portfolio",
      category: "Luxury Estate"
    },
    {
      url: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85",
      title: "Villa Solaria Mediterranean Light",
      category: "Architectural Retouching"
    }
  ],

  about: {
    hero: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1400&q=85",
    studio: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=1200&q=85"
  }
};

export function getFallbackMedia(url, defaultFallback = "/assets/the-editing-table-logo.png") {
  if (!url) return defaultFallback;
  return url;
}
