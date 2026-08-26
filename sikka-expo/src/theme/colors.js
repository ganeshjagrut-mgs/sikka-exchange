// Color palette matching the original React app's theme system
// Colors extracted from sikka/src/index.css and tailwind.config.js

export const colors = {
  // Dark theme colors (default)
  dark: {
    primary: '#54c255',
    secondary: '#dee2ec',
    accent: '#54c255',
    background: '#181a2a',
    surface: '#262626',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    border: '#2F2F2F',
    success: '#2286ff',
    warning: '#f59e0b',
    error: '#ef4444',
    cryptoGreen: '#54c255',
    cryptoRed: '#ef4444',
    
    // Additional functional colors
    backgroundSecondary: '#1e2026',
    surfaceSecondary: '#2a2a2a',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    borderHover: '#54c255',
    textDisabled: '#6b7280',
    
    // Glass effect colors
    glassBackground: 'rgba(38, 38, 38, 0.8)',
    glassBorder: 'rgba(84, 194, 85, 0.1)',
    
    // Gradient colors
    primaryGradient: ['#54c255', 'rgba(84, 194, 85, 0.8)'],
    backgroundGradient: ['rgba(84, 194, 85, 0.1)', 'rgba(84, 194, 85, 0.05)'],
  },

  // Light theme colors
  light: {
    primary: '#54c255',
    secondary: '#dee2ec',
    accent: '#54c255',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    success: '#2286ff',
    warning: '#f59e0b',
    error: '#ef4444',
    cryptoGreen: '#54c255',
    cryptoRed: '#ef4444',
    
    // Additional functional colors
    backgroundSecondary: '#f1f5f9',
    surfaceSecondary: '#ffffff',
    overlay: 'rgba(255, 255, 255, 0.9)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    borderHover: '#54c255',
    textDisabled: '#9ca3af',
    
    // Glass effect colors
    glassBackground: 'rgba(248, 250, 252, 0.8)',
    glassBorder: 'rgba(84, 194, 85, 0.2)',
    
    // Gradient colors
    primaryGradient: ['#54c255', 'rgba(84, 194, 85, 0.8)'],
    backgroundGradient: ['rgba(84, 194, 85, 0.1)', 'rgba(84, 194, 85, 0.05)'],
  },

  // Shared colors that don't change between themes
  shared: {
    // Crypto currency colors
    bitcoin: '#f7931a',
    ethereum: '#627eea',
    cardano: '#0033ad',
    solana: '#9945ff',
    polygon: '#8247e5',
    
    // Status colors
    online: '#10b981',
    offline: '#ef4444',
    pending: '#f59e0b',
    
    // Chart colors
    chart: {
      profit: '#54c255',
      loss: '#ef4444',
      neutral: '#6b7280',
      volume: '#94a3b8',
    },
  },
};

// Helper function to get theme-specific colors
export const getThemeColors = (isDark = true) => {
  const theme = isDark ? colors.dark : colors.light;
  return {
    ...theme,
    ...colors.shared,
  };
};

// CSS custom property mappings for NativeWind
export const getCSSVariables = (isDark = true) => {
  const themeColors = getThemeColors(isDark);
  
  return {
    '--color-primary': themeColors.primary,
    '--color-secondary': themeColors.secondary,
    '--color-accent': themeColors.accent,
    '--color-background': themeColors.background,
    '--color-surface': themeColors.surface,
    '--color-text': themeColors.text,
    '--color-text-secondary': themeColors.textSecondary,
    '--color-border': themeColors.border,
    '--color-success': themeColors.success,
    '--color-warning': themeColors.warning,
    '--color-error': themeColors.error,
    '--color-crypto-green': themeColors.cryptoGreen,
    '--color-crypto-red': themeColors.cryptoRed,
    '--color-glass-bg': themeColors.glassBackground,
    '--color-glass-border': themeColors.glassBorder,
  };
};

// Status bar colors for expo-system-ui
export const getStatusBarColors = (isDark = true) => {
  return {
    backgroundColor: isDark ? colors.dark.background : colors.light.background,
    style: isDark ? 'light' : 'dark',
  };
};