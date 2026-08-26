import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import GlassContainer from '../src/components/ui/GlassContainer';
import { Shield } from 'lucide-react-native';

export default function SecurityScreen() {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <GlassContainer style={styles.comingSoonContainer}>
          <View style={styles.iconContainer}>
            <Shield size={64} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.title, { color: colors.text, fontFamily: typography.fontFamily?.primary }]}>
            Security Settings
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Coming Soon
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontFamily: typography.fontFamily?.primary }]}>
            Advanced security settings including two-factor authentication, biometric login, and device management will be available here.
          </Text>
        </GlassContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  comingSoonContainer: {
    padding: 32,
    alignItems: 'center',
    minHeight: 300,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    opacity: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
  },
});