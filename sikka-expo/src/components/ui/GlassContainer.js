import React from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/ThemeProvider';

const GlassContainer = ({ 
  children, 
  intensity = 80, 
  style = {},
  blurType,
  ...props 
}) => {
  const { isDark } = useTheme();
  
  // Default blur type based on theme
  const defaultBlurType = blurType || (isDark ? 'dark' : 'light');
  
  return (
    <BlurView
      intensity={intensity}
      tint={defaultBlurType}
      style={[
        {
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
          overflow: 'hidden',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </BlurView>
  );
};

export default GlassContainer;