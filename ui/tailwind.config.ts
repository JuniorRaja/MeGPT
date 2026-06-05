import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "sidebar-bg": "var(--sidebar-bg)",
        "input-bg": "var(--input-bg)",
        accent: "var(--accent)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "bubble-user": "var(--bubble-user)",
      },
      fontFamily: {
        sans: ["var(--font)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
