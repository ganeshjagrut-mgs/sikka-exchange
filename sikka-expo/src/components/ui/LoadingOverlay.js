import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { CheckCircle } from 'lucide-react-native';

/**
 * Loading overlay with multi-step progress indication
 * Shows current step, completed steps, and loading animation
 */
const LoadingOverlay = ({ visible, steps = [], currentStep = 0 }) => {
  const { colors, typography } = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Main loader */}
        <ActivityIndicator size="large" color={colors.primary} style={styles.mainLoader} />

        {/* Progress steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <View key={index} style={styles.stepRow}>
                {/* Step indicator */}
                <View style={styles.stepIndicator}>
                  {isCompleted ? (
                    <CheckCircle size={20} color={colors.success} />
                  ) : isCurrent ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={[
                      styles.pendingDot,
                      { backgroundColor: colors.border }
                    ]} />
                  )}
                </View>

                {/* Step text */}
                <Text
                  style={[
                    styles.stepText,
                    {
                      color: isCompleted
                        ? colors.success
                        : isCurrent
                        ? colors.text
                        : colors.textSecondary,
                      fontFamily: typography.fontFamily?.primary,
                      fontWeight: isCurrent ? '600' : '400',
                    },
                  ]}
                >
                  {step}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    borderRadius: 16,
    padding: 32,
    minWidth: 280,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainLoader: {
    marginBottom: 24,
  },
  stepsContainer: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepText: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
});

export default LoadingOverlay;