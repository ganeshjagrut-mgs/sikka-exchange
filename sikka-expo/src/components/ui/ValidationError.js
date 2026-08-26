import React, { memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Validation error component with smooth animation
 * Displays form validation errors with consistent styling
 */
const ValidationError = memo(({ 
  error, 
  style,
  showIcon = true,
  animationType = 'slideIn', // 'slideIn', 'fadeIn', 'none'
  ...props 
}) => {
  const { colors, typography } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(-10)).current;

  React.useEffect(() => {
    if (error) {
      if (animationType === 'slideIn') {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (animationType === 'fadeIn') {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(-10);
    }
  }, [error, animationType, fadeAnim, slideAnim]);

  if (!error) {
    return null;
  }

  const animatedStyle = {
    opacity: animationType === 'none' ? 1 : fadeAnim,
    transform: animationType === 'slideIn' 
      ? [{ translateY: slideAnim }] 
      : [],
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        animatedStyle,
        style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {showIcon && (
          <View style={styles.iconContainer}>
            <AlertCircle 
              size={14} 
              color={colors.error} 
              strokeWidth={2}
            />
          </View>
        )}
        
        <Text 
          style={[
            styles.errorText,
            {
              color: colors.error,
              fontFamily: typography.fontFamily?.primary,
            }
          ]}
        >
          {error}
        </Text>
      </View>
    </Animated.View>
  );
});

ValidationError.displayName = 'ValidationError';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  iconContainer: {
    marginRight: 6,
    marginTop: 1, // Align with text baseline
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    fontWeight: '400',
  },
});

export default ValidationError;