import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import useMarketStore from '../../store/marketStore';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';
import GlassContainer from '../ui/GlassContainer';
import CryptoCard from '../CryptoCard';
import { CRYPTO_METADATA, getCryptoMetadata } from '../../constants/cryptoMetadata';

const MarketOverview = memo(() => {
  const { theme } = useTheme();
  const { getAllTickers } = useMarketStore();

  // Transform WebSocket tickers to match CryptoCard format
  const marketData = useMemo(() => {
    const tickers = getAllTickers();
    return tickers.map(ticker => {
      const symbol = ticker.symbol.split('-')[0];
      const metadata = getCryptoMetadata(ticker.symbol);

      return {
        id: ticker.symbol,
        name: metadata.name || symbol,
        symbol: symbol,
        fullSymbol: ticker.symbol,
        price: ticker.price || 0,
        priceUsd: formatIndianCurrency(ticker.price || 0),
        change24h: ticker.change24h || 0,
        icon: metadata.icon || symbol.charAt(0),
        color: metadata.color || '#54c255',
        image: metadata.image || null,
        marketCap: '',
        volume: ticker.volume24h || '',
      };
    });
  }, [getAllTickers]);

  const handleViewAll = () => {
    console.log('Navigate to full market overview');
  };

  const handleCryptoPress = (crypto) => {
    console.log('Navigate to crypto trading:', crypto.name);
  };

  const styles = StyleSheet.create({
    container: {
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
    scrollContainer: {
      flexDirection: 'row',
    },
    cryptoCardContainer: {
      width: 280,
      marginRight: theme.spacing[4],
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing[8],
    },
    emptyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.primary,
      textAlign: 'center',
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing[4],
      justifyContent: 'space-between',
    },
    gridItem: {
      minWidth: 280,
      maxWidth: 320,
      flex: 1,
    },
  });

  if (!marketData || marketData.length === 0) {
    return (
      <View style={styles.container}>
        <GlassContainer style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Market Overview</Text>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Loading market data...
            </Text>
          </View>
        </GlassContainer>
      </View>
    );
  }

  // Take first 5 cryptos for display
  const displayCryptos = marketData.slice(0, 5);

  // For mobile, use horizontal scroll; for web/tablet, use grid layout
  const renderCryptos = () => {
    // Check if we have enough space for grid layout (rough estimation)
    const useScrollLayout = true; // For now, always use scroll layout

    if (useScrollLayout) {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          decelerationRate="fast"
          snapToAlignment="start"
          snapToInterval={280 + theme.spacing[4]}
        >
          {displayCryptos.map((crypto, index) => (
            <View key={crypto.id} style={styles.cryptoCardContainer}>
              <CryptoCard
                crypto={crypto}
                onPress={handleCryptoPress}
                compact={false}
              />
            </View>
          ))}
        </ScrollView>
      );
    } else {
      // Grid layout for larger screens
      return (
        <View style={styles.gridContainer}>
          {displayCryptos.map((crypto, index) => (
            <View key={crypto.id} style={styles.gridItem}>
              <CryptoCard
                crypto={crypto}
                onPress={handleCryptoPress}
                compact={false}
              />
            </View>
          ))}
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <GlassContainer style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Market Overview</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAll}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All Markets</Text>
          </TouchableOpacity>
        </View>
        
        {renderCryptos()}
      </GlassContainer>
    </View>
  );
});

MarketOverview.displayName = 'MarketOverview';

export default MarketOverview;