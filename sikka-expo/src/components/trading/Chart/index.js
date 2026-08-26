// Chart Component - Phase 5 Implementation
// Interactive price chart with dynamic data generation and responsive design
// Features:
// - Dynamic AreaChart based on selectedCrypto from store
// - Responsive chart sizing (mobile/tablet/desktop)
// - Glass morphism design matching app theme
// - Generated price history with realistic volatility
// - Color coding based on price change

import React from 'react';
import TradingChart from '../TradingChart';

const Chart = ({ 
  crypto = null, 
  height = 400,
  timeframe = '1D',
  chartType = 'area',
  showGrid = true,
  withDots = false,
  withShadow = true,
  showTitle = true
}) => {
  return (
    <TradingChart
      height={height}
      showGrid={showGrid}
      withDots={withDots}
      withShadow={withShadow}
      showTitle={showTitle}
    />
  );
};

export default Chart;