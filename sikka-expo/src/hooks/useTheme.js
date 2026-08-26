// Enhanced theme hooks for easy access to theme properties
import { useContext } from 'react';
import { Platform } from 'react-native';
import { ThemeContext } from '../theme/ThemeProvider';

// Main useTheme hook (re-export from ThemeProvider for convenience)
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// Specific hooks for different theme aspects
export const useColors = () => {
  const { colors } = useTheme();
  return colors;
};

export const useSpacing = () => {
  const { spacing } = useTheme();
  return spacing;
};

export const useTypography = () => {
  const { typography } = useTheme();
  return typography;
};

export const useBorderRadius = () => {
  const { borderRadius } = useTheme();
  return borderRadius;
};

export const useShadows = () => {
  const { shadows } = useTheme();
  return shadows;
};

export const useLayout = () => {
  const { layout } = useTheme();
  return layout;
};

export const useAnimations = () => {
  const { animations } = useTheme();
  return animations;
};

export const useZIndex = () => {
  const { zIndex } = useTheme();
  return zIndex;
};

export const useComponents = () => {
  const { components } = useTheme();
  return components;
};

export const useTransitions = () => {
  const { transitions } = useTheme();
  return transitions;
};

// Hook for getting component-specific styles
export const useComponentStyles = (componentName) => {
  const { components } = useTheme();
  return components[componentName] || {};
};

// Hook for getting text styles with theme colors
export const useTextStyle = (styleName = 'body') => {
  const { typography, colors } = useTheme();
  
  const baseStyle = typography.textStyles[styleName];
  if (!baseStyle) {
    console.warn(`Text style '${styleName}' not found. Using default 'body' style.`);
    return {
      ...typography.textStyles.body,
      color: colors.text,
      fontFamily: typography.fontFamily.primary,
    };
  }
  
  return {
    ...baseStyle,
    color: colors.text,
    fontFamily: typography.fontFamily.primary,
  };
};

// Hook for getting theme-aware styles
export const useThemedStyles = (styleFunction) => {
  const theme = useTheme();
  
  if (typeof styleFunction !== 'function') {
    throw new Error('useThemedStyles requires a function that returns styles');
  }
  
  return styleFunction(theme);
};

// Hook for responsive values based on screen size
export const useResponsiveValue = (values) => {
  // This would typically use screen dimensions, but for now returns mobile value
  // In a full implementation, you'd use Dimensions API or similar
  if (Array.isArray(values)) {
    return values[0]; // Return mobile value
  }
  
  if (typeof values === 'object' && values !== null) {
    return values.mobile || values.default || Object.values(values)[0];
  }
  
  return values;
};

// Hook for getting color with opacity
export const useColorWithOpacity = (colorName, opacity = 1) => {
  const { colors } = useTheme();
  
  const color = colors[colorName];
  if (!color) {
    console.warn(`Color '${colorName}' not found in theme`);
    return colors.text;
  }
  
  // Simple opacity handling for hex colors
  if (color.startsWith('#') && opacity < 1) {
    const hex = color.replace('#', '');
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `#${hex}${alpha}`;
  }
  
  return color;
};

// Hook for getting gradient colors
export const useGradient = (gradientName = 'primary') => {
  const { colors } = useTheme();
  
  const gradientMap = {
    primary: colors.primaryGradient || [colors.primary, colors.primary],
    background: colors.backgroundGradient || [colors.background, colors.surface],
  };
  
  return gradientMap[gradientName] || gradientMap.primary;
};

// Hook for platform-specific theme values
export const usePlatformTheme = (values) => {
  const theme = useTheme();
  
  if (typeof values === 'object' && values !== null) {
    // Return platform-specific value or default
    return values[Platform.OS] || values.default || Object.values(values)[0];
  }
  
  return values;
};

// Default export
export default useTheme;