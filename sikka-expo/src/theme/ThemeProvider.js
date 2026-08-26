// Main theme provider component with Context API and expo-system-ui integration
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBackgroundColorAsync, setStatusBarStyle } from 'expo-system-ui';
import { darkTheme, lightTheme, getTheme } from './themes';

// Theme context
const ThemeContext = createContext({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
  colors: darkTheme.colors,
  spacing: darkTheme.spacing,
  typography: darkTheme.typography,
});

// Storage key for persisting theme preference
const THEME_STORAGE_KEY = '@sikka_theme_preference';

// ThemeProvider component
export const ThemeProvider = ({ children, initialTheme = 'dark' }) => {
  const [isDark, setIsDark] = useState(initialTheme === 'dark');
  const [isLoading, setIsLoading] = useState(true);

  // Get current theme object
  const theme = getTheme(isDark);

  // Load saved theme preference on mount
  useEffect(() => {
    loadSavedTheme();
  }, []);

  // Update system UI when theme changes
  useEffect(() => {
    updateSystemUI(theme);
    updateWebCSS(theme);
  }, [theme]);

  // Load theme preference from storage
  const loadSavedTheme = async () => {
    try {
      // Always enforce dark mode - light mode is disabled
      setIsDark(true);
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save theme preference to storage
  const saveThemePreference = async (themeName) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  // Update system UI (status bar, navigation bar, etc.)
  const updateSystemUI = async (currentTheme) => {
    try {
      if (Platform.OS !== 'web') {
        // Update system UI background color
        await setBackgroundColorAsync(currentTheme.colors.background);
        
        // Update status bar style
        await setStatusBarStyle(
          currentTheme.statusBar.style,
          true // animated
        );
      }
    } catch (error) {
      console.warn('Failed to update system UI:', error);
    }
  };

  // Update CSS variables for web compatibility
  const updateWebCSS = (currentTheme) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Apply CSS custom properties
      Object.entries(currentTheme.cssVariables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      // Update document class for theme-specific styles
      const bodyClassList = document.body.classList;
      if (currentTheme.isDark) {
        bodyClassList.add('dark');
        bodyClassList.remove('light');
      } else {
        bodyClassList.add('light');
        bodyClassList.remove('dark');
      }

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', currentTheme.colors.background);
      }
    }
  };

  // Toggle between dark and light themes
  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    saveThemePreference(newIsDark ? 'dark' : 'light');
  };

  // Set specific theme
  const setTheme = (themeName) => {
    const newIsDark = themeName === 'dark';
    setIsDark(newIsDark);
    saveThemePreference(themeName);
  };

  // Context value
  const contextValue = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
    colors: theme.colors,
    spacing: theme.spacing,
    typography: theme.typography,
    borderRadius: theme.borderRadius,
    shadows: theme.shadows,
    layout: theme.layout,
    animations: theme.animations,
    zIndex: theme.zIndex,
    components: theme.components,
    transitions: theme.transitions,
    isLoading,
  };

  // Show loading state while theme is being loaded
  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// Hook for theme toggle functionality
export const useThemeToggle = () => {
  const { toggleTheme, setTheme, isDark } = useTheme();
  
  return {
    toggleTheme,
    setTheme,
    isDark,
    setDarkTheme: () => setTheme('dark'),
    setLightTheme: () => setTheme('light'),
  };
};

// Higher-order component for theme access
export const withTheme = (Component) => {
  return function ThemedComponent(props) {
    return (
      <ThemeContext.Consumer>
        {(theme) => <Component {...props} theme={theme} />}
      </ThemeContext.Consumer>
    );
  };
};

// Export theme context for advanced usage
export { ThemeContext };

// Default export
export default ThemeProvider;