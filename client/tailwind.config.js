/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#20252D',   // sidebar, headers, primary text
        dark: '#374151',       // cards, panels, borders
        orange: '#F97316',     // primary buttons, active menu, key actions
        peach: '#FED7AA',      // warnings and highlights
        surface: '#F9FAFB',    // page background
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
