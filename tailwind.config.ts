import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ice: '#8bbfd5',
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'sans-serif'],
        title: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
