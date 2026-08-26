import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassContainer from '../ui/GlassContainer';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Glass morphism container for authentication screens
 * Provides consistent styling and layout for login/signup forms
 */
const AuthContainer = ({
  children,
  style,
  contentStyle,
  scrollable = true,
  keyboardOffset = 100,
  ...props
}) => {
  const { colors, isDark } = useTheme();

  // Match dashboard background - solid dark with subtle gradient
  const gradientColors = isDark
    ? ['#181a2a', '#1e2030', '#181a2a'] // Match dashboard exact colors
    : ['#f9fafb', '#ffffff', '#f9fafb']; // Light mode subtle gradient

  // Content JSX - inlined to prevent remounts on re-render
  // (defining as a function component inside would cause keyboard collapse)
  const contentJSX = (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Content Container */}
      <View style={[styles.contentContainer, contentStyle]}>
        <GlassContainer
          intensity={isDark ? 60 : 40}
          style={[styles.glassContainer, style]}
          {...props}
        >
          {children}
        </GlassContainer>
      </View>
    </View>
  );

  if (scrollable) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {contentJSX}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardOffset}
    >
      {contentJSX}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: '100%',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  glassContainer: {
    width: '100%',
    padding: 32,
    borderRadius: 16, // Match dashboard card radius (16px instead of 24px)
    // Shadow for iOS - matching dashboard shadows
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 8,
    // Border for glass effect - match dashboard border
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Match dashboard border color
  },
});

export default AuthContainer;