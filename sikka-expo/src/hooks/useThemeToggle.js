// Specialized hook for theme switching functionality
import { useTheme } from '../theme/ThemeProvider';
import { Animated } from 'react-native';
import { useRef } from 'react';

export const useThemeToggle = () => {
  const { toggleTheme, setTheme, isDark, isLoading } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Smooth theme transition with animation
  const toggleThemeWithAnimation = (callback) => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Change theme
      toggleTheme();
      
      // Optional callback
      if (callback) {
        callback();
      }
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // Set specific theme with animation
  const setThemeWithAnimation = (themeName, callback) => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Change theme
      setTheme(themeName);
      
      // Optional callback
      if (callback) {
        callback();
      }
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // Quick theme setters
  const setDarkTheme = (animated = false) => {
    if (animated) {
      setThemeWithAnimation('dark');
    } else {
      setTheme('dark');
    }
  };

  const setLightTheme = (animated = false) => {
    if (animated) {
      setThemeWithAnimation('light');
    } else {
      setTheme('light');
    }
  };

  // Theme cycle function (useful for testing multiple themes)
  const cycleTheme = () => {
    if (isDark) {
      setLightTheme(true);
    } else {
      setDarkTheme(true);
    }
  };

  // Get theme display information
  const getThemeInfo = () => {
    return {
      currentTheme: isDark ? 'dark' : 'light',
      displayName: isDark ? 'Dark Mode' : 'Light Mode',
      icon: isDark ? '🌙' : '☀️',
      nextTheme: isDark ? 'light' : 'dark',
      nextDisplayName: isDark ? 'Light Mode' : 'Dark Mode',
      nextIcon: isDark ? '☀️' : '🌙',
    };
  };

  // System theme detection (if supported)
  const followSystemTheme = () => {
    // This would typically use Appearance API from react-native
    // For now, we'll default to dark theme
    console.log('System theme detection not implemented yet');
    setDarkTheme();
  };

  return {
    // Basic toggle functions
    toggleTheme,
    setTheme,
    isDark,
    isLoading,
    
    // Animated toggle functions
    toggleThemeWithAnimation,
    setThemeWithAnimation,
    
    // Quick setters
    setDarkTheme,
    setLightTheme,
    
    // Advanced functions
    cycleTheme,
    followSystemTheme,
    
    // Information
    getThemeInfo,
    
    // Animation values
    fadeAnim,
    
    // Utility functions
    isCurrentTheme: (themeName) => {
      return (themeName === 'dark') === isDark;
    },
    
    // Theme persistence status
    canSwitchTheme: !isLoading,
  };
};

// Default export
export default useThemeToggle;