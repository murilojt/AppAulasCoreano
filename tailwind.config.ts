import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f0ff", 100: "#ebe0ff", 200: "#d6c1ff", 300: "#b794ff",
          400: "#9b6cf5", 500: "#7e45e8", 600: "#6a2fd0", 700: "#5624a8", 800: "#431c82", 900: "#2d1257",
        },
      },
      fontFamily: { sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Noto Sans KR", "Noto Sans", "sans-serif"] },
      keyframes: {
        pop: { "0%": { transform: "scale(.9)", opacity: "0" }, "60%": { transform: "scale(1.06)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "20%,60%": { transform: "translateX(-8px)" }, "40%,80%": { transform: "translateX(8px)" } },
        floatUp: { "0%": { transform: "translateY(8px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        pulseRing: { "0%": { boxShadow: "0 0 0 0 rgba(126,69,232,.5)" }, "100%": { boxShadow: "0 0 0 16px rgba(126,69,232,0)" } },
      },
      animation: {
        pop: "pop .35s ease-out", shake: "shake .4s ease-in-out", floatUp: "floatUp .3s ease-out", pulseRing: "pulseRing 1.4s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
