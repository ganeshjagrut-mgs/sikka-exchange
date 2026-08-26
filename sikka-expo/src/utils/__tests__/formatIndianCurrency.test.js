/**
 * Unit Tests for Indian Currency Formatting
 */

import { formatIndianCurrency, convertAndFormat, formatIndianCommas } from '../formatIndianCurrency';

describe('formatIndianCurrency', () => {
  describe('Edge Cases', () => {
    test('handles null/undefined', () => {
      expect(formatIndianCurrency(null)).toBe('₹0');
      expect(formatIndianCurrency(undefined)).toBe('₹0');
    });

    test('handles zero', () => {
      expect(formatIndianCurrency(0)).toBe('₹0');
    });

    test('handles very small amounts', () => {
      expect(formatIndianCurrency(0.5)).toBe('₹0.5');
      expect(formatIndianCurrency(0.01)).toBe('₹0.01');
    });

    test('handles negative amounts', () => {
      expect(formatIndianCurrency(-850)).toBe('₹-850');
      expect(formatIndianCurrency(-1500)).toBe('₹-1.5K');
      expect(formatIndianCurrency(-550000)).toBe('₹-5.5L');
    });
  });

  describe('Below 1K', () => {
    test('formats amounts < 1000', () => {
      expect(formatIndianCurrency(1)).toBe('₹1');
      expect(formatIndianCurrency(50)).toBe('₹50');
      expect(formatIndianCurrency(850)).toBe('₹850');
      expect(formatIndianCurrency(999)).toBe('₹999');
      expect(formatIndianCurrency(999.50)).toBe('₹999.5');
    });
  });

  describe('K (Thousand) Range', () => {
    test('formats K values correctly', () => {
      expect(formatIndianCurrency(1000)).toBe('₹1K');
      expect(formatIndianCurrency(1500)).toBe('₹1.5K');
      expect(formatIndianCurrency(15500)).toBe('₹15.5K');
      expect(formatIndianCurrency(25000)).toBe('₹25K');
      expect(formatIndianCurrency(99999)).toBe('₹100K');
    });
  });

  describe('L (Lakh) Range', () => {
    test('formats L values correctly', () => {
      expect(formatIndianCurrency(100000)).toBe('₹1L');
      expect(formatIndianCurrency(150000)).toBe('₹1.5L');
      expect(formatIndianCurrency(247590)).toBe('₹2.48L');
      expect(formatIndianCurrency(550000)).toBe('₹5.5L');
      expect(formatIndianCurrency(5947590)).toBe('₹59.48L');
    });
  });

  describe('Cr (Crore) Range', () => {
    test('formats Cr values correctly', () => {
      expect(formatIndianCurrency(10000000)).toBe('₹1Cr');
      expect(formatIndianCurrency(12345678)).toBe('₹1.23Cr');
      expect(formatIndianCurrency(55000000)).toBe('₹5.5Cr');
    });
  });

  describe('Options', () => {
    test('respects includeSymbol option', () => {
      expect(formatIndianCurrency(1500, { includeSymbol: false })).toBe('1.5K');
      expect(formatIndianCurrency(100000, { includeSymbol: false })).toBe('1L');
    });
  });
});

describe('convertAndFormat', () => {
  const RATE = 88.77;

  test('converts BTC price correctly', () => {
    expect(convertAndFormat(67000, RATE)).toBe('₹59.48L');
  });

  test('converts ETH price correctly', () => {
    expect(convertAndFormat(2500, RATE)).toBe('₹2.22L');
  });

  test('converts SOL price correctly', () => {
    expect(convertAndFormat(150, RATE)).toBe('₹13.32K');
  });

  test('handles invalid exchange rate', () => {
    expect(convertAndFormat(1000, 0)).toBe('₹0');
    expect(convertAndFormat(1000, null)).toBe('₹0');
  });

  test('handles invalid USDT amount', () => {
    expect(convertAndFormat(null, RATE)).toBe('₹0');
    expect(convertAndFormat(undefined, RATE)).toBe('₹0');
  });
});

describe('formatIndianCommas', () => {
  test('formats with Indian comma notation', () => {
    expect(formatIndianCommas(1234567)).toBe('₹12,34,567');
    expect(formatIndianCommas(12345)).toBe('₹12,345');
  });
});
