import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Password strength indicator component
 * Shows visual indicator of password strength with color coding
 */
const PasswordStrengthIndicator = ({ passwordStrength, style }) => {
  const { colors, typography } = useTheme();

  if (!passwordStrength) return null;

  const { strength, label, color } = passwordStrength;

  // Calculate progress width (25%, 50%, 75%, 100%)
  const progressWidth = `${(strength / 4) * 100}%`;

  return (
    <View style={[styles.container, style]}>
      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}> {/* Match dashboard border */}
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: color,
              width: progressWidth,
            }
          ]}
        />
      </View>

      {/* Strength Label */}
      <Text style={[
        styles.strengthLabel,
        {
          color: '#9ca3af', // Match dashboard textSecondary for consistency
          fontFamily: typography.fontFamily?.primary,
        }
      ]}>
        Password strength: <Text style={{ color: color }}>{label}</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default PasswordStrengthIndicator;