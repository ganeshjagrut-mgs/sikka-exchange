import React, { memo, useMemo, useState, useEffect } from 'react';
import { View, Dimensions, Text, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useStore } from '../../store/useStore';
import GlassContainer from '../ui/GlassContainer';
import { LineChart } from 'react-native-chart-kit';
import { formatIndianCurrency } from '../../utils/formatIndianCurrency';
import API_CONFIG from '../../config/api';

/**
 * TradingChart Component - Interactive price chart for selected cryptocurrency
 * Features:
 * - Dynamic chart updates based on selectedCrypto from store
 * - Responsive chart sizing (mobile/tablet/desktop)
 * - Glass morphism design matching app theme
 * - Generated price history with realistic volatility
 * - Color coding based on price change (green for gains, red for losses)
 */
const TradingChart = memo(({
  height: customHeight,
  showGrid = true,
  withDots = false,
  withShadow = true,
  showTitle = true
}) => {
  const { theme } = useTheme();
  const { isMobile, isTablet, isDesktop, screenWidth } = useBreakpoints();
  const { selectedCrypto, marketData } = useStore();

  // Calculate responsive chart dimensions
  const chartDimensions = useMemo(() => {
    const padding = isMobile ? 16 : isTablet ? 24 : 32;
    const titleHeight = showTitle ? (isMobile ? 60 : 80) : 20;
    
    const width = isMobile 
      ? screenWidth - (padding * 2)
      : isTablet 
        ? Math.min(screenWidth - (padding * 2), 600)
        : Math.min(screenWidth - (padding * 2), 800);
    
    const height = customHeight || (isMobile ? 280 : isTablet ? 320 : 360);
    
    return {
      width,
      height,
      totalHeight: height + titleHeight,
      padding,
      titleHeight
    };
  }, [isMobile, isTablet, screenWidth, customHeight, showTitle]);

  // Get current crypto data (selectedCrypto or default to Bitcoin)
  const currentCrypto = useMemo(() => {
    if (selectedCrypto) return selectedCrypto;

    // Default to Bitcoin if no crypto selected
    return marketData.find(crypto => crypto.id === 'bitcoin') || marketData[0];
  }, [selectedCrypto, marketData]);

  // State for candle data from backend
  const [candleData, setCandleData] = useState(null);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [candleError, setCandleError] = useState(null);

  // Fetch historical candle data from backend
  useEffect(() => {
    if (!currentCrypto) return;

    const fetchCandles = async () => {
      setLoadingCandles(true);
      setCandleError(null);

      try {
        // Convert crypto symbol to trading pair format (e.g., BTC -> BTC-USDT)
        const symbol = `${currentCrypto.symbol.toUpperCase()}-USDT`;

        console.log(`[TradingChart] Fetching candles for ${symbol}`);

        const headers = {};
        // Add ngrok header only when using ngrok URLs
        if (API_CONFIG.API_BASE_URL.includes('ngrok')) {
          headers['ngrok-skip-browser-warning'] = 'true';
        }

        const response = await fetch(
          `${API_CONFIG.API_BASE_URL}/api/market/candles?symbol=${symbol}&type=1hour`,
          { headers }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch candle data');
        }

        console.log(`[TradingChart] Fetched ${result.data.candles.length} candles for ${symbol}`);
        setCandleData(result.data);
      } catch (error) {
        console.error('[TradingChart] Error fetching candles:', error);
        setCandleError(error.message);
      } finally {
        setLoadingCandles(false);
      }
    };

    fetchCandles();
  }, [currentCrypto]);

  // Transform candle data for chart rendering
  const chartData = useMemo(() => {
    if (!candleData || !candleData.candles || candleData.candles.length === 0) {
      return null;
    }

    const candles = candleData.candles;

    // Sample candles for display (show ~12-24 points on mobile, ~24-48 on desktop)
    const sampleInterval = isMobile ? Math.ceil(candles.length / 12) : isTablet ? Math.ceil(candles.length / 18) : Math.ceil(candles.length / 24);
    const sampledCandles = candles.filter((_, index) => index % sampleInterval === 0);

    // Generate labels from timestamps
    const labels = sampledCandles.map(candle => {
      const date = new Date(candle.timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });

    // Extract close prices for chart
    const priceData = sampledCandles.map(candle => candle.close);

    return {
      labels,
      datasets: [
        {
          data: priceData,
          color: (opacity = 1) => currentCrypto?.color || theme.colors.primary,
          strokeWidth: 3,
        }
      ],
    };
  }, [candleData, currentCrypto, theme.colors.primary, isMobile, isTablet]);

  // Chart configuration with dynamic theming
  const chartConfig = useMemo(() => {
    const isPositive = currentCrypto?.change24h > 0;
    const chartColor = currentCrypto?.color || (isPositive ? '#10b981' : '#ef4444');
    
    return {
      backgroundColor: 'transparent',
      backgroundGradientFrom: 'transparent',
      backgroundGradientTo: 'transparent',
      backgroundGradientFromOpacity: 0,
      backgroundGradientToOpacity: 0,
      color: (opacity = 1) => theme.colors.textSecondary,
      strokeWidth: 3,
      barPercentage: 0.5,
      useShadowColorFromDataset: false,
      decimalPlaces: currentCrypto?.price > 1000 ? 0 : 2,
      style: {
        borderRadius: theme.borderRadius.lg,
      },
      propsForDots: {
        r: withDots ? '4' : '0',
        strokeWidth: '2',
        stroke: chartColor,
        fill: theme.colors.background,
      },
      propsForBackgroundLines: {
        strokeDasharray: showGrid ? '3,3' : '0,0',
        stroke: theme.colors.border,
        strokeWidth: 1,
      },
      propsForLabels: {
        fontSize: isMobile ? theme.typography.fontSize.xs : theme.typography.fontSize.sm,
        fontFamily: theme.typography.fontFamily.primary,
        fill: theme.colors.textSecondary,
      },
      // Area chart specific gradients
      fillShadowGradient: chartColor,
      fillShadowGradientOpacity: withShadow ? 0.4 : 0,
      fillShadowGradientFrom: chartColor,
      fillShadowGradientFromOpacity: withShadow ? 0.6 : 0,
      fillShadowGradientTo: chartColor,
      fillShadowGradientToOpacity: withShadow ? 0.1 : 0,
    };
  }, [
    theme,
    currentCrypto,
    showGrid,
    withDots,
    withShadow,
    isMobile,
  ]);

  // Format price values for display (USDT ≈ USD)
  const formatPrice = (value) => {
    if (!currentCrypto) return '$0';

    // Convert to number and handle invalid values
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '$0';

    // Price is already in USDT ≈ USD
    return formatIndianCurrency(numValue);
  };

  // Loading state
  if (!currentCrypto || loadingCandles) {
    return (
      <GlassContainer style={{
        height: chartDimensions.totalHeight,
        justifyContent: 'center',
        alignItems: 'center',
        margin: chartDimensions.padding / 2,
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{
          color: theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.sm,
          marginTop: theme.spacing[2],
        }}>
          {loadingCandles ? `Loading ${currentCrypto?.symbol.toUpperCase()} chart data...` : 'Loading chart data...'}
        </Text>
      </GlassContainer>
    );
  }

  // Error state
  if (candleError) {
    return (
      <GlassContainer style={{
        height: chartDimensions.totalHeight,
        justifyContent: 'center',
        alignItems: 'center',
        margin: chartDimensions.padding / 2,
        padding: theme.spacing[4],
      }}>
        <Text style={{
          color: theme.colors.error,
          fontSize: theme.typography.fontSize.base,
          textAlign: 'center',
          marginBottom: theme.spacing[2],
        }}>
          Failed to load chart data
        </Text>
        <Text style={{
          color: theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.sm,
          textAlign: 'center',
        }}>
          {candleError}
        </Text>
      </GlassContainer>
    );
  }

  // Chart title component
  const ChartTitle = () => {
    if (!showTitle) return null;
    
    const isPositive = currentCrypto.change24h > 0;
    const changeColor = isPositive ? '#10b981' : '#ef4444';
    
    return (
      <View style={{
        paddingHorizontal: theme.spacing[4],
        paddingTop: theme.spacing[4],
        paddingBottom: theme.spacing[2],
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: isMobile ? theme.typography.fontSize.lg : theme.typography.fontSize.xl,
              fontWeight: '600',
              color: theme.colors.text,
              marginBottom: theme.spacing[1],
            }}>
              {currentCrypto.name} ({currentCrypto.symbol})
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <Text style={{
                fontSize: isMobile ? theme.typography.fontSize.base : theme.typography.fontSize.lg,
                fontWeight: '700',
                color: theme.colors.text,
                marginRight: theme.spacing[3],
              }}>
                {formatIndianCurrency(currentCrypto.price)}
              </Text>
              <Text style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: '600',
                color: changeColor,
              }}>
                {isPositive ? '+' : ''}{currentCrypto.change24h.toFixed(2)}%
              </Text>
            </View>
          </View>
          <Text style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing[1],
          }}>
            24H Price Chart
          </Text>
        </View>
      </View>
    );
  };


  // No data state (after loading completes)
  if (!chartData) {
    return (
      <GlassContainer style={{
        height: chartDimensions.totalHeight,
        margin: chartDimensions.padding / 2,
        padding: theme.spacing[4],
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <ChartTitle />
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.base,
            textAlign: 'center',
          }}>
            No chart data available
          </Text>
        </View>
      </GlassContainer>
    );
  }

  // Main chart component
  return (
    <GlassContainer style={{
      height: chartDimensions.totalHeight,
      margin: chartDimensions.padding / 2,
    }}>
      <ChartTitle />
      
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[2],
        paddingBottom: theme.spacing[4],
      }}>
        <LineChart
          data={chartData}
          width={chartDimensions.width}
          height={chartDimensions.height - chartDimensions.titleHeight}
          chartConfig={chartConfig}
          style={{
            marginVertical: 0,
            borderRadius: theme.borderRadius.lg,
          }}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withVerticalLines={showGrid}
          withHorizontalLines={showGrid}
          withDots={withDots}
          withShadow={withShadow}
          withScrollableDot={false}
          onDataPointClick={(data) => {
            console.log('Trading chart data point clicked:', data);
          }}
          formatYLabel={formatPrice}
          segments={4}
          bezier
        />
      </View>
    </GlassContainer>
  );
});

TradingChart.displayName = 'TradingChart';

export default TradingChart;