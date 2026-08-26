// Spacing system for consistent layout
// Based on 4px base unit for pixel-perfect design

export const spacing = {
  // Base spacing scale (in pixels)
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,

  // Semantic spacing values
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
  '5xl': 128,
  '6xl': 192,
};

// Border radius values (matching original app's rounded-2xl style)
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  '4xl': 32,
  full: 9999,

  // Semantic values
  button: 16,
  card: 16,
  input: 16,
  modal: 24,
  image: 8,
};

// Shadow system for depth and elevation
export const shadows = {
  // No shadow
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // Small shadow
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Default shadow
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  // Large shadow
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  // Extra large shadow
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },

  // Special shadows for themed elements
  primary: {
    shadowColor: '#54c255',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  primaryLarge: {
    shadowColor: '#54c255',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // Glass effect shadow
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 10,
  },
};

// Layout constants
export const layout = {
  // Container widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Common component dimensions
  header: {
    height: 64,
    heightMobile: 56,
  },

  sidebar: {
    width: 256,
    widthCollapsed: 80,
  },

  bottomTab: {
    height: 80,
    heightWithSafeArea: 100,
  },

  button: {
    height: {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 56,
    },
    minWidth: {
      sm: 64,
      md: 80,
      lg: 120,
      xl: 160,
    },
  },

  input: {
    height: {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 56,
    },
  },

  card: {
    minHeight: 120,
    padding: 24,
    paddingMobile: 16,
  },

  modal: {
    maxWidth: 500,
    padding: 24,
    paddingMobile: 16,
  },

  // Safe areas and insets
  safeArea: {
    top: 44,
    bottom: 34,
    horizontal: 16,
  },
};

// Breakpoints for responsive design
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Animation durations (in milliseconds)
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,

  // Semantic durations
  fadeIn: 300,
  slideIn: 300,
  bounce: 500,
  spring: 400,
  
  // Theme transition
  themeTransition: 300,
};

// Z-index scale for layering
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
  max: 2147483647,
};