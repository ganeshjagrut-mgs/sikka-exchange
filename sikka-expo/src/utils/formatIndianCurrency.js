/**
 * USD Currency Formatting Utility
 * Formats amounts using international numbering system (K, M, B)
 *
 * @module formatCurrency
 */

/**
 * Format amount in USD with K/M/B suffixes
 *
 * @param {number} amount - Amount in USD
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeSymbol - Include $ symbol (default: true)
 * @param {number} options.decimals - Max decimal places (default: 2)
 * @returns {string} Formatted currency string
 *
 * @example
 * formatIndianCurrency(850) // "$850"
 * formatIndianCurrency(1500) // "$1.5K"
 * formatIndianCurrency(100000) // "$100K"
 * formatIndianCurrency(1500000) // "$1.5M"
 * formatIndianCurrency(1500000000) // "$1.5B"
 * formatIndianCurrency(-550000) // "$-550K"
 */
export const formatIndianCurrency = (amount, options = {}) => {
  const {
    includeSymbol = true,
    decimals = 2,
  } = options;

  // Edge case: null/undefined/NaN
  if (amount == null || isNaN(amount)) {
    return includeSymbol ? '$0' : '0';
  }

  const num = Number(amount);

  // Edge case: zero
  if (num === 0) {
    return includeSymbol ? '$0' : '0';
  }

  // Handle negative (preserve sign)
  const isNegative = num < 0;
  const absAmount = Math.abs(num);
  const sign = isNegative ? '-' : '';

  let formatted;

  // Thresholds and formatting logic (K/M/B)
  if (absAmount < 1000) {
    // Below 1K: Show as-is with decimals
    formatted = formatNumber(absAmount, decimals);
  } else if (absAmount < 1000000) {
    // 1K - 999.99K
    const value = absAmount / 1000;
    formatted = formatNumber(value, decimals) + 'K';
  } else if (absAmount < 1000000000) {
    // 1M - 999.99M
    const value = absAmount / 1000000;
    formatted = formatNumber(value, decimals) + 'M';
  } else {
    // 1B+
    const value = absAmount / 1000000000;
    formatted = formatNumber(value, decimals) + 'B';
  }

  return includeSymbol ? `$${sign}${formatted}` : `${sign}${formatted}`;
};

/**
 * Helper: Format number with smart decimal handling
 * Removes trailing zeros, max 2 decimal places
 */
const formatNumber = (num, maxDecimals) => {
  // Round to max decimals
  const fixed = num.toFixed(maxDecimals);
  const parsed = parseFloat(fixed);

  // If it's a whole number, return without decimals
  if (parsed === Math.floor(parsed)) {
    return parsed.toString();
  }

  // Otherwise return with trimmed decimals (removes trailing zeros)
  return parsed.toString();
};

/**
 * Format USDT/USD amount - no conversion needed anymore
 * Kept for backward compatibility with existing code
 *
 * @param {number} amount - Amount in USD/USDT
 * @param {number} exchangeRate - IGNORED (kept for backward compatibility)
 * @param {Object} options - Same as formatIndianCurrency options
 * @returns {string} Formatted currency string in USD
 *
 * @example
 * convertAndFormat(67000) // "$67K" (BTC price)
 * convertAndFormat(2500) // "$2.5K" (ETH price)
 * convertAndFormat(150) // "$150" (SOL price)
 */
export const convertAndFormat = (amount, exchangeRate, options = {}) => {
  // No conversion needed - just format directly as USD
  return formatIndianCurrency(amount, options);
};

/**
 * Format amount with standard USD comma notation
 * For detailed displays where K/M/B is not appropriate
 *
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted with commas
 *
 * @example
 * formatIndianCommas(1234567) // "$1,234,567"
 * formatIndianCommas(12345) // "$12,345"
 */
export const formatIndianCommas = (amount, options = {}) => {
  const { includeSymbol = true } = options;

  if (amount == null || isNaN(amount)) {
    return includeSymbol ? '$0' : '0';
  }

  const formatted = Number(amount).toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

  return includeSymbol ? `$${formatted}` : formatted;
};

// Alias for backward compatibility
export const formatUSD = formatIndianCurrency;

export default {
  formatIndianCurrency,
  formatUSD,
  convertAndFormat,
  formatIndianCommas
};
