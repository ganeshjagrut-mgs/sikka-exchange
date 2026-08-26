import React, { memo } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

// Animated value for press effects
const useScaleAnimation = () => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scaleValue, animatePress };
};

const Button = memo(({
  children,
  variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost'
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
  icon,
  iconPosition = 'left', // 'left', 'right'
  ...props
}) => {
  const { theme } = useTheme();
  const { scaleValue, animatePress } = useScaleAnimation();


  const handlePress = () => {
    console.log('🔘 Button: handlePress called', { disabled, loading });
    if (disabled || loading) {
      console.log('🔘 Button: Press ignored due to disabled or loading state');
      return;
    }
    console.log('🔘 Button: Executing press animation and callback');
    animatePress();
    onPress?.();
  };

  // Get button styles based on variant
  const getButtonStyles = () => {
    const baseStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius?.button || theme.borderRadius?.md || 8,
      opacity: disabled ? 0.6 : 1,
    };

    // Size styles
    const sizeStyles = {
      small: {
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[4],
        minHeight: 36,
      },
      medium: {
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[6],
        minHeight: 44,
      },
      large: {
        paddingVertical: theme.spacing[4],
        paddingHorizontal: theme.spacing[8],
        minHeight: 52,
      },
    };

    // Variant styles - matching dashboard button design
    const variantStyles = {
      primary: {
        backgroundColor: '#54c255', // Match dashboard primary green
        borderWidth: 0,
        // Match dashboard button shadow
        shadowColor: '#54c255',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      },
      secondary: {
        backgroundColor: 'rgba(222, 226, 236, 0.1)', // Match dashboard secondary
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#54c255', // Match dashboard primary
        borderWidth: 1,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    };
  };

  // Get text styles based on variant and size
  const getTextStyles = () => {
    const baseTextStyle = {
      fontFamily: theme.typography.fontFamily.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    };

    // Size-based text styles
    const sizeTextStyles = {
      small: {
        fontSize: theme.typography.fontSize.sm,
      },
      medium: {
        fontSize: theme.typography.fontSize.base,
      },
      large: {
        fontSize: theme.typography.fontSize.lg,
      },
    };

    // Variant-based text styles
    const variantTextStyles = {
      primary: {
        color: '#FFFFFF',
      },
      secondary: {
        color: theme.colors.text,
      },
      outline: {
        color: theme.colors.primary,
      },
      ghost: {
        color: theme.colors.text,
      },
    };

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
      ...textStyle,
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator 
          size={size === 'small' ? 'small' : 'small'} 
          color={variant === 'primary' ? '#FFFFFF' : theme.colors.primary} 
        />
      );
    }

    const textComponent = (
      <Text style={getTextStyles()}>
        {children}
      </Text>
    );

    if (!icon) return textComponent;

    const iconComponent = React.cloneElement(icon, {
      width: size === 'small' ? 16 : size === 'large' ? 24 : 20,
      height: size === 'small' ? 16 : size === 'large' ? 24 : 20,
      color: getTextStyles().color,
    });

    if (iconPosition === 'right') {
      return (
        <>
          {textComponent}
          <Animated.View style={{ marginLeft: theme.spacing[2] }}>
            {iconComponent}
          </Animated.View>
        </>
      );
    }

    return (
      <>
        <Animated.View style={{ marginRight: theme.spacing[2] }}>
          {iconComponent}
        </Animated.View>
        {textComponent}
      </>
    );
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={getButtonStyles()}
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...props}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
});

Button.displayName = 'Button';

export default Button;