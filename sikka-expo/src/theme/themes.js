// Main theme definitions combining colors, typography, and spacing
// Matches the original React app's sophisticated theme system

import { colors, getThemeColors, getCSSVariables, getStatusBarColors } from './colors';
import { typography, getTextStyle } from './typography';
import { spacing, borderRadius, shadows, layout, animations, zIndex } from './spacing';

// Dark theme definition
export const darkTheme = {
  name: 'dark',
  isDark: true,
  colors: getThemeColors(true),
  typography,
  spacing,
  borderRadius,
  shadows,
  layout,
  animations,
  zIndex,
  
  // Status bar configuration for expo-system-ui
  statusBar: getStatusBarColors(true),
  
  // CSS variables for web compatibility
  cssVariables: getCSSVariables(true),
  
  // Theme-specific component styles
  components: {
    // Button styles matching original app
    button: {
      primary: {
        backgroundColor: colors.dark.primary,
        color: '#FFFFFF',
        borderRadius: borderRadius.button,
        ...shadows.primary,
        padding: {
          vertical: spacing[3],
          horizontal: spacing[6],
        },
        ...getTextStyle('button'),
      },
      secondary: {
        backgroundColor: 'rgba(222, 226, 236, 0.1)',
        color: colors.dark.text,
        borderColor: colors.dark.border,
        borderWidth: 1,
        borderRadius: borderRadius.button,
        padding: {
          vertical: spacing[3],
          horizontal: spacing[6],
        },
        ...getTextStyle('button'),
      },
    },

    // Input styles
    input: {
      backgroundColor: colors.dark.surface,
      color: colors.dark.text,
      borderColor: colors.dark.border,
      borderWidth: 1,
      borderRadius: borderRadius.input,
      padding: {
        vertical: spacing[3],
        horizontal: spacing[4],
      },
      ...getTextStyle('body'),
      placeholderTextColor: colors.dark.textSecondary,
    },

    // Card styles matching crypto-card class
    card: {
      backgroundColor: colors.dark.glassBackground,
      borderColor: colors.dark.glassBorder,
      borderWidth: 1,
      borderRadius: borderRadius.card,
      padding: spacing[6],
      ...shadows.glass,
    },

    // Navigation styles
    navigation: {
      backgroundColor: colors.dark.surface,
      borderColor: colors.dark.border,
      ...shadows.md,
    },

    // Modal styles
    modal: {
      backgroundColor: colors.dark.background,
      borderColor: colors.dark.border,
      borderRadius: borderRadius.modal,
      ...shadows.xl,
    },

    // Glass effect styles
    glass: {
      backgroundColor: colors.dark.glassBackground,
      borderColor: colors.dark.glassBorder,
      borderWidth: 1,
      ...shadows.glass,
    },
  },
  
  // Animation configurations
  transitions: {
    theme: {
      duration: animations.themeTransition,
      easing: 'ease-in-out',
    },
    hover: {
      duration: animations.fast,
      easing: 'ease-out',
    },
    modal: {
      duration: animations.normal,
      easing: 'ease-out',
    },
  },
};

// Light theme definition
export const lightTheme = {
  name: 'light',
  isDark: false,
  colors: getThemeColors(false),
  typography,
  spacing,
  borderRadius,
  shadows,
  layout,
  animations,
  zIndex,
  
  // Status bar configuration for expo-system-ui
  statusBar: getStatusBarColors(false),
  
  // CSS variables for web compatibility
  cssVariables: getCSSVariables(false),
  
  // Theme-specific component styles
  components: {
    // Button styles
    button: {
      primary: {
        backgroundColor: colors.light.primary,
        color: '#FFFFFF',
        borderRadius: borderRadius.button,
        ...shadows.primary,
        padding: {
          vertical: spacing[3],
          horizontal: spacing[6],
        },
        ...getTextStyle('button'),
      },
      secondary: {
        backgroundColor: colors.light.secondary,
        color: colors.light.text,
        borderColor: colors.light.border,
        borderWidth: 1,
        borderRadius: borderRadius.button,
        padding: {
          vertical: spacing[3],
          horizontal: spacing[6],
        },
        ...getTextStyle('button'),
      },
    },

    // Input styles
    input: {
      backgroundColor: colors.light.surface,
      color: colors.light.text,
      borderColor: colors.light.border,
      borderWidth: 1,
      borderRadius: borderRadius.input,
      padding: {
        vertical: spacing[3],
        horizontal: spacing[4],
      },
      ...getTextStyle('body'),
      placeholderTextColor: colors.light.textSecondary,
    },

    // Card styles
    card: {
      backgroundColor: colors.light.glassBackground,
      borderColor: colors.light.glassBorder,
      borderWidth: 1,
      borderRadius: borderRadius.card,
      padding: spacing[6],
      ...shadows.md,
    },

    // Navigation styles
    navigation: {
      backgroundColor: colors.light.background,
      borderColor: colors.light.border,
      ...shadows.sm,
    },

    // Modal styles
    modal: {
      backgroundColor: colors.light.background,
      borderColor: colors.light.border,
      borderRadius: borderRadius.modal,
      ...shadows.xl,
    },

    // Glass effect styles
    glass: {
      backgroundColor: colors.light.glassBackground,
      borderColor: colors.light.glassBorder,
      borderWidth: 1,
      ...shadows.md,
    },
  },
  
  // Animation configurations
  transitions: {
    theme: {
      duration: animations.themeTransition,
      easing: 'ease-in-out',
    },
    hover: {
      duration: animations.fast,
      easing: 'ease-out',
    },
    modal: {
      duration: animations.normal,
      easing: 'ease-out',
    },
  },
};

// Theme selector function
export const getTheme = (isDark = true) => {
  return isDark ? darkTheme : lightTheme;
};

// Theme constants
export const THEME_NAMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

// Default theme
export const DEFAULT_THEME = darkTheme;

// Theme validation function
export const isValidTheme = (theme) => {
  return theme && 
    typeof theme.name === 'string' &&
    typeof theme.isDark === 'boolean' &&
    theme.colors &&
    theme.typography &&
    theme.spacing;
};

// Helper function to merge theme with custom overrides
export const mergeTheme = (baseTheme, overrides = {}) => {
  return {
    ...baseTheme,
    ...overrides,
    colors: {
      ...baseTheme.colors,
      ...(overrides.colors || {}),
    },
    components: {
      ...baseTheme.components,
      ...(overrides.components || {}),
    },
  };
};