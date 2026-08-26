// Theme utility functions for various theme operations
import { Platform } from 'react-native';
import { colors } from '../theme/colors';

// Color manipulation utilities
export const hexToRgba = (hex, alpha = 1) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const rgbaToHex = (rgba) => {
  const values = rgba.match(/rgba?\(([^)]+)\)/)?.[1].split(',');
  if (!values) return rgba;
  
  const r = parseInt(values[0].trim());
  const g = parseInt(values[1].trim());
  const b = parseInt(values[2].trim());
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// Darken or lighten a color
export const adjustColorBrightness = (color, percent) => {
  const isHex = color.startsWith('#');
  const rgb = isHex ? hexToRgba(color).match(/\d+/g).map(Number) : color.match(/\d+/g).map(Number);
  
  if (!rgb || rgb.length < 3) return color;
  
  const [r, g, b] = rgb;
  const factor = percent > 0 ? (100 + percent) / 100 : (100 + percent) / 100;
  
  const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor)));
  
  if (isHex) {
    return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
  }
  
  return `rgb(${newR}, ${newG}, ${newB})`;
};

// Generate color palette variations
export const generateColorPalette = (baseColor) => {
  return {
    50: adjustColorBrightness(baseColor, 90),
    100: adjustColorBrightness(baseColor, 80),
    200: adjustColorBrightness(baseColor, 60),
    300: adjustColorBrightness(baseColor, 40),
    400: adjustColorBrightness(baseColor, 20),
    500: baseColor,
    600: adjustColorBrightness(baseColor, -20),
    700: adjustColorBrightness(baseColor, -40),
    800: adjustColorBrightness(baseColor, -60),
    900: adjustColorBrightness(baseColor, -80),
  };
};

// Theme validation utilities
export const validateThemeStructure = (theme) => {
  const requiredKeys = ['name', 'isDark', 'colors', 'typography', 'spacing'];
  const missingKeys = requiredKeys.filter(key => !(key in theme));
  
  if (missingKeys.length > 0) {
    console.warn(`Theme validation failed. Missing keys: ${missingKeys.join(', ')}`);
    return false;
  }
  
  return true;
};

export const validateColorPalette = (colorPalette) => {
  const requiredColors = ['primary', 'background', 'surface', 'text', 'border'];
  const missingColors = requiredColors.filter(color => !(color in colorPalette));
  
  if (missingColors.length > 0) {
    console.warn(`Color palette validation failed. Missing colors: ${missingColors.join(', ')}`);
    return false;
  }
  
  return true;
};

// Style generation utilities
export const createThemedStyleSheet = (styleFunction, theme) => {
  if (typeof styleFunction !== 'function') {
    throw new Error('createThemedStyleSheet expects a function that returns styles');
  }
  
  return styleFunction(theme);
};

// Shadow utilities
export const createShadow = (elevation, color = '#000', opacity = 0.1) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: color,
      shadowOffset: {
        width: 0,
        height: elevation / 2,
      },
      shadowOpacity: opacity,
      shadowRadius: elevation,
    };
  } else {
    return {
      elevation,
      shadowColor: color,
    };
  }
};

// Responsive utilities
export const getResponsiveValue = (values, screenWidth) => {
  if (typeof values !== 'object' || Array.isArray(values)) {
    return values;
  }
  
  // Define breakpoints
  const breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  };
  
  // Find the appropriate value based on screen width
  const breakpointKeys = Object.keys(breakpoints).reverse();
  
  for (const key of breakpointKeys) {
    if (screenWidth >= breakpoints[key] && values[key] !== undefined) {
      return values[key];
    }
  }
  
  // Return the first available value if no match found
  return Object.values(values)[0];
};

// Animation utilities
export const createThemeTransition = (duration = 300) => {
  return {
    duration,
    useNativeDriver: false, // Can't use native driver for color changes
  };
};

// NativeWind class utilities
export const getNativeWindClasses = (theme) => {
  const { isDark } = theme;
  
  return {
    // Background classes
    background: `bg-[${theme.colors.background}]`,
    surface: `bg-[${theme.colors.surface}]`,
    
    // Text classes
    text: `text-[${theme.colors.text}]`,
    textSecondary: `text-[${theme.colors.textSecondary}]`,
    
    // Border classes
    border: `border-[${theme.colors.border}]`,
    borderPrimary: `border-[${theme.colors.primary}]`,
    
    // Theme class
    themeClass: isDark ? 'dark' : 'light',
  };
};

// Crypto-specific color utilities
export const getCryptoColor = (change) => {
  if (change > 0) return colors.shared.chart.profit;
  if (change < 0) return colors.shared.chart.loss;
  return colors.shared.chart.neutral;
};

export const formatCryptoValue = (value, currency = 'INR') => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(value);
};

// Theme debugging utilities
export const debugTheme = (theme) => {
  console.group('Theme Debug Info');
  console.log('Theme Name:', theme.name);
  console.log('Is Dark:', theme.isDark);
  console.log('Colors:', Object.keys(theme.colors).length, 'defined');
  console.log('Typography:', theme.typography ? 'defined' : 'missing');
  console.log('Spacing:', theme.spacing ? 'defined' : 'missing');
  console.log('Components:', Object.keys(theme.components || {}).length, 'defined');
  console.groupEnd();
};

// Performance utilities
export const memoizeThemeFunction = (fn) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
};

// Export commonly used color transformations
export const themeUtils = {
  hexToRgba,
  rgbaToHex,
  adjustColorBrightness,
  generateColorPalette,
  validateThemeStructure,
  validateColorPalette,
  createThemedStyleSheet,
  createShadow,
  getResponsiveValue,
  createThemeTransition,
  getNativeWindClasses,
  getCryptoColor,
  formatCryptoValue,
  debugTheme,
  memoizeThemeFunction,
};

export default themeUtils;