/**
 * Crypto Token Metadata
 * Provides icons, brand colors, and image URLs for all supported cryptocurrencies
 */

export const CRYPTO_METADATA = {
  // Use both short symbols and full pairs for compatibility
  'BTC': { name: 'Bitcoin', icon: '₿', color: '#f7931a', image: 'https://cdn.simpleicons.org/bitcoin' },
  'BTC-USDT': { name: 'Bitcoin', icon: '₿', color: '#f7931a', image: 'https://cdn.simpleicons.org/bitcoin' },
  'ETH': { name: 'Ethereum', icon: 'Ξ', color: '#627eea', image: 'https://cdn.simpleicons.org/ethereum' },
  'ETH-USDT': { name: 'Ethereum', icon: 'Ξ', color: '#627eea', image: 'https://cdn.simpleicons.org/ethereum' },
  'SOL': { name: 'Solana', icon: '◎', color: '#9945ff', image: 'https://cdn.simpleicons.org/solana' },
  'SOL-USDT': { name: 'Solana', icon: '◎', color: '#9945ff', image: 'https://cdn.simpleicons.org/solana' },
  'USDT': { name: 'Tether', icon: '₮', color: '#26a17b', image: null },
  'USDT-USDT': { name: 'Tether', icon: '₮', color: '#26a17b', image: null },
  'USDC': { name: 'USD Coin', icon: '$', color: '#2775ca', image: null },
  'USDC-USDT': { name: 'USD Coin', icon: '$', color: '#2775ca', image: null },
  'BNB': { name: 'Binance Coin', icon: 'B', color: '#f3ba2f', image: 'https://cdn.simpleicons.org/binance' },
  'BNB-USDT': { name: 'Binance Coin', icon: 'B', color: '#f3ba2f', image: 'https://cdn.simpleicons.org/binance' },
  'XRP': { name: 'Ripple', icon: 'X', color: '#23292f', image: 'https://cdn.simpleicons.org/xrp' },
  'XRP-USDT': { name: 'Ripple', icon: 'X', color: '#23292f', image: 'https://cdn.simpleicons.org/xrp' },
  'ADA': { name: 'Cardano', icon: '₳', color: '#0033ad', image: 'https://cdn.simpleicons.org/cardano' },
  'ADA-USDT': { name: 'Cardano', icon: '₳', color: '#0033ad', image: 'https://cdn.simpleicons.org/cardano' },
  'DOGE': { name: 'Dogecoin', icon: 'Ð', color: '#c2a633', image: 'https://cdn.simpleicons.org/dogecoin' },
  'DOGE-USDT': { name: 'Dogecoin', icon: 'Ð', color: '#c2a633', image: 'https://cdn.simpleicons.org/dogecoin' },
  'TRX': { name: 'Tron', icon: 'T', color: '#eb0029', image: 'https://cdn.simpleicons.org/tron' },
  'TRX-USDT': { name: 'Tron', icon: 'T', color: '#eb0029', image: 'https://cdn.simpleicons.org/tron' },
  'DOT': { name: 'Polkadot', icon: '●', color: '#e6007a', image: 'https://cdn.simpleicons.org/polkadot' },
  'DOT-USDT': { name: 'Polkadot', icon: '●', color: '#e6007a', image: 'https://cdn.simpleicons.org/polkadot' },
  'AVAX': { name: 'Avalanche', icon: 'A', color: '#e84142', image: 'https://cdn.simpleicons.org/avalanche' },
  'AVAX-USDT': { name: 'Avalanche', icon: 'A', color: '#e84142', image: 'https://cdn.simpleicons.org/avalanche' },
  'LINK': { name: 'Chainlink', icon: '⬡', color: '#2a5ada', image: 'https://cdn.simpleicons.org/chainlink' },
  'LINK-USDT': { name: 'Chainlink', icon: '⬡', color: '#2a5ada', image: 'https://cdn.simpleicons.org/chainlink' },
  'UNI': { name: 'Uniswap', icon: '🦄', color: '#ff007a', image: 'https://cdn.simpleicons.org/uniswap' },
  'UNI-USDT': { name: 'Uniswap', icon: '🦄', color: '#ff007a', image: 'https://cdn.simpleicons.org/uniswap' },
  'ATOM': { name: 'Cosmos', icon: '⚛', color: '#2e3148', image: 'https://cdn.simpleicons.org/cosmos' },
  'ATOM-USDT': { name: 'Cosmos', icon: '⚛', color: '#2e3148', image: 'https://cdn.simpleicons.org/cosmos' },
  'LTC': { name: 'Litecoin', icon: 'Ł', color: '#345d9d', image: 'https://cdn.simpleicons.org/litecoin' },
  'LTC-USDT': { name: 'Litecoin', icon: 'Ł', color: '#345d9d', image: 'https://cdn.simpleicons.org/litecoin' },
  'NEAR': { name: 'NEAR Protocol', icon: 'N', color: '#000000', image: 'https://cdn.simpleicons.org/near' },
  'NEAR-USDT': { name: 'NEAR Protocol', icon: 'N', color: '#000000', image: 'https://cdn.simpleicons.org/near' },
  'APT': { name: 'Aptos', icon: 'A', color: '#00d4aa', image: 'https://cdn.simpleicons.org/aptos' },
  'APT-USDT': { name: 'Aptos', icon: 'A', color: '#00d4aa', image: 'https://cdn.simpleicons.org/aptos' },
  'ARB': { name: 'Arbitrum', icon: '◆', color: '#28a0f0', image: 'https://cdn.simpleicons.org/arbitrum' },
  'ARB-USDT': { name: 'Arbitrum', icon: '◆', color: '#28a0f0', image: 'https://cdn.simpleicons.org/arbitrum' },
  // Stablecoins and fiat without SimpleIcons
  'INR': { name: 'Indian Rupee', icon: '₹', color: '#54c255', image: null },
  'MATIC': { name: 'Polygon', icon: '⬟', color: '#8247e5', image: null },
};

/**
 * Get crypto metadata by symbol
 * @param {string} symbol - Full symbol like 'BTC-USDT' or short like 'BTC'
 * @returns {object} Metadata with name, icon, and color
 */
export const getCryptoMetadata = (symbol) => {
  if (!symbol) return { name: 'Unknown', icon: '?', color: '#54c255' };

  // Try full symbol first
  if (CRYPTO_METADATA[symbol]) {
    return CRYPTO_METADATA[symbol];
  }

  // Try with -USDT suffix
  const fullSymbol = symbol.includes('-') ? symbol : `${symbol}-USDT`;
  if (CRYPTO_METADATA[fullSymbol]) {
    return CRYPTO_METADATA[fullSymbol];
  }

  // Fallback
  const shortSymbol = symbol.split('-')[0];
  return {
    name: shortSymbol,
    icon: shortSymbol.charAt(0),
    color: '#54c255',
    image: null
  };
};

export default CRYPTO_METADATA;
