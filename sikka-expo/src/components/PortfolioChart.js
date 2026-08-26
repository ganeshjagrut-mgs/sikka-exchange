import React, { memo, useMemo } from 'react';
import { View, Dimensions, Text, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';

// Static import for react-native-chart-kit
let LineChart;
try {
  const chartKit = require('react-native-chart-kit');
  LineChart = chartKit.LineChart;
} catch (error) {
  console.warn('react-native-chart-kit not available, using fallback');
  LineChart = null;
}

// Default data matching original
const defaultData = [
  { time: '00:00', value: 45000, volume: 1200 },
  { time: '04:00', value: 46200, volume: 1800 },
  { time: '08:00', value: 45800, volume: 2100 },
  { time: '12:00', value: 47500, volume: 2800 },
  { time: '16:00', value: 46900, volume: 2200 },
  { time: '20:00', value: 47270, volume: 1900 },
];

const PortfolioChart = memo(({ 
  data = defaultData, 
  height = 256, 
  isLoading = false,
  showGrid = true,
  bezier = true,
  withDots = false,
  withShadow = true,
}) => {
  const { theme } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    return {
      labels: data.map(item => item.time),
      datasets: [
        {
          data: data.map(item => item.value),
          color: (opacity = 1) => theme.colors.primary, // Line color
          strokeWidth: 3, // Line thickness
        }
      ],
    };
  }, [data, theme.colors.primary]);

  // Chart configuration
  const chartConfig = useMemo(() => ({
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => theme.colors.textSecondary,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    style: {
      borderRadius: theme.borderRadius.lg,
    },
    propsForDots: {
      r: withDots ? '4' : '0',
      strokeWidth: '2',
      stroke: theme.colors.primary,
      fill: theme.colors.background,
    },
    propsForBackgroundLines: {
      strokeDasharray: showGrid ? '3,3' : '0,0',
      stroke: theme.colors.border,
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.primary,
      fill: theme.colors.textSecondary,
    },
    fillShadowGradient: theme.colors.primary,
    fillShadowGradientOpacity: withShadow ? 0.3 : 0,
    fillShadowGradientFrom: theme.colors.primary,
    fillShadowGradientFromOpacity: withShadow ? 0.4 : 0,
    fillShadowGradientTo: theme.colors.primary,
    fillShadowGradientToOpacity: 0.1,
  }), [
    theme,
    showGrid,
    withDots,
    withShadow,
  ]);

  // Format Y-axis labels to show values in K format
  const formatYLabel = (value) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  if (isLoading) {
    return (
      <View 
        style={{ 
          height, 
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text 
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            marginTop: theme.spacing[2],
          }}
        >
          Loading chart data...
        </Text>
      </View>
    );
  }

  if (!chartData) {
    return (
      <View 
        style={{ 
          height, 
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <Text 
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.base,
          }}
        >
          No chart data available
        </Text>
      </View>
    );
  }

  // Show fallback if LineChart is not available
  if (!LineChart) {
    return (
      <View 
        style={{ 
          height, 
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius?.lg || 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing?.[4] || 16,
        }}
      >
        <Text 
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.base,
            textAlign: 'center',
            marginBottom: theme.spacing?.[2] || 8,
          }}
        >
          Chart Preview
        </Text>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          width: '100%',
          alignItems: 'flex-end',
          height: height - 80,
        }}>
          {chartData.labels.map((label, index) => (
            <View key={label} style={{ alignItems: 'center' }}>
              <View 
                style={{
                  width: 8,
                  height: Math.max(20, (chartData.datasets[0].data[index] - 45000) / 100),
                  backgroundColor: theme.colors.primary,
                  marginBottom: 8,
                  borderRadius: 4,
                }}
              />
              <Text 
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
        <Text 
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            textAlign: 'center',
            marginTop: theme.spacing?.[2] || 8,
          }}
        >
          Chart library loading...
        </Text>
      </View>
    );
  }

  return (
    <View 
      style={{ 
        height, 
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <LineChart
        data={chartData}
        width={screenWidth - 32} // Account for padding
        height={height}
        chartConfig={chartConfig}
        bezier={bezier}
        style={{
          marginVertical: 0,
          borderRadius: theme.borderRadius?.lg || 12,
        }}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withVerticalLines={showGrid}
        withHorizontalLines={showGrid}
        withDots={withDots}
        withShadow={withShadow}
        withScrollableDot={false}
        onDataPointClick={(data) => {
          // Handle data point click
          console.log('Chart data point clicked:', data);
        }}
        formatYLabel={formatYLabel}
        segments={4} // Number of horizontal grid lines
      />
    </View>
  );
});

PortfolioChart.displayName = 'PortfolioChart';

export default PortfolioChart;