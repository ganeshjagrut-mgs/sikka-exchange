import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AlertCircle } from 'lucide-react-native';

/**
 * Validation error display component with action buttons
 * Shows authentication and form errors with recovery suggestions
 */
const ValidationError = ({ error, style, onRetry, onAction, actionText }) => {
  const { colors, typography } = useTheme();

  if (!error) return null;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.errorRow}>
        <AlertCircle size={18} color={colors.error} style={styles.icon} />
        <Text
          style={[
            styles.errorText,
            {
              color: colors.error,
              fontFamily: typography.fontFamily?.primary,
            },
          ]}
        >
          {error}
        </Text>
      </View>

      {/* Action buttons */}
      {(onRetry || onAction) && (
        <View style={styles.actionsRow}>
          {onRetry && (
            <TouchableOpacity
              onPress={onRetry}
              style={[
                styles.actionButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colors.text, fontFamily: typography.fontFamily?.primary },
                ]}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          )}

          {onAction && actionText && (
            <TouchableOpacity
              onPress={onAction}
              style={[
                styles.actionButton,
                { borderColor: colors.primary, backgroundColor: colors.surface },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colors.primary, fontFamily: typography.fontFamily?.primary },
                ]}
              >
                {actionText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ValidationError;