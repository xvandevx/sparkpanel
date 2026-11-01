/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  // Preflight выключен намеренно: его сброс стилей ломает компоненты Ant Design
  // (в первую очередь фон у Button). Свой минимальный сброс — в styles/globals.css.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
