import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          pink: "#ff2bd6",
          hot: "#ff007f",
          soft: "#ff7be8"
        }
      },
      boxShadow: {
        neon: "0 0 24px rgba(255, 43, 214, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
