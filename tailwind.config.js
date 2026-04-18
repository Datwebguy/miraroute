/** @type {import('tailwindcss').Config} */
export default {
  // "class" mode: dark mode is activated by adding the "dark" class to <html>
  // This lets us programmatically toggle dark mode (we default to dark always)
  darkMode: "class",

  // Tell Tailwind which files to scan for class names — unused classes get purged in production
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        // ── MiraRoute brand palette ──────────────────────────────────────
        // Primary background — dark navy matching the logo
        navy: {
          950: "#070E17",
          900: "#0D1B2A",  // main app background
          800: "#112236",
          700: "#162C44",
          600: "#1C3654",
        },
        // Primary accent — teal from the MiraRoute logo arrow
        teal: {
          300: "#5EEAD4",
          400: "#2DD4BF",  // primary accent (buttons, badges, highlights)
          500: "#14B8A6",
          600: "#0D9488",
        },
        // Surface colors for cards and panels
        surface: {
          DEFAULT: "#112236",  // card background
          hover:   "#162C44",  // card hover state
          border:  "#1C3654",  // subtle border
        },
      },

      fontFamily: {
        // DM Sans is the primary font — clean geometric sans matching the logo
        sans: ["DM Sans", "Inter", "ui-sans-serif", "system-ui"],
      },

      // Custom border radius for the swap card's pill-style inputs
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },

      // Subtle box shadow for the swap card floating effect
      boxShadow: {
        card: "0 4px 32px rgba(0, 0, 0, 0.4)",
        glow: "0 0 24px rgba(45, 212, 191, 0.15)",
      },
    },
  },

  plugins: [],
};
