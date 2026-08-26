// Comprehensive theme demo component showcasing all theme features
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useThemeToggle } from '../hooks/useThemeToggle';
import { useTextStyle } from '../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';

const ThemeDemo = () => {
  const { colors, spacing, shadows, borderRadius, typography } = useTheme();
  const { toggleThemeWithAnimation, getThemeInfo, fadeAnim } = useThemeToggle();
  
  const themeInfo = getThemeInfo();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing[4],
    },
    section: {
      marginBottom: spacing[6],
    },
    sectionTitle: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing[4],
      fontFamily: typography.fontFamily.primary,
    },
    card: {
      backgroundColor: colors.glassBackground,
      borderRadius: borderRadius.card,
      padding: spacing[4],
      marginBottom: spacing[4],
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...shadows.md,
    },
    primaryCard: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.card,
      padding: spacing[4],
      marginBottom: spacing[4],
      ...shadows.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing[2],
    },
    colorBox: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.sm,
      marginRight: spacing[3],
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      borderRadius: borderRadius.button,
      alignItems: 'center',
      marginBottom: spacing[3],
      ...shadows.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      borderRadius: borderRadius.button,
      alignItems: 'center',
      marginBottom: spacing[3],
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      fontFamily: typography.fontFamily.primary,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      fontFamily: typography.fontFamily.primary,
    },
    text: {
      color: colors.text,
      fontSize: typography.fontSize.base,
      fontFamily: typography.fontFamily.primary,
    },
    textSecondary: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.primary,
    },
    priceText: {
      color: colors.cryptoGreen,
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      fontFamily: typography.fontFamily.monospace,
    },
    negativePrice: {
      color: colors.cryptoRed,
    },
    gradient: {
      borderRadius: borderRadius.card,
      padding: spacing[4],
      marginBottom: spacing[4],
    },
    shadowBox: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing[4],
      marginBottom: spacing[3],
    },
  });

  const ColorPalette = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Color Palette</Text>
      
      <View style={styles.card}>
        <Text style={[styles.text, { marginBottom: spacing[3] }]}>Primary Colors</Text>
        
        <View style={styles.row}>
          <View style={[styles.colorBox, { backgroundColor: colors.primary }]} />
          <View>
            <Text style={styles.text}>Primary: {colors.primary}</Text>
            <Text style={styles.textSecondary}>Main brand color</Text>
          </View>
        </View>
        
        <View style={styles.row}>
          <View style={[styles.colorBox, { backgroundColor: colors.background }]} />
          <View>
            <Text style={styles.text}>Background: {colors.background}</Text>
            <Text style={styles.textSecondary}>Main background</Text>
          </View>
        </View>
        
        <View style={styles.row}>
          <View style={[styles.colorBox, { backgroundColor: colors.surface }]} />
          <View>
            <Text style={styles.text}>Surface: {colors.surface}</Text>
            <Text style={styles.textSecondary}>Card backgrounds</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.text, { marginBottom: spacing[3] }]}>Text Colors</Text>
        
        <Text style={styles.text}>Primary Text (colors.text)</Text>
        <Text style={styles.textSecondary}>Secondary Text (colors.textSecondary)</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.text, { marginBottom: spacing[3] }]}>Status Colors</Text>
        
        <Text style={[styles.text, { color: colors.success }]}>Success Color</Text>
        <Text style={[styles.text, { color: colors.warning }]}>Warning Color</Text>
        <Text style={[styles.text, { color: colors.error }]}>Error Color</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.text, { marginBottom: spacing[3] }]}>Crypto Colors</Text>
        
        <Text style={[styles.priceText]}>+15.6% Profit Green</Text>
        <Text style={[styles.priceText, styles.negativePrice]}>-8.2% Loss Red</Text>
      </View>
    </View>
  );

  const TypographyDemo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Typography</Text>
      
      <View style={styles.card}>
        <Text style={[styles.text, { fontSize: typography.fontSize['4xl'], fontWeight: typography.fontWeight.bold, marginBottom: spacing[2] }]}>
          Heading 1
        </Text>
        <Text style={[styles.text, { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.semibold, marginBottom: spacing[2] }]}>
          Heading 2
        </Text>
        <Text style={[styles.text, { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.semibold, marginBottom: spacing[2] }]}>
          Heading 3
        </Text>
        <Text style={[styles.text, { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.medium, marginBottom: spacing[3] }]}>
          Heading 4
        </Text>
        
        <Text style={[styles.text, { marginBottom: spacing[2] }]}>
          Body text (16px) - This is the standard body text used throughout the application.
        </Text>
        <Text style={[styles.textSecondary, { marginBottom: spacing[2] }]}>
          Secondary text (14px) - Used for captions and less important information.
        </Text>
        <Text style={[styles.text, { fontSize: typography.fontSize.xs }]}>
          Small text (12px) - Used for fine print and labels.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.text, { marginBottom: spacing[3] }]}>Crypto Price Display</Text>
        <Text style={[styles.priceText, { fontSize: typography.fontSize['4xl'] }]}>₹21,34,567</Text>
        <Text style={[styles.priceText, { fontSize: typography.fontSize.lg }]}>₹51,623.45</Text>
        <Text style={[styles.priceText, styles.negativePrice, { fontSize: typography.fontSize.base }]}>₹11.35</Text>
      </View>
    </View>
  );

  const ComponentsDemo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Components</Text>
      
      <View style={styles.card}>
        <Text style={[styles.text, { marginBottom: spacing[3] }]}>Buttons</Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Primary Button</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Secondary Button</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.success }]}
        >
          <Text style={styles.buttonText}>Success Button</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.error }]}
        >
          <Text style={styles.buttonText}>Error Button</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.primaryCard}>
        <Text style={[styles.buttonText, { fontSize: typography.fontSize.lg, marginBottom: spacing[2] }]}>
          Primary Card
        </Text>
        <Text style={[styles.buttonText, { opacity: 0.9 }]}>
          This card uses the primary color background with primary shadow effects.
        </Text>
      </View>
    </View>
  );

  const ShadowsDemo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Shadows & Elevations</Text>
      
      <View style={[styles.shadowBox, shadows.sm]}>
        <Text style={styles.text}>Small Shadow</Text>
      </View>
      
      <View style={[styles.shadowBox, shadows.md]}>
        <Text style={styles.text}>Medium Shadow</Text>
      </View>
      
      <View style={[styles.shadowBox, shadows.lg]}>
        <Text style={styles.text}>Large Shadow</Text>
      </View>
      
      <View style={[styles.shadowBox, shadows.primaryLarge]}>
        <Text style={styles.text}>Primary Colored Shadow</Text>
      </View>
    </View>
  );

  const ThemeToggleDemo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Theme System</Text>
      
      <View style={styles.card}>
        <Text style={[styles.text, { marginBottom: spacing[3] }]}>Current Theme</Text>
        <Text style={[styles.text, { fontSize: typography.fontSize.lg, marginBottom: spacing[2] }]}>
          {themeInfo.icon} {themeInfo.displayName}
        </Text>
        <Text style={styles.textSecondary}>
          Theme persists across app restarts and includes:
        </Text>
        <Text style={styles.textSecondary}>• Status bar theming</Text>
        <Text style={styles.textSecondary}>• System UI integration</Text>
        <Text style={styles.textSecondary}>• Smooth transitions</Text>
        <Text style={styles.textSecondary}>• NativeWind compatibility</Text>
        
        <TouchableOpacity 
          style={[styles.button, { marginTop: spacing[4] }]}
          onPress={() => toggleThemeWithAnimation()}
        >
          <Text style={styles.buttonText}>
            Switch to {themeInfo.nextIcon} {themeInfo.nextDisplayName}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: typography.fontSize['4xl'] }]}>
            Sikka Theme System
          </Text>
          <Text style={styles.textSecondary}>
            Comprehensive theme system matching the original React app with expo-system-ui integration
          </Text>
        </View>

        <ColorPalette />
        <TypographyDemo />
        <ComponentsDemo />
        <ShadowsDemo />
        <ThemeToggleDemo />

        {/* Spacer for scroll */}
        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </Animated.View>
  );
};

export default ThemeDemo;