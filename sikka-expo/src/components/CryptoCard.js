import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from '../components/ui/Icons';
import { useTheme } from '../hooks/useTheme';
import GlassContainer from './ui/GlassContainer';
import CryptoIcon from './ui/CryptoIcon';
import { formatIndianCurrency } from '../utils/formatIndianCurrency';
import { getCryptoMetadata } from '../constants/cryptoMetadata';

// Animated value for press effects
const useScaleAnimation = () => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.98,
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

const CryptoCard = memo(({ crypto, compact = false, index = 0, onPress }) => {
  const { theme } = useTheme();
  const { scaleValue, animatePress } = useScaleAnimation();

  const handlePress = () => {
    animatePress();
    onPress?.(crypto);
  };

  // Safely access crypto properties with fallbacks
  const price = crypto?.price || 0;
  const change = crypto?.change24h || crypto?.change || 0;
  const volume = crypto?.volume || 'N/A';
  const marketCap = crypto?.marketCap || 'N/A';
  const name = crypto?.name || 'Unknown';
  const symbol = crypto?.symbol || 'N/A';
  const image = crypto?.image || null;

  const formatPrice = (price) => {
    return formatIndianCurrency(price);
  };

  const formatChange = (change) => {
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  const changeColor = change >= 0 ? theme.colors.success : theme.colors.error;

  const compactStyles = StyleSheet.create({
    cardContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      marginRight: theme.spacing[3],
    },
    cryptoIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
    },
    fallbackIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackText: {
      color: '#FFFFFF',
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    cryptoInfo: {
      marginLeft: theme.spacing[3],
    },
    symbol: {
      color: theme.colors.text,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    name: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.normal,
    },
    rightSection: {
      alignItems: 'flex-end',
    },
    price: {
      color: theme.colors.text,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    changeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing[1],
    },
    changeText: {
      color: changeColor,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      marginLeft: theme.spacing[1],
    }
  });

  if (compact) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={{
            opacity: 1,
            transform: [{ translateY: 0 }],
          }}
        >
          <GlassContainer
            style={{
              padding: theme.spacing[4],
              marginVertical: theme.spacing[1],
            }}
          >
            <View style={compactStyles.cardContainer}>
              <View style={compactStyles.leftSection}>
                <View style={compactStyles.iconContainer}>
                  <CryptoIcon
                    symbol={symbol}
                    size={40}
                    fallbackIcon={crypto?.icon}
                    fallbackColor={theme.colors.primary}
                  />
                </View>
                <View style={compactStyles.cryptoInfo}>
                  <Text style={compactStyles.symbol}>
                    {symbol}
                  </Text>
                  <Text style={compactStyles.name}>
                    {name}
                  </Text>
                </View>
              </View>
              
              <View style={compactStyles.rightSection}>
                <Text style={compactStyles.price}>
                  {formatPrice(price)}
                </Text>
                <View style={compactStyles.changeContainer}>
                  {change >= 0 ? (
                    <TrendingUp width={16} height={16} color={changeColor} />
                  ) : (
                    <TrendingDown width={16} height={16} color={changeColor} />
                  )}
                  <Text style={compactStyles.changeText}>
                    {formatChange(change)}
                  </Text>
                </View>
              </View>
            </View>
          </GlassContainer>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const fullStyles = StyleSheet.create({
    cardContainer: {
      padding: theme.spacing[6],
      marginVertical: theme.spacing[2],
    },
    headerSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[4],
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    largeIconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      marginRight: theme.spacing[3],
    },
    largeCryptoIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
    },
    largeFallbackIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    largeFallbackText: {
      color: '#FFFFFF',
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    headerCryptoInfo: {
      marginLeft: theme.spacing[3],
    },
    largeSymbol: {
      color: theme.colors.text,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    largeName: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.normal,
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    largePrice: {
      color: theme.colors.text,
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
    },
    largeChangeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing[1],
    },
    largeChangeText: {
      color: changeColor,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      marginLeft: theme.spacing[1],
    },
    statsSection: {
      paddingTop: theme.spacing[4],
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statItem: {
      flex: 1,
    },
    statItemRight: {
      flex: 1,
      alignItems: 'flex-end',
    },
    statLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.normal,
      marginBottom: theme.spacing[1],
    },
    statValue: {
      color: theme.colors.text,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    }
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={{
          opacity: 1,
          transform: [{ translateY: 0 }],
        }}
      >
        <GlassContainer style={fullStyles.cardContainer}>
          {/* Header Section */}
          <View style={fullStyles.headerSection}>
            <View style={fullStyles.headerLeft}>
              <View style={fullStyles.largeIconContainer}>
                <CryptoIcon
                  symbol={symbol}
                  size={48}
                  fallbackIcon={crypto?.icon}
                  fallbackColor={theme.colors.primary}
                />
              </View>
              
              <View style={fullStyles.headerCryptoInfo}>
                <Text style={fullStyles.largeSymbol}>
                  {symbol}
                </Text>
                <Text style={fullStyles.largeName}>
                  {name}
                </Text>
              </View>
            </View>
            
            <View style={fullStyles.headerRight}>
              <Text style={fullStyles.largePrice}>
                {formatPrice(price)}
              </Text>
              <View style={fullStyles.largeChangeContainer}>
                {change >= 0 ? (
                  <TrendingUp width={20} height={20} color={changeColor} />
                ) : (
                  <TrendingDown width={20} height={20} color={changeColor} />
                )}
                <Text style={fullStyles.largeChangeText}>
                  {formatChange(change)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Stats Section */}
          <View style={fullStyles.statsSection}>
            <View style={fullStyles.statsContainer}>
              <View style={fullStyles.statItem}>
                <Text style={fullStyles.statLabel}>
                  Volume
                </Text>
                <Text style={fullStyles.statValue}>
                  {volume}
                </Text>
              </View>
              
              <View style={fullStyles.statItemRight}>
                <Text style={fullStyles.statLabel}>
                  Market Cap
                </Text>
                <Text style={fullStyles.statValue}>
                  {marketCap}
                </Text>
              </View>
            </View>
          </View>
        </GlassContainer>
      </TouchableOpacity>
    </Animated.View>
  );
});

CryptoCard.displayName = 'CryptoCard';

export default CryptoCard;