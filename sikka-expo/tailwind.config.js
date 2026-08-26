/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Exact colors from original React app tailwind.config.js
        primary: "#54c255", // Crypto Green
        secondary: "#dee2ec",
        accent: "#54c255",
        background: "#181a2a", // Dark Blue  
        surface: "#262626", // Dark Gray
        text: "#FFFFFF",
        textSecondary: "#A3A3A3",
        border: "#2F2F2F",
        success: "#2286ff",
        warning: "#f59e0b",
        error: "#ef4444",
        'crypto-green': "#54c255",
        'crypto-red': "#ef4444",
        
        // Light theme colors (keeping for theme toggle)
        'light-primary': "#54c255",
        'light-secondary': "#dee2ec",
        'light-accent': "#54c255",
        'light-background': "#ffffff",
        'light-surface': "#f8fafc",
        'light-text': "#1f2937",
        'light-textSecondary': "#6b7280",
        'light-border': "#e5e7eb",
        'light-success': "#2286ff",
        'light-warning': "#f59e0b",
        'light-error': "#ef4444",
        'light-crypto-green': "#54c255",
        'light-crypto-red': "#ef4444",
      },
      backgroundColor: {
        primary: "#54c255",
        background: "#181a2a",
        surface: "#262626",
        card: "#1f2937"
      },
      textColor: {
        primary: "#54c255",
        foreground: "#ffffff",
        muted: "#A3A3A3",
        success: "#2286ff",
        error: "#ef4444"
      },
      borderColor: {
        primary: "#54c255",
        border: "#2F2F2F"
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        mono: ['Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'border-glow': 'borderGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(84, 194, 85, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(84, 194, 85, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(84, 194, 85, 0.3)' },
          '50%': { borderColor: 'rgba(84, 194, 85, 0.8)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
  darkMode: 'class', // Enable class-based dark mode like original React app
};