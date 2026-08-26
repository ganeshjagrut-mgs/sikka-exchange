// Typography system matching the original React app
// Based on Inter font family used in the original app

export const typography = {
  // Font families
  fontFamily: {
    primary: 'Inter, system-ui, -apple-system, sans-serif',
    secondary: 'SF Pro Display, system-ui, sans-serif', // iOS fallback
    monospace: 'SF Mono, Monaco, Consolas, monospace',
  },

  // Font sizes (matching original app scale)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
    '7xl': 72,
  },

  // Line heights (responsive and readable)
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Font weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Text styles for consistency across the app
  textStyles: {
    // Headers
    h1: {
      fontSize: 48,
      fontWeight: '700',
      lineHeight: 1.2,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 36,
      fontWeight: '600',
      lineHeight: 1.3,
      letterSpacing: -0.25,
    },
    h3: {
      fontSize: 30,
      fontWeight: '600',
      lineHeight: 1.4,
      letterSpacing: -0.1,
    },
    h4: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 1.4,
    },
    h5: {
      fontSize: 20,
      fontWeight: '500',
      lineHeight: 1.5,
    },
    h6: {
      fontSize: 18,
      fontWeight: '500',
      lineHeight: 1.5,
    },

    // Body text
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 1.6,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 1.5,
    },

    // Specialized text
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.4,
      letterSpacing: 0.5,
    },
    overline: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 1.4,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },

    // Interactive elements
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: 0.25,
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: 0.25,
    },
    buttonLarge: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: 0.25,
    },

    // Price and numbers (important for crypto app)
    priceDisplay: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 1.2,
      fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    },
    priceLarge: {
      fontSize: 36,
      fontWeight: '700',
      lineHeight: 1.1,
      fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    },
    priceSmall: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.2,
      fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    },

    // Navigation
    navItem: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 1.4,
    },
    navItemActive: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.4,
    },

    // Cards and components
    cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.3,
    },
    cardSubtitle: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.4,
    },
    cardBody: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.5,
    },
  },

  // Letter spacing values
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    widest: 1,
  },
};

// Helper function to get text style with theme colors
export const getTextStyle = (styleName, isDark = true) => {
  const style = typography.textStyles[styleName];
  if (!style) return {};

  return {
    ...style,
    fontFamily: typography.fontFamily.primary,
  };
};

// Responsive font sizes for different screen sizes
export const responsiveFontSizes = {
  // Mobile (default)
  mobile: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 22,
    '3xl': 26,
    '4xl': 30,
    '5xl': 36,
  },
  // Tablet
  tablet: {
    xs: 14,
    sm: 16,
    base: 18,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
  },
  // Desktop
  desktop: {
    xs: 14,
    sm: 16,
    base: 18,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
    '4xl': 48,
    '5xl': 60,
  },
};