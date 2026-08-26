import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { TrendingUp, TrendingDown, Search, Filter, ArrowUpDown } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import CryptoIcon from '../ui/CryptoIcon';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';
import useWalletStore from '../../store/walletStore';
import useTradingStore from '../../store/tradingStore';
import { parseNumeric } from '../../utils/walletData';
import { getCryptoMetadata } from '../../constants/cryptoMetadata';

/**
 * Enhanced WalletAssets Component
 *
 * Key Improvements:
 * 1. All values displayed in USD (no conversion needed)
 * 2. Better P&L calculation from holdings API
 * 3. Improved data synchronization
 * 4. Enhanced error handling and loading states
 * 5. Fixed asset allocation calculation
 *
 * Features:
 * - Asset list with holdings and values
 * - Performance tracking (P&L)
 * - Sort and filter functionality
 * - Balance visibility toggle
 * - Responsive design for all screen sizes
 */
const WalletAssets = () => {
  const { colors, typography } = useTheme();
  const { user, setSelectedCrypto } = useStore();
  const { isMobile, isTablet } = useBreakpoints();
  const {
    holdings,
    holdingsLoading,
    hasFetchedHoldings,
    error,
    fetchHoldings,
    refreshWallet,
  } = useWalletStore();
  const { pnl, fetchPNL } = useTradingStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Use refreshWallet for better data synchronization
        await refreshWallet();
        // Also fetch P&L data
        await fetchPNL();
      } catch (err) {
        console.error('Failed to load wallet data:', err);
      }
    };

    loadData();
  }, [refreshWallet, fetchPNL]);

  // Format currency with proper localization
  const formatCurrency = (amount) => {
    return formatIndianCurrency(amount); // For holdings value (USD)
  };

  const formatDecimalAmount = (amount) => {
    const numeric = parseNumeric(amount, 0);
    return numeric.toFixed(6).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  };

  const formatPercentage = (percentage) => {
    const numeric = parseNumeric(percentage, 0);
    const sign = numeric >= 0 ? '+' : '';
    return `${sign}${numeric.toFixed(2)}%`;
  };

  // Transform backend holdings to UI format
  const transformHoldings = (rawHoldings) => {
    if (!rawHoldings || rawHoldings.length === 0) return [];

    return rawHoldings.map((holding, index) => {
      const meta = getCryptoMetadata(holding.symbol || holding.currency);
      const quantity = parseNumeric(holding.quantity || holding.amount, 0);
      const currentValueUSD = parseNumeric(holding.currentValueUSD || holding.current_value, 0);
      const pnlUSD = parseNumeric(holding.pnlUSD || holding.pnl, 0);
      const pnlPercentage = parseNumeric(holding.pnlPercentage || holding.pnl_percentage, 0);
      const currentPriceUSD = parseNumeric(holding.currentPrice || holding.current_price, 0);
      const avgBuyPrice = parseNumeric(holding.avgBuyPrice || holding.avg_buy_price, 0);

      let priceInUSD = 0;
      if (quantity > 0 && currentValueUSD) {
        priceInUSD = currentValueUSD / quantity;
      }

      if (!priceInUSD && currentPriceUSD) {
        priceInUSD = currentPriceUSD;
      }

      return {
        id: holding.id || `${holding.symbol || holding.currency}-${index}`,
        symbol: holding.symbol || holding.currency,
        name: holding.name || meta.name,
        icon: meta.icon,
        color: meta.color,
        amount: quantity,
        value: currentValueUSD,
        price: priceInUSD,
        change24h: pnlPercentage, // This is actually P&L percentage, not 24h change
        pnl: pnlUSD,
        avgBuyPrice: avgBuyPrice,
      };
    });
  };

  // Build portfolio from TRADE account balances (includes P2P received assets)
  // This is the primary source - shows all assets in KuCoin account
  const balance = useWalletStore.getState().balance;
  const tradeBalances = balance?.trade?.balances || [];

  const portfolio = tradeBalances
    .filter(bal => parseNumeric(bal.balance, 0) > 0)
    .map((bal, index) => {
      const symbol = bal.currency;
      const meta = getCryptoMetadata(symbol);
      const amount = parseNumeric(bal.balance, 0);

      // Try to find P&L data from holdings (only exists if traded)
      const holding = holdings?.find(h => (h.symbol || h.currency) === symbol);

      // Use priceUSD and valueUSD from backend if available, otherwise calculate
      const priceUSD = parseNumeric(bal.priceUSD, 0) || parseNumeric(holding?.currentPrice, 0);
      const valueUSD = parseNumeric(bal.valueUSD, 0) || (amount * priceUSD);

      return {
        id: `${symbol}-${index}`,
        symbol,
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        amount,
        value: valueUSD,
        price: priceUSD,
        // P&L from holdings if available, otherwise $0/0% for transferred assets
        change24h: parseNumeric(holding?.pnlPercentage, 0),
        pnl: parseNumeric(holding?.pnlUSD, 0),
        avgBuyPrice: parseNumeric(holding?.avgBuyPrice, 0),
      };
    });

  // Filter assets based on search query (no sorting for now)
  // Exclude USDT as it's the base currency
  const filteredAssets = portfolio.filter(asset =>
    asset.symbol !== 'USDT' && (
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Calculate totals
  // Portfolio Value: Total value EXCLUDING locked USDT (from backend)
  // Backend returns portfolioValueUSD which excludes funds locked for withdrawals
  // Note: balance is already declared above when building portfolio

  // Use portfolioValueUSD or available.usd (both exclude locked funds)
  // This shows only tradeable assets, not funds locked for pending withdrawals
  const totalPortfolioValue = balance?.portfolioValueUSD ||
                              balance?.available?.usd ||
                              balance?.trade?.totalValueUSD ||
                              portfolio.reduce((sum, asset) => sum + (asset.value || 0), 0);

  // Responsive styling based on screen size
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        cardPadding: 16,
        titleSize: 16,
        valueSize: 18,
        iconSize: 18,
        spacing: 12,
        itemPadding: 12,
      };
    } else if (isTablet) {
      return {
        cardPadding: 18,
        titleSize: 17,
        valueSize: 20,
        iconSize: 20,
        spacing: 16,
        itemPadding: 16,
      };
    } else {
      return {
        cardPadding: 20,
        titleSize: 18,
        valueSize: 22,
        iconSize: 22,
        spacing: 20,
        itemPadding: 20,
      };
    }
  };

  const responsive = getResponsiveStyles();


  const AssetItem = ({ asset }) => {
   const safeTotal = totalPortfolioValue > 0 ? totalPortfolioValue : 1;
   const percentage = (asset.value / safeTotal) * 100;
   const pnlValue = parseNumeric(asset.pnl, 0);
   const pnlPercentage = parseNumeric(asset.change24h, 0); // This is P&L percentage
   const isPositive = pnlValue >= 0;

     return (
       <TouchableOpacity
         onPress={() => {
           setSelectedCrypto({ symbol: asset.symbol, name: asset.name });
           router.push(`/trading/${asset.symbol}`);
         }}
         activeOpacity={0.8}
       >
         <GlassContainer style={[styles.assetItem, { padding: responsive.itemPadding }]}>
           <View style={styles.assetHeader}>
           <View style={styles.assetLeft}>
             <CryptoIcon
               symbol={asset.symbol}
               size={responsive.titleSize + 20}
               fallbackIcon={asset.icon}
               fallbackColor={asset.color}
               style={{ marginRight: 12 }}
             />
             <View style={styles.assetInfo}>
               <Text style={[
                 styles.assetName,
                 {
                   color: colors.text,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize,
                 }
               ]}>
                 {asset.name}
               </Text>
               <Text style={[
                 styles.assetSymbol,
                 {
                   color: colors.textSecondary,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 2,
                 }
               ]}>
                 {asset.symbol}
               </Text>
             </View>
           </View>

           <View style={styles.assetRight}>
             <Text style={[
               styles.assetValue,
               {
                 color: colors.text,
                 fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                 fontSize: responsive.valueSize,
               }
             ]}>
               {formatCurrency(asset.value)}
             </Text>
             <View style={styles.changeContainer}>
               {isPositive ? (
                 <TrendingUp size={14} color={colors.success} strokeWidth={2} />
               ) : (
                 <TrendingDown size={14} color={colors.error} strokeWidth={2} />
               )}
               <Text style={[
                 styles.changeText,
                 {
                   color: isPositive ? colors.success : colors.error,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 3,
                 }
               ]}>
                 {formatPercentage(pnlPercentage)}
               </Text>
             </View>
           </View>
         </View>

         <View style={styles.assetDetails}>
           {/* Row 1: Holdings and Avg. Buy Price */}
           <View style={styles.detailRow}>
             <View style={styles.detailItem}>
               <Text style={[
                 styles.detailLabel,
                 {
                   color: colors.textSecondary,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 3,
                 }
               ]}>
                 Holdings
               </Text>
               <Text style={[
                 styles.detailValue,
                 {
                   color: colors.text,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 2,
                 }
               ]}>
                 {formatDecimalAmount(asset.amount)} {asset.symbol}
               </Text>
             </View>

             <View style={styles.detailItem}>
               <Text style={[
                 styles.detailLabel,
                 {
                   color: colors.textSecondary,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 3,
                 }
               ]}>
                 Avg. Buy Price
               </Text>
               <Text style={[
                 styles.detailValue,
                 {
                   color: colors.text,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 2,
                 }
               ]}>
                 {formatCurrency(asset.avgBuyPrice)}
               </Text>
             </View>
           </View>

           {/* Row 2: Current Price and Allocation */}
           <View style={styles.detailRow}>
             <View style={styles.detailItem}>
               <Text style={[
                 styles.detailLabel,
                 {
                   color: colors.textSecondary,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 3,
                 }
               ]}>
                 Current Price
               </Text>
               <Text style={[
                 styles.detailValue,
                 {
                   color: colors.text,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 2,
                 }
               ]}>
                 {formatCurrency(asset.price)}
               </Text>
             </View>

             <View style={styles.detailItem}>
               <Text style={[
                 styles.detailLabel,
                 {
                   color: colors.textSecondary,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 3,
                 }
               ]}>
                 Allocation
               </Text>
               <Text style={[
                 styles.detailValue,
                 {
                   color: colors.text,
                   fontFamily: typography.fontFamily?.primary,
                   fontSize: responsive.titleSize - 2,
                 }
               ]}>
                 {percentage.toFixed(1)}%
               </Text>
             </View>
           </View>
         </View>
       </GlassContainer>
       </TouchableOpacity>
     );
   };

  // Loading state
  const isLoading = holdingsLoading || (!hasFetchedHoldings && !error);

  if (isLoading && portfolio.length === 0) {
    return (
      <View style={styles.container}>
        <GlassContainer style={[styles.loadingContainer, { padding: responsive.cardPadding * 2 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[
            styles.loadingText,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize,
              marginTop: responsive.spacing,
            }
          ]}>
            Loading your portfolio...
          </Text>
        </GlassContainer>
      </View>
    );
  }

  // Error state
  if (error && portfolio.length === 0) {
    return (
      <View style={styles.container}>
        <GlassContainer style={[styles.errorContainer, { padding: responsive.cardPadding * 2 }]}>
          <Text style={[
            styles.errorText,
            {
              color: colors.error,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize,
              textAlign: 'center',
            }
          ]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              {
                backgroundColor: colors.primary + '20',
                borderColor: colors.primary,
                marginTop: responsive.spacing,
              }
            ]}
            onPress={() => {
              refreshWallet();
              fetchPNL();
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.retryButtonText,
              {
                color: colors.primary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 1,
              }
            ]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </GlassContainer>
      </View>
    );
  }

  // Empty state
  if (!isLoading && !error && portfolio.length === 0) {
    return (
      <View style={styles.container}>
        <GlassContainer style={[styles.emptyContainer, { padding: responsive.cardPadding * 2 }]}>
          <Text style={[
            styles.emptyTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              fontSize: responsive.titleSize + 2,
              marginBottom: responsive.spacing / 2,
            }
          ]}>
            No Holdings Yet
          </Text>
          <Text style={[
            styles.emptyText,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 1,
              textAlign: 'center',
            }
          ]}>
            Start trading to see your crypto holdings here
          </Text>
        </GlassContainer>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Assets List */}
      <View style={styles.assetsList}>
        {filteredAssets.map((asset) => (
          <AssetItem key={asset.id} asset={asset} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 105 : 85, // Account for bottom tab bar
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    opacity: 0.8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  errorText: {
    opacity: 0.8,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  retryButtonText: {
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.8,
  },
  assetsList: {
    flex: 1,
  },
  assetItem: {
    marginBottom: 12,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cryptoSymbol: {
    marginRight: 12,
    fontWeight: 'bold',
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  assetSymbol: {
    opacity: 0.8,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  assetDetails: {
    flexDirection: 'column',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    opacity: 0.8,
    marginBottom: 4,
  },
  detailValue: {
    fontWeight: '600',
  },
});

export default WalletAssets;