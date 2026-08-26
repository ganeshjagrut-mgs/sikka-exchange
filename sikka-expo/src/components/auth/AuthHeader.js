import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';

/**
 * Authentication header component with Sikka Exchange branding
 * Professional tagline and responsive typography - matching dashboard style
 */
const AuthHeader = ({ title, subtitle, style }) => {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet } = useBreakpoints();

  return (
    <View style={[styles.container, style]}>
      {/* Company Logo/Branding with Gradient - matching dashboard */}
      <View style={styles.brandContainer}>
        <LinearGradient
          colors={['#54c255', '#54c255cc']} // Match dashboard green gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientTextContainer}
        >
          <Text style={[
            styles.brandText,
            {
              color: '#fff', // Gradient will apply
              fontFamily: typography.fontFamily?.primary,
              fontSize: isMobile ? 32 : isTablet ? 36 : 42, // Larger to match dashboard prominence
              fontWeight: typography.fontWeight?.bold || '700',
            }
          ]}>
            Sikkaa
          </Text>
        </LinearGradient>

        <Text style={[
          styles.taglineText,
          {
            color: '#9ca3af', // Match dashboard textSecondary color
            fontFamily: typography.fontFamily?.primary,
            fontSize: isMobile ? 14 : 16,
            fontWeight: typography.fontWeight?.medium || '500',
          }
        ]}>
          Trade Crypto with Confidence
        </Text>
      </View>

      {/* Screen Title */}
      {title && (
        <Text style={[
          styles.titleText,
          {
            color: '#fff', // Match dashboard white text
            fontFamily: typography.fontFamily?.primary,
            fontSize: isMobile ? 24 : isTablet ? 28 : 32,
            fontWeight: typography.fontWeight?.semibold || '600',
          }
        ]}>
          {title}
        </Text>
      )}

      {/* Screen Subtitle */}
      {subtitle && (
        <Text style={[
          styles.subtitleText,
          {
            color: '#9ca3af', // Match dashboard textSecondary
            fontFamily: typography.fontFamily?.primary,
            fontSize: isMobile ? 14 : 16,
            fontWeight: typography.fontWeight?.regular || '400',
          }
        ]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gradientTextContainer: {
    borderRadius: 4,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  brandText: {
    textAlign: 'center',
    letterSpacing: 2, // Match dashboard letter spacing
    marginBottom: 4,
    // Text shadow matching dashboard
    textShadowColor: 'rgba(79, 70, 229, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  taglineText: {
    textAlign: 'center',
    opacity: 1, // Remove opacity to match dashboard
  },
  titleText: {
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 40, // Match dashboard line height
  },
  subtitleText: {
    textAlign: 'center',
    lineHeight: 24, // Match dashboard line height
    maxWidth: 300,
  },
});

export default AuthHeader;