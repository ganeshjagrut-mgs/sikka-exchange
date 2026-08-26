import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { TrendingUp, TrendingDown, Wallet, PieChart, DollarSign } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import useWalletStore from '../../store/walletStore';
import useTradingStore from '../../store/tradingStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import CryptoIcon from '../ui/CryptoIcon';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';
import { extractBalanceData, parseNumeric } from '../../utils/walletData';
import { getCryptoMetadata } from '../../constants/cryptoMetadata';

/**
 * Enhanced Wallet Overview Component
 *
 * Key Improvements:
 * 1. All values displayed in USD (no INR conversion)
 * 2. Better P&L calculation from holdings API
 * 3. Improved data synchronization
 * 4. Enhanced error handling and loading states
 */

const pickNumber = (candidates, fallback) => {
  for (const candidate of candidates) {
    const numeric = parseNumeric(candidate, Number.NaN);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return fallback;
};

const formatPercentage = (value) => {
  if (!Number.isFinite(value)) {
    return '0.00%';
  }

  const fixed = value.toFixed(2);
  return `${value >= 0 ? '+' : ''}${fixed}%`;
};

const WalletOverview = () => {
  const { colors, typography } = useTheme();
  const {
    balance,
    holdings,
    loading,
    error,
    fetchBalance,
    fetchHoldings,
    refreshWallet,
  } = useWalletStore();
  const { pnl, fetchPNL } = useTradingStore();
  const { isMobile, isTablet } = useBreakpoints();

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        // Use refreshWallet for better data synchronization
        await refreshWallet();
        // Also fetch P&L data
        await fetchPNL();
      } catch (fetchError) {
        console.error('Failed to load wallet data:', fetchError);
      }
    };

    loadWalletData();
  }, [refreshWallet, fetchPNL]);

  const formatCurrency = useCallback((amount) => formatIndianCurrency(amount), []);

  const balanceData = extractBalanceData(balance);

  const holdingStatsMap = useMemo(() => {
    if (!holdings || holdings.length === 0) {
      return {};
    }

    return holdings.reduce((acc, item) => {
      const symbol = item.symbol || item.currency;
      if (!symbol) {
        return acc;
      }

      const quantity = parseNumeric(item.quantity || item.amount, 0);
      const currentValueUSD = parseNumeric(item.currentValueUSD || item.current_value, 0);
      const pnlUSD = parseNumeric(item.pnlUSD || item.pnl, 0);
      const pnlPercentage = parseNumeric(item.pnlPercentage || item.pnl_percentage, 0);
      const priceInUSD = quantity > 0 ? currentValueUSD / quantity : 0;

      acc[symbol] = {
        quantity,
        currentValueUSD,
        priceInUSD,
        pnlUSD,
        pnlPercentage,
      };

      return acc;
    }, {});
  }, [holdings]);

  const getPriceInUSD = useCallback((currency) => {
    if (!currency) {
      return 0;
    }

    // USDT and USDC are 1:1 with USD
    if (currency === 'USDT' || currency === 'USDC' || currency === 'USD') {
      return 1;
    }

    const stats = holdingStatsMap[currency];
    if (stats?.priceInUSD) {
      return stats.priceInUSD;
    }

    // Default to 1 for unknown currencies
    return 1;
  }, [holdingStatsMap]);

  const allocation = useMemo(() => {
    // Use trade account balances for allocation display (where trading happens)
    const tradeBalances = balanceData?.trade?.balances || balanceData?.balances || [];

    if (!tradeBalances || tradeBalances.length === 0) {
      return {
        availableUSD: 0,
        lockedUSD: 0,
        items: [],
      };
    }

    const buckets = new Map();

    tradeBalances.forEach((entry) => {
      const currency = entry.currency || entry.symbol;
      if (!currency) {
        return;
      }

      const availableRaw = parseNumeric(entry.available, 0);
      const lockedRaw = parseNumeric(entry.holds, 0);
      const totalRawParsed = parseNumeric(entry.balance, NaN);
      const totalRaw = Number.isFinite(totalRawParsed)
        ? totalRawParsed
        : availableRaw + lockedRaw;

      if (!Number.isFinite(totalRaw) || totalRaw <= 0) {
        return;
      }

      const existing = buckets.get(currency) || {
        availableRaw: 0,
        lockedRaw: 0,
        totalRaw: 0,
      };

      existing.availableRaw += availableRaw;
      existing.lockedRaw += lockedRaw;
      existing.totalRaw += totalRaw;

      buckets.set(currency, existing);
    });

    let availableUSD = 0;
    let lockedUSD = 0;
    const items = [];

    buckets.forEach((bucket, currency) => {
      if (!Number.isFinite(bucket.totalRaw) || bucket.totalRaw <= 0) {
        return;
      }

      const priceInUSD = getPriceInUSD(currency);
      if (!Number.isFinite(priceInUSD) || priceInUSD <= 0) {
        return;
      }

      const totalUSD = bucket.totalRaw * priceInUSD;
      const availableValueUSD = bucket.availableRaw * priceInUSD;
      const lockedValueUSD = bucket.lockedRaw * priceInUSD;

      availableUSD += availableValueUSD;
      lockedUSD += lockedValueUSD;

      const meta = getCryptoMetadata(currency);
      const stats = holdingStatsMap[currency];

      items.push({
        id: currency,
        symbol: currency,
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        amount: bucket.totalRaw,
        value: totalUSD,
        availableUSD: availableValueUSD,
        lockedUSD: lockedValueUSD,
        pnlUSD: stats?.pnlUSD ?? 0,
        pnlPercentage: stats?.pnlPercentage ?? 0,
      });
    });

    items.sort((a, b) => b.value - a.value);

    return {
      availableUSD,
      lockedUSD,
      items,
    };
  }, [balanceData, colors, getPriceInUSD, holdingStatsMap]);

  // Note: USDT is already included in allocation.items from trade.balances
  // All values are now in USD
  const allocationItems = useMemo(() => {
    return [...allocation.items].sort((a, b) => b.value - a.value);
  }, [allocation.items]);

  const allocationTotalValue = useMemo(
    () => allocationItems.reduce((sum, item) => sum + item.value, 0),
    [allocationItems]
  );

  // Total Portfolio Value: Everything you own (crypto + USDT) in USD
  const portfolioValue = pickNumber(
    [
      balanceData?.totalValueUSD,  // PRIORITY: Total value in USD
      balanceData?.totalValueUSDT,
      balanceData?.totalValueUsdt,
      balanceData?.total_value_usdt,
      // New structure: use trade account total
      balanceData?.trade?.totalValueUSD,
      balanceData?.trade?.totalValueUSDT,
    ],
    allocationTotalValue,
  );

  // Crypto Holdings: Sum of current value from holdings in USD
  const cryptoHoldingsValue = holdings && holdings.length > 0
    ? holdings.reduce((sum, h) => sum + parseNumeric(h.currentValueUSD, 0), 0)
    : 0;

  const normalizedPnl = useMemo(() => {
    // First try to get P&L from holdings API (more accurate)
    if (holdings && holdings.length > 0) {
      const totalInvestedUSD = holdings.reduce((sum, h) => sum + parseNumeric(h.investedUSD || h.totalInvestedUSD, 0), 0);
      const totalCurrentValueUSD = holdings.reduce((sum, h) => sum + parseNumeric(h.currentValueUSD, 0), 0);
      const totalPnlUSD = holdings.reduce((sum, h) => sum + parseNumeric(h.pnlUSD, 0), 0);
      const totalPnlPercentage = totalInvestedUSD > 0 ? (totalPnlUSD / totalInvestedUSD) * 100 : 0;

      return {
        total: totalPnlUSD,
        percentage: totalPnlPercentage,
        invested: totalInvestedUSD,
        source: 'holdings',
      };
    }

    // Fallback to trading P&L API
    if (!pnl) {
      return {
        total: undefined,
        percentage: undefined,
        invested: undefined,
        source: 'none',
      };
    }

    return {
      total: pickNumber(
        [
          pnl.total,
          pnl.totalPnL,
          pnl.totalPnl,
          pnl.totalPnlUSD,
          pnl.totalPnlUsdt,
          pnl.pnlTotal,
        ],
        undefined,
      ),
      percentage: pickNumber(
        [
          pnl.percentage,
          pnl.percent,
          pnl.totalPnlPercentage,
          pnl.totalPnLPercentage,
          pnl.totalPnlPercent,
          pnl.totalPnlPct,
          pnl.pnlPercentage,
        ],
        undefined,
      ),
      invested: pickNumber(
        [
          pnl.totalInvestedUSD,
          pnl.totalInvestedUsdt,
          pnl.totalInvested,
          pnl.investedUSD,
          pnl.invested,
        ],
        undefined,
      ),
      source: 'trading',
    };
  }, [pnl, holdings]);

  const totalPnL = Number.isFinite(normalizedPnl.total) ? normalizedPnl.total : 0;
  const pnlPercentageValue = normalizedPnl.percentage;
  const investedAmount = normalizedPnl.invested;
  const pnlSubtitle = Number.isFinite(pnlPercentageValue)
    ? formatPercentage(pnlPercentageValue)
    : Number.isFinite(investedAmount)
      ? `Invested ${formatCurrency(investedAmount)}`
      : null;
  const pnlIcon = totalPnL < 0 ? TrendingDown : TrendingUp;
  const pnlColor = totalPnL > 0 ? colors.success : totalPnL < 0 ? colors.error : colors.textSecondary;

  // Available Balance: USDT available for trading (from backend - excludes locked)
  const availableBalance = balanceData?.available?.usd || balanceData?.available?.usdt || 0;

  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        cardPadding: 16,
        titleSize: 16,
        valueSize: 20,
        iconSize: 18,
        spacing: 12,
        columns: 1,
      };
    }

    if (isTablet) {
      return {
        cardPadding: 18,
        titleSize: 17,
        valueSize: 22,
        iconSize: 20,
        spacing: 16,
        columns: 2,
      };
    }

    return {
      cardPadding: 20,
      titleSize: 18,
      valueSize: 24,
      iconSize: 22,
      spacing: 20,
      columns: 3,
    };
  };

  const responsive = getResponsiveStyles();

  const OverviewCard = ({ title, value, icon: Icon, iconColor, subtitle, subtitleColor }) => (
    <GlassContainer style={[styles.overviewCard, { padding: responsive.cardPadding }]}>
      <View style={styles.cardHeader}>
        <Icon size={responsive.iconSize} color={iconColor || colors.primary} strokeWidth={1.5} />
        <Text
          style={[
            styles.cardTitle,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 2,
            },
          ]}
        >
          {title}
        </Text>
      </View>

      <Text
        style={[
          styles.cardValue,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
            fontSize: responsive.valueSize,
          },
        ]}
      >
        {value}
      </Text>

      {subtitle ? (
        <Text
          style={[
            styles.cardSubtitle,
            {
              color: subtitleColor || colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.titleSize - 4,
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </GlassContainer>
  );

  const AssetAllocationItem = ({ asset, totalValue }) => {
    const share = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
    const pnlPercentageLabel = Number.isFinite(asset.pnlPercentage)
      ? formatPercentage(asset.pnlPercentage)
      : null;
    const hasPnlValue = Number.isFinite(asset.pnlInr);
    const pnlColor = hasPnlValue
      ? asset.pnlInr >= 0
        ? colors.success
        : colors.error
      : colors.textSecondary;
    const amountDisplay = Number.isFinite(asset.amount)
      ? asset.amount >= 1
        ? asset.amount.toFixed(2)
        : asset.amount.toFixed(4)
      : '0';
    const pnlValueLabel = hasPnlValue ? formatCurrency(asset.pnlInr) : '—';
    const pnlLabel = pnlPercentageLabel ? `${pnlValueLabel} (${pnlPercentageLabel})` : pnlValueLabel;

    return (
      <View style={styles.allocationItem}>
        <View style={styles.allocationLeft}>
          <CryptoIcon
            symbol={asset.symbol}
            size={responsive.titleSize + 12}
            fallbackIcon={asset.icon}
            fallbackColor={asset.color}
            style={{ marginRight: 12 }}
          />
          <View style={styles.assetInfo}>
            <Text
              style={[
                styles.assetName,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                },
              ]}
            >
              {asset.symbol}
            </Text>
            <Text
              style={[
                styles.assetAmount,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 3,
                },
              ]}
            >
              {amountDisplay}
            </Text>
          </View>
        </View>

        <View style={styles.allocationRight}>
          <Text
            style={[
              styles.assetValue,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 1,
              },
            ]}
          >
            {formatCurrency(asset.value)}
          </Text>
          <Text
            style={[
              styles.assetPercentage,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 4,
              },
            ]}
          >
            {share.toFixed(1)}% of portfolio
          </Text>
          <Text
            style={[
              styles.assetPnl,
              {
                color: pnlColor,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize - 4,
              },
            ]}
          >
            {pnlLabel}
          </Text>
        </View>
      </View>
    );
  };

  const showLoadingState = loading && !balanceData;

  return (
    <View style={styles.container}>
      {showLoadingState ? (
        <GlassContainer style={[styles.loadingContainer, { padding: responsive.cardPadding * 2 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[
              styles.loadingText,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize,
                marginTop: responsive.spacing,
              },
            ]}
          >
            Loading wallet data...
          </Text>
        </GlassContainer>
      ) : error ? (
        <GlassContainer style={[styles.errorContainer, { padding: responsive.cardPadding * 2 }]}>
          <Text
            style={[
              styles.errorText,
              {
                color: colors.error,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.titleSize,
                textAlign: 'center',
              },
            ]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: responsive.spacing }]}
            onPress={() => {
              refreshWallet();
              fetchPNL();
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.retryButtonText,
                {
                  color: '#ffffff',
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.titleSize - 1,
                },
              ]}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </GlassContainer>
      ) : (
        <>
          <View
            style={[
              styles.overviewGrid,
              {
                flexDirection: isMobile ? 'column' : 'row',
                gap: responsive.spacing,
              },
            ]}
          >
            <OverviewCard
              title="Total Portfolio"
              value={formatCurrency(portfolioValue)}
              icon={Wallet}
              iconColor={colors.primary}
            />

            <OverviewCard
              title="Total P&L"
              value={formatCurrency(totalPnL)}
              icon={pnlIcon}
              iconColor={pnlColor}
              subtitle={pnlSubtitle}
              subtitleColor={pnlColor}
            />

            <OverviewCard
              title="Available Cash"
              value={formatCurrency(availableBalance)}
              icon={DollarSign}
              iconColor={colors.success}
            />

            <OverviewCard
              title="Crypto Holdings"
              value={formatCurrency(cryptoHoldingsValue)}
              icon={Wallet}
              iconColor="#f7931a"
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 200, // Ensure minimum height for scrolling
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  errorText: {
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
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
  loadingText: {
    opacity: 0.8,
  },
  emptyText: {
    opacity: 0.8,
  },
  overviewGrid: {
    flexWrap: 'nowrap', // Prevent cards from wrapping to new lines
  },
  overviewCard: {
    flex: 1,
    minWidth: 0, // Allow flex shrinking below content size
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    marginLeft: 8,
    opacity: 0.8,
  },
  cardValue: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontWeight: '600',
    opacity: 0.85,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  allocationList: {
    gap: 12,
  },
  allocationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  allocationLeft: {
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
    fontWeight: '600',
  },
  assetAmount: {
    opacity: 0.8,
  },
  allocationRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    fontWeight: '600',
  },
  assetPercentage: {
    opacity: 0.85,
  },
  assetPnl: {
    marginTop: 2,
    fontWeight: '600',
  },
});

export default WalletOverview;