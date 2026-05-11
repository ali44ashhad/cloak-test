/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          200: "#bcd2ff",
          300: "#8eb3ff",
          400: "#5b88ff",
          500: "#3563ff",
          600: "#1d44f5",
          700: "#1635dd",
          800: "#1830b2",
          900: "#1a2f8b",
        },
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 55%), radial-gradient(circle at bottom right, rgba(168,85,247,0.18), transparent 55%)",
      },
      boxShadow: {
        glow: "0 0 32px -8px rgba(59,130,246,0.55)",
        "inner-card": "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

