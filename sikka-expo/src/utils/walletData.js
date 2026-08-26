/**
 * Enhanced wallet data utilities
 *
 * Key Improvements:
 * 1. Better data extraction and normalization
 * 2. Consistent numeric parsing
 * 3. Support for multiple data formats
 * 4. Improved error handling
 */

export const extractBalanceData = (balance) => {
  if (!balance) {
    return null;
  }

  // Direct balance object
  if (balance.balances || balance.totalValueUSD !== undefined || balance.totalValueINR !== undefined) {
    return balance;
  }

  // Nested in data property
  if (balance.data) {
    return balance.data;
  }

  // Legacy format support
  if (balance.main || balance.trade) {
    return balance;
  }

  return null;
};

export const getBalanceItem = (balance, currency) => {
  const balanceData = extractBalanceData(balance);
  if (!balanceData?.balances) {
    return null;
  }

  return balanceData.balances.find(
    (item) => (item.currency || item.symbol) === currency
  ) || null;
};

export const sumBalanceField = (balance, field = 'available') => {
  const balanceData = extractBalanceData(balance);
  if (!balanceData?.balances) {
    return 0;
  }

  return balanceData.balances.reduce((total, item) => {
    const value = parseFloat(item?.[field] ?? 0);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
};

export const parseNumeric = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  // Handle string representations
  if (typeof value === 'string') {
    // Remove commas and extra spaces
    const cleaned = value.replace(/,/g, '').trim();
    if (cleaned === '') {
      return fallback;
    }
    const number = parseFloat(cleaned);
    return Number.isFinite(number) ? number : fallback;
  }

  // Handle numbers
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  // Handle other types by attempting conversion
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};

/**
 * Safely format currency values with proper handling of edge cases
 * @param {number} value - The numeric value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const safeFormatCurrency = (value, decimals = 2) => {
  const numeric = parseNumeric(value, 0);
  if (!Number.isFinite(numeric)) {
    return '0.00';
  }

  // Handle very small numbers
  if (Math.abs(numeric) < 0.01 && numeric !== 0) {
    return numeric.toFixed(6).replace(/\.?0+$/, '');
  }

  return numeric.toFixed(decimals);
};

/**
 * Calculate percentage safely
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
export const calculatePercentage = (value, total) => {
  const numericValue = parseNumeric(value, 0);
  const numericTotal = parseNumeric(total, 1); // Avoid division by zero

  if (numericTotal === 0) {
    return 0;
  }

  const percentage = (numericValue / numericTotal) * 100;
  return Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0;
};
