/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      
      colors: {
        'l': '#ef4444', // red-500
        'background': 'rgb(246, 238, 219)',
        'inner-background': 'rgb(253, 251, 246)',
        'text': '#1a1a1a',
        'muted-text': '#888888',
        'primary-accent': '#2d5a2d', // deep forest green
        'accent-hover': '#3a6a3a',
        'highlight': '#7cb87c', // soft green for emphasis
        'border': '#1a1a1a', // strong
        'subtle-border': '#ccc', // subtle
        'inverted-sections': '#1a1a1a', // background with #f0f0e8 text



        // Background: #f0f0e8 (warm cream)
// Text: #1a1a1a (near-black)
// Muted text: #888888
// Primary accent: #2d5a2d (deep forest green)
// Accent hover: #3a6a3a
// Highlight: #7cb87c (soft green for emphasis)
// Borders: #1a1a1a (strong) or #ccc (subtle)
// Inverted sections: #1a1a1a background with #f0f0e8 text

      }
    },
  },
  plugins: [],
};
