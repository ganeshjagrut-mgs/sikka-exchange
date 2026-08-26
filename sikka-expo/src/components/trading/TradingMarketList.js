import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Activity } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useStore } from '../../store/useStore';
import GlassContainer from '../ui/GlassContainer';
import CryptoIcon from '../ui/CryptoIcon';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';
import useMarketStore from '../../store/marketStore';
import { CRYPTO_METADATA, getCryptoMetadata } from '../../constants/cryptoMetadata';

const TradingMarketList = ({
  searchTerm = '',
  limitToTop = null,
  onRefresh,
  refreshing = false,
  style = {}
}) => {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const { isMobile, isTablet, isDesktop } = useBreakpoints();
  const { selectedCrypto, setSelectedCrypto } = useStore();

  // Use real WebSocket data instead of mock data
  const { tickers, getAllTickers, loading, fetchTickers } = useMarketStore();

  // Transform WebSocket tickers to match UI format
  const marketData = useMemo(() => {
    const tickersArray = getAllTickers();
    return tickersArray
      .filter(ticker => {
        // Exclude USDT from trading list (it's the base currency)
        // USDC is allowed as it's a tradable stablecoin
        const symbol = ticker.symbol?.split('-')[0] || ticker.symbol;
        return symbol !== 'USDT';
      })
      .map(ticker => {
        const symbol = ticker.symbol?.split('-')[0] || ticker.symbol || 'UNKNOWN'; // Extract BTC from BTC-USDT, with null-check
        const metadata = CRYPTO_METADATA[ticker.symbol] || {};

        return {
          id: ticker.symbol,
          name: metadata.name || symbol,
          symbol: symbol,
          fullSymbol: ticker.symbol, // Keep full symbol for reference
          price: ticker.price || 0,
          change24h: ticker.change24h || 0,
          icon: metadata.icon || symbol.charAt(0),
          color: metadata.color || '#54c255',
          marketCap: '', // Not available in WebSocket data
          volume: ticker.volume24h || '',
          isFavorite: false,
        };
      });
  }, [tickers]);

  // Memoized filtering logic - only show top 3 by default, or search results
  const processedCryptos = useMemo(() => {
    // Filter by search term
    const filtered = marketData.filter(crypto => {
      if (!crypto) return false;

      if (!searchTerm) return true; // Show all when not searching

      const matchesSearch =
        (crypto.name && crypto.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (crypto.symbol && crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });

    // Limit to top N when limitToTop is set and not searching
    if (limitToTop && !searchTerm) {
      return filtered.slice(0, limitToTop);
    }

    return filtered;
  }, [marketData, searchTerm, limitToTop]);

  // Responsive dimensions
  const getItemHeight = useCallback(() => {
    return isMobile ? 80 : isTablet ? 88 : 96;
  }, [isMobile, isTablet]);

  const getFontSize = useCallback((type) => {
    const sizes = {
      symbol: isMobile ? 14 : isTablet ? 15 : 16,
      name: isMobile ? 11 : isTablet ? 12 : 13,
      price: isMobile ? 13 : isTablet ? 14 : 15,
      change: isMobile ? 11 : isTablet ? 12 : 13,
      icon: isMobile ? 16 : isTablet ? 18 : 20,
      count: isMobile ? 14 : isTablet ? 15 : 16,
    };
    return sizes[type] || 14;
  }, [isMobile, isTablet]);

  // Crypto item selection handler - Navigate to trading page
  const handleSelectCrypto = useCallback((crypto) => {
    setSelectedCrypto(crypto);
    router.push(`/trading/${crypto.symbol}`);
  }, [setSelectedCrypto, router]);

  // Individual crypto card component
  const CryptoCard = useCallback(({ item: crypto, index }) => {
    const isSelected = selectedCrypto?.id === crypto?.id;

    return (
      <TouchableOpacity
        style={[
          styles.cryptoCard,
          {
            backgroundColor: isSelected 
              ? colors.primary + '20' 
              : colors.surface + '30',
            borderColor: isSelected 
              ? colors.primary + '40' 
              : 'transparent',
            borderWidth: isSelected ? 1 : 0,
            height: getItemHeight(),
            marginBottom: isMobile ? 8 : 6,
          }
        ]}
        onPress={() => handleSelectCrypto(crypto)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Crypto Icon and Info */}
          <View style={styles.cryptoInfo}>
            <CryptoIcon
              symbol={crypto?.symbol}
              size={isMobile ? 40 : isTablet ? 44 : 48}
              fallbackIcon={crypto?.icon}
              fallbackColor={crypto?.color || '#54c255'}
              style={styles.cryptoIcon}
            />
            
            <View style={styles.cryptoDetails}>
              <Text 
                style={[
                  styles.cryptoSymbol,
                  {
                    fontSize: getFontSize('symbol'),
                    color: colors.text,
                    fontFamily: typography.fontFamily.primary
                  }
                ]}
              >
                {crypto?.symbol || 'N/A'}
              </Text>
              <Text 
                style={[
                  styles.cryptoName,
                  {
                    fontSize: getFontSize('name'),
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.primary
                  }
                ]}
                numberOfLines={1}
              >
                {crypto?.name || 'Unknown'}
              </Text>
            </View>
          </View>
          
          {/* Price */}
          <View style={styles.priceInfo}>
            <Text
              style={[
                styles.cryptoPrice,
                {
                  fontSize: getFontSize('price'),
                  color: colors.text,
                  fontFamily: typography.fontFamily.primary
                }
              ]}
            >
              {formatIndianCurrency(crypto?.price || 0)}
            </Text>
            {/* 24h change removed - WebSocket doesn't provide reliable change24h data */}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [
    selectedCrypto,
    colors,
    typography,
    getFontSize,
    getItemHeight,
    handleSelectCrypto,
    isMobile,
    isTablet
  ]);

  // List header component
  const ListHeader = useCallback(() => (
    <View style={[styles.headerContainer, { backgroundColor: colors.surface + '95' }]}>
      <Text 
        style={[
          styles.headerText,
          {
            fontSize: getFontSize('count'),
            color: colors.text,
            fontFamily: typography.fontFamily.primary
          }
        ]}
      >
        Market ({processedCryptos.length})
      </Text>
    </View>
  ), [processedCryptos.length, colors, typography, getFontSize]);

  // Empty state component
  const EmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Activity 
        size={isMobile ? 48 : 56} 
        color={colors.textSecondary + '50'} 
        style={styles.emptyIcon} 
      />
      <Text 
        style={[
          styles.emptyTitle,
          {
            fontSize: getFontSize('symbol'),
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.primary
          }
        ]}
      >
        No cryptocurrencies found
      </Text>
      <Text 
        style={[
          styles.emptySubtitle,
          {
            fontSize: getFontSize('name'),
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.primary
          }
        ]}
      >
        Try adjusting your search or filters
      </Text>
    </View>
  ), [colors, typography, getFontSize, isMobile]);

  // Loading state component
  const LoadingState = useCallback(() => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text 
        style={[
          styles.loadingText,
          {
            fontSize: getFontSize('name'),
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.primary
          }
        ]}
      >
        Loading market data...
      </Text>
    </View>
  ), [colors, typography, getFontSize]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item, index) => {
    return item?.id?.toString() || index.toString();
  }, []);

  // Get item layout for performance optimization
  const getItemLayout = useCallback((data, index) => ({
    length: getItemHeight() + (isMobile ? 8 : 6), // item height + margin
    offset: (getItemHeight() + (isMobile ? 8 : 6)) * index,
    index,
  }), [getItemHeight, isMobile]);

  // Handle refresh with market store - MUST be before any early returns
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await fetchTickers();
    }
  }, [onRefresh, fetchTickers]);

  // Early return AFTER all hooks are called
  if (loading && processedCryptos.length === 0) {
    return (
      <GlassContainer style={[styles.container, style]}>
        <LoadingState />
      </GlassContainer>
    );
  }

  return (
    <GlassContainer style={[styles.container, style]}>
      <FlatList
        data={processedCryptos}
        renderItem={CryptoCard}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true} // Enable scroll within fixed height container
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        removeClippedSubviews={Platform.OS !== 'web'}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={20}
        contentContainerStyle={[
          styles.listContainer,
          processedCryptos.length === 0 && styles.emptyListContainer
        ]}
        style={styles.flatList}
      />
    </GlassContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    flex: 1, // Take full available height
  },
  flatList: {
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: -4,
  },
  headerText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  cryptoCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  cryptoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cryptoIcon: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontWeight: 'bold',
  },
  cryptoDetails: {
    flex: 1,
  },
  cryptoSymbol: {
    fontWeight: '600',
    marginBottom: 2,
  },
  cryptoName: {
    opacity: 0.8,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  cryptoPrice: {
    fontWeight: '600',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cryptoChange: {
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
});

export default TradingMarketList;