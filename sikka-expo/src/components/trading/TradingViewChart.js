import React, { memo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * TradingViewChart - Real-time price chart using TradingView widget
 *
 * Features:
 * - Real-time price updates via TradingView's built-in WebSocket
 * - KuCoin exchange data
 * - Dark theme matching app design
 * - Minimal MVP implementation
 *
 * @param {string} symbol - Trading pair (e.g., "BTC-USDT" or "BTC")
 * @param {number} height - Chart height in pixels
 */
const TradingViewChart = memo(({ symbol = 'BTC-USDT', height = 300 }) => {
  const webViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Convert symbol to TradingView format - use KuCoin USDT pairs (USDT ≈ USD)
  const getTradingViewSymbol = (sym) => {
    const base = sym.split('-')[0].toUpperCase();
    return `KUCOIN:${base}USDT`;
  };

  const tvSymbol = getTradingViewSymbol(symbol);

  // TradingView widget embed URL - designed for embedding
  const chartUrl = `https://s.tradingview.com/embed-widget/mini-symbol-overview/?locale=en#%7B%22symbol%22%3A%22${encodeURIComponent(tvSymbol)}%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22dateRange%22%3A%221D%22%2C%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%2C%22autosize%22%3Atrue%2C%22largeChartUrl%22%3A%22%22%7D`;

  // Web platform - use iframe
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <iframe
          src={chartUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 12,
          }}
          title="TradingView Chart"
        />
      </View>
    );
  }

  // Native platform - use WebView with direct URL
  return (
    <View style={[styles.container, { height }]}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#54c255" />
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      )}
      {hasError && (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Failed to load chart</Text>
          <Text style={styles.loadingText}>Please check your connection</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: chartUrl }}
        style={[styles.webview, { opacity: isLoading ? 0 : 1 }]}
        scrollEnabled={false}
        bounces={false}
        nestedScrollEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        originWhitelist={['*']}
        cacheEnabled={true}
        sharedCookiesEnabled={true}
        onLoadStart={() => {
          console.log('[TradingViewChart] Loading started:', chartUrl);
          setIsLoading(true);
          setHasError(false);
        }}
        onLoadEnd={() => {
          console.log('[TradingViewChart] Loading completed');
          setIsLoading(false);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error:', nativeEvent);
          setHasError(true);
          setIsLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error:', nativeEvent.statusCode);
        }}
        onMessage={(event) => {
          console.log('[TradingViewChart] Message:', event.nativeEvent.data);
        }}
        injectedJavaScript={`
          window.onerror = function(message, source, lineno, colno, error) {
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', message: message}));
          };
          true;
        `}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#181a2a',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181a2a',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

TradingViewChart.displayName = 'TradingViewChart';

export default TradingViewChart;
