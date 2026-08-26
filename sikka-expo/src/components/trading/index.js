// Trading Components - Phase 5: TradingChart Complete  
// Architecture for Sikka-Expo Trading Screen Implementation
// 
// This directory contains all trading-related components:
// - TradingHeader: Market overview and statistics display (✅)
// - TradingSearch: Search, filter, and sort functionality (✅)
// - TradingMarketList: Live cryptocurrency market data and selection (✅)
// - TradingChart: Interactive price charts with dynamic data generation (NEW ✅)
// - Chart: Chart wrapper component using TradingChart (✅)
// - TradingPanel: Buy/sell interface with order management
//
// Implementation phases:
// ✅ Phase 1: Foundation & Layout (COMPLETE)
// ✅ Phase 2: TradingHeader Component (COMPLETE)
// ✅ Phase 3: TradingSearch Component (COMPLETE)
// ✅ Phase 4: TradingMarketList Component (COMPLETE)
// ✅ Phase 5: Interactive TradingChart Component (COMPLETE)
// 🔄 Phase 6: Trading Panel Implementation (NEXT)

export { default as TradingHeader } from './TradingHeader';
export { default as TradingSearch } from './TradingSearch';
export { default as TradingMarketList } from './TradingMarketList';
// export { default as TradingChart } from './TradingChart'; // Replaced with SimplePriceDisplay
export { default as MarketList } from './MarketList';
// export { default as Chart } from './Chart'; // Replaced with SimplePriceDisplay
export { default as TradingPanel } from './TradingPanel';
export { default as SimplePriceDisplay } from './SimplePriceDisplay';

// Export default as object for easier importing
const TradingComponents = {
  TradingHeader: require('./TradingHeader').default,
  TradingSearch: require('./TradingSearch').default,
  TradingMarketList: require('./TradingMarketList').default,
  // TradingChart: require('./TradingChart').default, // Replaced with SimplePriceDisplay
  MarketList: require('./MarketList').default,
  // Chart: require('./Chart').default, // Replaced with SimplePriceDisplay
  TradingPanel: require('./TradingPanel').default,
  SimplePriceDisplay: require('./SimplePriceDisplay').default,
};

export default TradingComponents;