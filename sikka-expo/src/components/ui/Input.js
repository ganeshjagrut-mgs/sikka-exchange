import React, { memo, useState, forwardRef } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

const Input = memo(forwardRef(({
  label,
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  error,
  helperText,
  disabled = false,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  containerStyle,
  editable = true,
  ...props
}, ref) => {
  const { colors, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(!secureTextEntry);

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const toggleSecureEntry = () => {
    setIsSecureVisible(!isSecureVisible);
  };

  const renderIcon = (icon, onPress) => {
    if (!icon) return null;

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} style={styles.iconButton}>
          {icon}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.iconContainer}>
        {icon}
      </View>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <Text style={[
          styles.label,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          {label}
        </Text>
      )}

      {/* Input Container - matching dashboard input styling */}
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: 'rgba(255, 255, 255, 0.1)', // Glass effect like dashboard
          borderColor: error
            ? colors.error
            : isFocused
              ? '#54c255' // Match dashboard primary green
              : 'rgba(255, 255, 255, 0.2)', // Match dashboard border
          opacity: disabled ? 0.6 : 1,
        },
        style
      ]}>
        {/* Left Icon */}
        {leftIcon && (
          <View style={styles.leftIcon}>
            {renderIcon(leftIcon)}
          </View>
        )}

        {/* Text Input */}
        <TextInput
          ref={ref}
          style={[
            styles.textInput,
            {
              color: '#fff', // Match dashboard white text
              fontFamily: typography.fontFamily?.primary,
              textAlignVertical: multiline ? 'top' : 'center',
              fontSize: 16, // Match dashboard input font size
              fontWeight: '500', // Match dashboard input weight
            },
            inputStyle
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af" // Match dashboard placeholder color
          editable={editable && !disabled}
          secureTextEntry={secureTextEntry && !isSecureVisible}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          {...props}
        />

        {/* Right Icon */}
        {rightIcon && (
          <View style={styles.rightIcon}>
            {renderIcon(rightIcon, onRightIconPress)}
          </View>
        )}

        {/* Password Toggle */}
        {secureTextEntry && (
          <TouchableOpacity 
            onPress={toggleSecureEntry}
            style={styles.passwordToggle}
          >
            <Text style={[styles.passwordToggleText, { color: colors.primary }]}>
              {isSecureVisible ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Helper Text / Error */}
      {(helperText || error) && (
        <Text style={[
          styles.helperText,
          {
            color: error ? colors.error : colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}), (prevProps, nextProps) => {
  // Custom memo comparison - only re-render if these specific props change
  // This is critical for performance - prevents re-renders when callbacks change
  return (
    prevProps.value === nextProps.value &&
    prevProps.error === nextProps.error &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.editable === nextProps.editable &&
    prevProps.secureTextEntry === nextProps.secureTextEntry
    // Don't compare onChangeText/onBlur - they should be stable via useCallback in FormField
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%', // Ensure container takes full width
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    width: '100%', // Ensure input container takes full width
  },
  textInput: {
    flex: 1,
    minWidth: 0, // Allow flex to shrink below content size
    fontSize: 16,
    paddingVertical: 0,
    outlineStyle: 'none', // Remove web outline
    width: '100%', // Ensure input takes full available space
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  iconContainer: {
    padding: 4,
  },
  iconButton: {
    padding: 4,
  },
  passwordToggle: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  passwordToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;