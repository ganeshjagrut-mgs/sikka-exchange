import React from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useStore } from '../../store/useStore';
import GlassContainer from '../ui/GlassContainer';

const TradingHeader = ({ marketStats }) => {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet, isDesktop } = useBreakpoints();
  const { marketData = [] } = useStore();

  // Default market stats with fallback
  const defaultStats = {
    totalMarketCap: '$2.34T',
    totalVolume: '$87.5B',
    btcDominance: '42.7%',
    activeCoins: marketData?.length || 2847
  };

  const stats = marketStats || defaultStats;

  // Animated pulse for live indicator
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseAnim]);

  // Responsive font sizes
  const getFontSize = (type) => {
    const sizes = {
      title: isMobile ? 24 : isTablet ? 28 : 32,
      subtitle: isMobile ? 14 : isTablet ? 16 : 18,
      statValue: isMobile ? 16 : isTablet ? 18 : 20,
      statLabel: isMobile ? 11 : isTablet ? 12 : 13,
      liveText: isMobile ? 13 : isTablet ? 14 : 15,
    };
    return sizes[type] || 16;
  };

  // Responsive spacing
  const getSpacing = () => ({
    padding: isMobile ? 16 : isTablet ? 20 : 24,
    marginBottom: isMobile ? 12 : isTablet ? 16 : 20,
    headerGap: isMobile ? 12 : 16,
    statsGap: isMobile ? 12 : 16,
  });

  const spacing = getSpacing();

  return (
    <GlassContainer 
      style={[
        styles.container, 
        { 
          padding: spacing.padding,
          marginBottom: spacing.marginBottom,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }
      ]}
    >
      {/* Header Section */}
      <View style={[
        styles.headerContent, 
        isMobile && styles.headerContentMobile,
        { marginBottom: spacing.headerGap }
      ]}>
        <View style={styles.titleSection}>
          <Text 
            style={[
              styles.title, 
              { 
                color: colors.text, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('title')
              }
            ]}
          >
            Live Cryptocurrency Trading
          </Text>
          <Text 
            style={[
              styles.subtitle, 
              { 
                color: colors.textSecondary, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('subtitle')
              }
            ]}
          >
            Trade with real-time market data and advanced analytics
          </Text>
        </View>
        
        <View style={[styles.liveIndicator, isMobile && styles.liveIndicatorMobile]}>
          <Animated.View 
            style={[
              styles.liveDot, 
              { 
                backgroundColor: colors.primary,
                transform: [{ scale: pulseAnim }]
              }
            ]} 
          />
          <Text 
            style={[
              styles.liveText, 
              { 
                color: colors.primary, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('liveText')
              }
            ]}
          >
            Live Market
          </Text>
        </View>
      </View>

      {/* Market Statistics Grid */}
      <View style={[
        styles.statsGrid, 
        isMobile ? styles.statsGridMobile : styles.statsGridDesktop,
        { gap: spacing.statsGap }
      ]}>
        <View style={styles.statItem}>
          <Text 
            style={[
              styles.statLabel, 
              { 
                color: colors.textSecondary, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('statLabel')
              }
            ]}
          >
            Market Cap
          </Text>
          <Text 
            style={[
              styles.statValue, 
              { 
                color: colors.text, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('statValue')
              }
            ]}
          >
            {stats.totalMarketCap}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text 
            style={[
              styles.statLabel, 
              { 
                color: colors.textSecondary, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('statLabel')
              }
            ]}
          >
            24h Volume
          </Text>
          <Text 
            style={[
              styles.statValue, 
              { 
                color: colors.text, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('statValue')
              }
            ]}
          >
            {stats.totalVolume}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text 
            style={[
              styles.statLabel, 
              { 
                color: colors.textSecondary, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('statLabel')
              }
            ]}
          >
            BTC Dominance
          </Text>
          <Text 
            style={[
              styles.statValue, 
              { 
                color: colors.text, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('statValue')
              }
            ]}
          >
            {stats.btcDominance}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text 
            style={[
              styles.statLabel, 
              { 
                color: colors.textSecondary, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('statLabel')
              }
            ]}
          >
            Active Coins
          </Text>
          <Text 
            style={[
              styles.statValue, 
              { 
                color: colors.text, 
                fontFamily: typography.fontFamily?.primary,
                fontSize: getFontSize('statValue')
              }
            ]}
          >
            {stats.activeCoins.toLocaleString()}
          </Text>
        </View>
      </View>
    </GlassContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    // Glass morphism effect handled by GlassContainer
  },
  
  // Header styles
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContentMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: Platform.OS === 'ios' ? undefined : 36,
  },
  subtitle: {
    opacity: 0.85,
    lineHeight: Platform.OS === 'ios' ? undefined : 22,
  },
  
  // Live indicator styles
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
  },
  liveIndicatorMobile: {
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  liveText: {
    fontWeight: '600',
  },
  
  // Stats grid styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statsGridMobile: {
    // 2x2 grid on mobile
    justifyContent: 'space-between',
  },
  statsGridDesktop: {
    // 1x4 grid on desktop
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: Platform.OS === 'web' ? '22%' : 120, // Web responsive vs native
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statLabel: {
    fontWeight: '500',
    opacity: 0.85,
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default TradingHeader;