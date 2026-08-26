import React, { memo, useRef, useEffect } from 'react';
import { View, Animated, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

// Custom spinner with rotation animation
const CustomSpinner = ({ size = 40, color }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: `${color}30`, // 30% opacity
        borderTopColor: color,
        transform: [{ rotate: spin }],
      }}
    />
  );
};

// Skeleton loading animation
const SkeletonLoader = ({ width, height, borderRadius }) => {
  const { theme } = useTheme();
  const fadeValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const fadeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeValue, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeValue, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    fadeAnimation.start();

    return () => fadeAnimation.stop();
  }, [fadeValue]);

  return (
    <Animated.View
      style={{
        width,
        height,
        backgroundColor: theme.colors.surface,
        borderRadius: borderRadius || theme.borderRadius.md,
        opacity: fadeValue,
      }}
    />
  );
};

// Dots loading animation
const DotsLoader = ({ color, size = 8 }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createDotAnimation(dot1, 0);
    const animation2 = createDotAnimation(dot2, 200);
    const animation3 = createDotAnimation(dot3, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1, dot2, dot3]);

  const getDotStyle = (dot) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    marginHorizontal: size / 4,
    opacity: dot,
    transform: [
      {
        scale: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Animated.View style={getDotStyle(dot1)} />
      <Animated.View style={getDotStyle(dot2)} />
      <Animated.View style={getDotStyle(dot3)} />
    </View>
  );
};

const LoadingSpinner = memo(({
  size = 'medium', // 'small', 'medium', 'large'
  variant = 'spinner', // 'spinner', 'dots', 'skeleton', 'activity'
  color,
  text,
  fullScreen = false,
  overlay = false,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  // Size configurations
  const sizeConfig = {
    small: { spinner: 24, text: theme.typography.fontSize.sm },
    medium: { spinner: 40, text: theme.typography.fontSize.base },
    large: { spinner: 56, text: theme.typography.fontSize.lg },
  };

  const config = sizeConfig[size];
  const spinnerColor = color || theme.colors.primary;

  const renderSpinner = () => {
    switch (variant) {
      case 'activity':
        return (
          <ActivityIndicator
            size={size === 'large' ? 'large' : 'small'}
            color={spinnerColor}
          />
        );
      case 'dots':
        return (
          <DotsLoader 
            color={spinnerColor} 
            size={size === 'small' ? 6 : size === 'large' ? 10 : 8} 
          />
        );
      case 'skeleton':
        return (
          <SkeletonLoader
            width={config.spinner * 2}
            height={config.spinner}
            borderRadius={theme.borderRadius.sm}
          />
        );
      case 'spinner':
      default:
        return (
          <CustomSpinner
            size={config.spinner}
            color={spinnerColor}
          />
        );
    }
  };

  const getContainerStyle = () => {
    const baseStyle = {
      justifyContent: 'center',
      alignItems: 'center',
      ...style,
    };

    if (fullScreen) {
      return {
        ...baseStyle,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: overlay ? `${theme.colors.background}CC` : 'transparent',
        zIndex: 1000,
      };
    }

    if (overlay) {
      return {
        ...baseStyle,
        backgroundColor: `${theme.colors.background}CC`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[4],
      };
    }

    return baseStyle;
  };

  return (
    <View style={getContainerStyle()} {...props}>
      {renderSpinner()}
      
      {text && (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: config.text,
            fontFamily: theme.typography.fontFamily.primary,
            marginTop: theme.spacing[2],
            textAlign: 'center',
          }}
        >
          {text}
        </Text>
      )}
    </View>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// Export individual components for flexibility
export { SkeletonLoader, DotsLoader, CustomSpinner };
export default LoadingSpinner;