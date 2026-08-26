import React, { memo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, TrendingDown } from '../ui/Icons';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../store/useStore';
import useWalletStore from '../../store/walletStore';
import GlassContainer from '../ui/GlassContainer';
import CryptoIcon from '../ui/CryptoIcon';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';
import { getCryptoMetadata } from '../../constants/cryptoMetadata';

// Animated value for item hover effects
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

const PortfolioItem = memo(({ crypto, onPress }) => {
  const { theme } = useTheme();
  const { scaleValue, animatePress } = useScaleAnimation();

  const handlePress = () => {
    animatePress();
    onPress?.(crypto);
  };

  const formatValue = (value) => {
    return formatIndianCurrency(value);
  };

  const formatChange = (change) => {
    const prefix = (change || 0) >= 0 ? '+' : '';
    return `${prefix}${(change || 0).toFixed(2)}%`;
  };

  // Ensure proper color coding: green for profit (positive), red for loss (negative)
  const changeColor = (crypto.change24h || 0) >= 0 ? theme.colors.success : theme.colors.error;

  const styles = StyleSheet.create({
    itemContainer: {
      marginBottom: theme.spacing[3],
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: `${theme.colors.surface}30`,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[4],
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    iconText: {
      color: '#FFFFFF',
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      fontFamily: theme.typography.fontFamily.primary,
    },
    cryptoInfo: {
      flex: 1,
    },
    cryptoName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.primary,
      marginBottom: theme.spacing[1],
    },
    cryptoAmount: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.primary,
    },
    rightSection: {
      alignItems: 'flex-end',
    },
    value: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.primary,
      marginBottom: theme.spacing[1],
    },
    changeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    changeText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: changeColor,
      fontFamily: theme.typography.fontFamily.primary,
      marginLeft: theme.spacing[1],
    },
  });

  return (
    <Animated.View style={[styles.itemContainer, { transform: [{ scale: scaleValue }] }]}>
      <TouchableOpacity
        style={styles.item}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.leftSection}>
          <CryptoIcon
            symbol={crypto.symbol}
            size={48}
            fallbackIcon={crypto.icon}
            fallbackColor={crypto.color}
            style={styles.iconContainer}
          />
          
          <View style={styles.cryptoInfo}>
            <Text style={styles.cryptoName}>{crypto.name}</Text>
            <Text style={styles.cryptoAmount}>
              {crypto.amount} {crypto.symbol}
            </Text>
          </View>
        </View>
        
        <View style={styles.rightSection}>
          <Text style={styles.value}>
            {formatValue(crypto.value)}
          </Text>
          <View style={styles.changeContainer}>
            {crypto.change24h >= 0 ? (
              <TrendingUp width={16} height={16} color={changeColor} />
            ) : (
              <TrendingDown width={16} height={16} color={changeColor} />
            )}
            <Text style={styles.changeText}>
              {formatChange(crypto.change24h)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const PortfolioHoldings = memo(() => {
  const router = useRouter();
  const { theme } = useTheme();
  const { portfolio: mockPortfolio } = useStore();
  const { holdings, loading, error, fetchHoldings } = useWalletStore();

  // Fetch holdings on mount
  useEffect(() => {
    const loadHoldings = async () => {
      try {
        await fetchHoldings();
      } catch (error) {
        console.error('Failed to load holdings:', error);
      }
    };

    loadHoldings();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <GlassContainer style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Portfolio</Text>
          </View>
          <Text style={[styles.viewAllText, { color: theme.colors.textSecondary }]}>
            Loading portfolio data...
          </Text>
        </GlassContainer>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <GlassContainer style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Portfolio</Text>
          </View>
          <Text style={[styles.viewAllText, { color: theme.colors.error }]}>
            Error loading portfolio: {error}
          </Text>
        </GlassContainer>
      </View>
    );
  }


  // Transform backend holdings to UI format
  const transformHoldings = (rawHoldings) => {
    if (!rawHoldings || rawHoldings.length === 0) return [];

    return rawHoldings.map((holding, index) => {
      const meta = getCryptoMetadata(holding.symbol || holding.currency);
      return {
        id: holding.id || `${holding.symbol}-${index}`,
        symbol: holding.symbol || holding.currency,
        name: holding.name || meta.name,
        icon: meta.icon,
        color: meta.color,
        amount: parseFloat(holding.quantity || holding.amount || 0),
        value: parseFloat(holding.current_value || holding.value || 0),
        price: parseFloat(holding.current_price || holding.price || 0),
        change24h: parseFloat(holding.pnl_percentage || holding.change24h || holding.change || 0),
        pnl: parseFloat(holding.pnl || 0),
      };
    });
  };

  // Use real holdings if available, otherwise fallback to mock
  const portfolio = holdings && holdings.length > 0 ? transformHoldings(holdings) : mockPortfolio;

  const handleViewAll = () => {
    router.push('/(tabs)/wallet');
  };

  const handleCryptoPress = (crypto) => {
    // Navigate to crypto detail screen
    console.log('Navigate to crypto detail:', crypto.name);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 2,
      marginVertical: theme.spacing[2],
    },
    card: {
      padding: theme.spacing[6],
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[6],
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.primary,
    },
    viewAllButton: {
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[3],
    },
    viewAllText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.primary,
      fontFamily: theme.typography.fontFamily.primary,
    },
    content: {
      gap: theme.spacing[2],
    },
  });

  if (!portfolio || portfolio.length === 0) {
    return (
      <View style={styles.container}>
        <GlassContainer style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Portfolio</Text>
          </View>
          <Text style={[styles.viewAllText, { color: theme.colors.textSecondary }]}>
            No holdings found
          </Text>
        </GlassContainer>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlassContainer style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Portfolio</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAll}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          {portfolio.map((crypto) => (
            <PortfolioItem
              key={crypto.id}
              crypto={crypto}
              onPress={handleCryptoPress}
            />
          ))}
        </View>
      </GlassContainer>
    </View>
  );
});

PortfolioItem.displayName = 'PortfolioItem';
PortfolioHoldings.displayName = 'PortfolioHoldings';

export default PortfolioHoldings;