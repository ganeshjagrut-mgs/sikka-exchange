import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

// Breakpoint definitions matching the project requirements
const BREAKPOINTS = {
  mobile: 0,     // 0px - 767px (mobile phones)
  tablet: 768,   // 768px - 1023px (tablets)  
  desktop: 1024, // 1024px+ (desktop)
};

/**
 * Custom hook for responsive design breakpoints
 * Handles cross-platform detection for web, iOS, and Android
 * 
 * Returns:
 * - isMobile: boolean - true if screen width is below tablet breakpoint
 * - isTablet: boolean - true if screen width is between tablet and desktop
 * - isDesktop: boolean - true if screen width is desktop or larger
 * - screenWidth: number - current screen width
 * - screenHeight: number - current screen height
 * - breakpoint: string - current breakpoint name ('mobile', 'tablet', 'desktop')
 */
export const useBreakpoints = () => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    // Platform-specific dimension change handling
    const subscription = Platform.select({
      web: () => {
        // Web-specific window resize listener
        const handleResize = () => {
          setScreenData({
            width: window.innerWidth,
            height: window.innerHeight,
          });
        };

        window.addEventListener('resize', handleResize);
        
        // Set initial dimensions for web
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
      },
      default: () => {
        // Native (iOS/Android) dimension change listener
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
          setScreenData(window);
        });

        return () => {
          if (subscription?.remove) {
            subscription.remove();
          }
        };
      },
    })();

    return subscription;
  }, []);

  // Calculate breakpoint values based on current screen width
  const { width: screenWidth, height: screenHeight } = screenData;
  
  const isMobile = screenWidth < BREAKPOINTS.tablet;
  const isTablet = screenWidth >= BREAKPOINTS.tablet && screenWidth < BREAKPOINTS.desktop;
  const isDesktop = screenWidth >= BREAKPOINTS.desktop;
  
  // Determine current breakpoint name
  let breakpoint = 'mobile';
  if (isDesktop) {
    breakpoint = 'desktop';
  } else if (isTablet) {
    breakpoint = 'tablet';
  }

  // Platform-specific optimizations
  const platformOptimized = Platform.select({
    web: {
      // Web-specific responsive features
      supportsHover: true,
      supportsResize: true,
    },
    ios: {
      // iOS-specific responsive features  
      supportsOrientationChange: true,
      usesSafeArea: true,
    },
    android: {
      // Android-specific responsive features
      supportsOrientationChange: true,
      usesStatusBar: true,
    },
  });

  return {
    // Breakpoint booleans
    isMobile,
    isTablet, 
    isDesktop,
    
    // Screen dimensions
    screenWidth,
    screenHeight,
    
    // Current breakpoint name
    breakpoint,
    
    // Breakpoint constants for reference
    breakpoints: BREAKPOINTS,
    
    // Platform-specific features
    ...platformOptimized,
  };
};

// Export individual breakpoint helpers for convenience
export const useIsMobile = () => {
  const { isMobile } = useBreakpoints();
  return isMobile;
};

export const useIsTablet = () => {
  const { isTablet } = useBreakpoints();
  return isTablet;
};

export const useIsDesktop = () => {
  const { isDesktop } = useBreakpoints();
  return isDesktop;
};

// Export breakpoints for use in StyleSheet or other contexts
export { BREAKPOINTS };

export default useBreakpoints;