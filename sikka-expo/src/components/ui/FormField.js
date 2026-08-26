import React, { memo, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Input from './Input';
import ValidationError from './ValidationError';

/**
 * Enhanced form field component with integrated validation
 * Extends the base Input component with validation display
 */
const FormField = memo(forwardRef(({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  showError = true,
  containerStyle,
  validationStyle,
  ...inputProps
}, ref) => {
  
  const handleBlur = (e) => {
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Input
        ref={ref}
        label={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={handleBlur}
        error={error}
        {...inputProps}
      />
      
      {showError && error && (
        <ValidationError 
          error={error} 
          style={[styles.validationError, validationStyle]}
        />
      )}
    </View>
  );
}));

FormField.displayName = 'FormField';

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  validationError: {
    marginTop: -12,
    marginBottom: 8,
  },
});

export default FormField;