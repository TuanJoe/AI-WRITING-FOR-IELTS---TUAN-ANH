import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd3ff",
          300: "#8eb6ff",
          400: "#598dff",
          500: "#3366ff",
          600: "#1f48f5",
          700: "#1736e1",
          800: "#192fb6",
          900: "#1a2e8f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
