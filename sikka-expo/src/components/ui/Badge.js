import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

const Badge = ({ 
  children, 
  variant = 'primary', 
  size = 'small',
  className = '',
  style = {},
  ...props 
}) => {
  const { colors } = useTheme();
  
  const variants = {
    primary: {
      backgroundColor: `${colors.primary}20`,
      borderColor: `${colors.primary}30`,
      color: colors.primary,
    },
    success: {
      backgroundColor: `${colors.success}20`,
      borderColor: `${colors.success}30`,
      color: colors.success,
    },
    warning: {
      backgroundColor: `${colors.warning}20`,
      borderColor: `${colors.warning}30`,
      color: colors.warning,
    },
    error: {
      backgroundColor: `${colors.error}20`,
      borderColor: `${colors.error}30`,
      color: colors.error,
    },
    live: {
      backgroundColor: `${colors.primary}20`,
      borderColor: `${colors.primary}30`,
      color: colors.primary,
    },
  };
  
  const sizes = {
    small: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 12,
      borderRadius: 999,
    },
    medium: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14,
      borderRadius: 999,
    },
  };
  
  const variantStyles = variants[variant] || variants.primary;
  const sizeStyles = sizes[size] || sizes.small;
  
  return (
    <View
      className={className}
      style={[
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: 1,
          ...sizeStyles,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      {...props}
    >
      <Text 
        style={{ 
          color: variantStyles.color,
          fontSize: sizeStyles.fontSize,
          fontWeight: '600',
        }}
      >
        {children}
      </Text>
    </View>
  );
};

export default Badge;