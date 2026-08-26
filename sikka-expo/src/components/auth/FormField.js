import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Input from '../ui/Input';

/**
 * Form field wrapper for authentication forms
 * Integrates with validation and provides consistent styling
 */
const FormField = memo(({
  field,
  validation,
  value,
  onChange,
  onBlur,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}) => {
  const error = validation.getFieldError(field);

  // Create stable wrapper functions using useCallback
  // This prevents Input from re-rendering on every keystroke
  const handleChangeText = useCallback((text) => {
    onChange(field, text);
  }, [onChange, field]);

  const handleBlurEvent = useCallback(() => {
    onBlur(field);
  }, [onBlur, field]);

  return (
    <View style={[styles.container, style]}>
      <Input
        value={value}
        onChangeText={handleChangeText}
        onBlur={handleBlurEvent}
        placeholder={placeholder}
        error={error}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        onRightIconPress={onRightIconPress}
        {...props}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if value or error actually changed
  // Return TRUE to SKIP re-render (props haven't changed)
  // Return FALSE to FORCE re-render (props changed)

  // Compare values first (most common change)
  if (prevProps.value !== nextProps.value) return false;

  // Compare field name (should never change, but check for safety)
  if (prevProps.field !== nextProps.field) return false;

  // Compare errors
  const prevError = prevProps.validation.getFieldError(prevProps.field);
  const nextError = nextProps.validation.getFieldError(nextProps.field);
  if (prevError !== nextError) return false;

  // Compare other important props that might change
  if (prevProps.placeholder !== nextProps.placeholder) return false;
  if (prevProps.secureTextEntry !== nextProps.secureTextEntry) return false;

  // INTENTIONALLY IGNORE: leftIcon, rightIcon, onRightIconPress
  // These are React elements that get recreated on every render
  // but don't affect input behavior - Input component handles them fine

  // Everything is the same, skip re-render
  return true;
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
});

export default FormField;