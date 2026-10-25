/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        clinical: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc5fb",
          400: "#36a5f7",
          500: "#0c87eb",
          600: "#016bc9",
          700: "#0255a3",
          800: "#064886",
          900: "#0b3c6f",
          950: "#07264a",
        },
        triage: {
          resus: "#ef4444",      // ESI 1: Immediate Resuscitation (Red)
          emergent: "#f97316",   // ESI 2: Emergent (Orange)
          urgent: "#eab308",     // ESI 3: Urgent (Yellow)
          lessUrgent: "#3b82f6", // ESI 4: Less Urgent (Blue)
          nonUrgent: "#10b981",  // ESI 5: Non-Urgent (Green)
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
