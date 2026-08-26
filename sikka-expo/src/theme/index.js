// Theme system main export file
export { ThemeProvider, useTheme as useThemeFromProvider, useThemeToggle as useThemeToggleFromProvider, withTheme, ThemeContext } from './ThemeProvider';
export { darkTheme, lightTheme, getTheme, THEME_NAMES, DEFAULT_THEME, isValidTheme, mergeTheme } from './themes';
export { colors, getThemeColors, getCSSVariables, getStatusBarColors } from './colors';
export { typography, getTextStyle, responsiveFontSizes } from './typography';
export { spacing, borderRadius, shadows, layout, animations, zIndex, breakpoints } from './spacing';

// Re-export hooks
export { useTheme, useColors, useSpacing, useTypography, useBorderRadius, useShadows, useLayout, useAnimations, useZIndex, useComponents, useTransitions, useComponentStyles, useTextStyle, useThemedStyles, useResponsiveValue, useColorWithOpacity, useGradient, usePlatformTheme } from '../hooks/useTheme';
export { useThemeToggle } from '../hooks/useThemeToggle';

// Re-export utilities
export { default as themeUtils } from '../utils/themeUtils';