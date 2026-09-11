/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Bona Nova"', "Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
        bona: ['"Bona Nova"', "Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
        serif: ["Manrope", '"Avenir Next"', '"Segoe UI Variable"', "Inter", "system-ui", "sans-serif"],
        sans: ["Manrope", '"Avenir Next"', '"Segoe UI Variable"', "Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"]
      },
      colors: {
        // Flat Soft Sage Green + Off-White Palette
        sage: "rgb(72,125,72)",
        "sage-hover": "#3B693B",
        "sage-light": "#C8D8BE",
        "sage-border": "#E3EBDD",
        "sage-bg": "#F8FBF7",
        "sage-secondary": "#F2F7F0",
        "sage-card": "#FFFFFF",
        "sage-alt": "#F6F8F4",
        "sage-muted": "#4A584A",
        "sage-success": "rgb(72,125,72)",
        forest: "#1A241A",
        obsidian: "#1A241A",

        // Aliases for compatibility
        copper: "rgb(72,125,72)",
        terracotta: "#3B693B",
        champagne: "#C8D8BE",
        espresso: "#1A241A",
        "warm-grey": "#4A584A",
        "warm-white": "#FFFFFF",
        ivory: "#F8FBF7",
        cream: "#F2F7F0",
        "dark-cream": "#F6F8F4",
        "border-warm": "#E3EBDD",
        "glow-gold": "rgba(72, 125, 72, 0.20)"
      },
      textColor: {
        site: "var(--site-text-color)",
        sage: "var(--site-text-color)",
        "sage-hover": "var(--site-text-color)",
        "sage-success": "var(--site-text-color)",
        "sage-muted": "var(--site-text-color)",
        forest: "var(--site-text-color)",
        copper: "var(--site-text-color)",
        terracotta: "var(--site-text-color)",
        espresso: "var(--site-text-color)",
        "warm-grey": "var(--site-text-color)"
      },
      boxShadow: {
        soft: "0 10px 30px -5px rgba(47, 58, 47, 0.04), 0 4px 12px -2px rgba(47, 58, 47, 0.02)",
        editorial: "0 20px 50px -10px rgba(47, 58, 47, 0.06), 0 10px 20px -5px rgba(143, 174, 123, 0.10)",
        sage: "0 8px 30px rgba(143, 174, 123, 0.20)",
        deep: "0 25px 70px -15px rgba(47, 58, 47, 0.12)"
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px'
      }
    }
  },
  plugins: []
};
