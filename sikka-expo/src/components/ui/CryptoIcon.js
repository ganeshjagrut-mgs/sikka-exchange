import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { getCryptoMetadata } from '../../constants/cryptoMetadata';

/**
 * CryptoIcon Component
 * Renders a crypto icon from SimpleIcons CDN with fallback to text icon
 *
 * @param {string} symbol - Crypto symbol (e.g., 'BTC', 'ETH', 'BTC-USDT')
 * @param {number} size - Icon size in pixels (default: 40)
 * @param {object} style - Additional container styles
 * @param {string} fallbackIcon - Optional custom fallback icon text
 * @param {string} fallbackColor - Optional custom fallback background color
 */
const CryptoIcon = ({
  symbol,
  size = 40,
  style = {},
  fallbackIcon,
  fallbackColor,
}) => {
  const [imageError, setImageError] = useState(false);

  // Get metadata for this crypto
  const metadata = getCryptoMetadata(symbol);
  const imageUrl = metadata.image;
  const textIcon = fallbackIcon || metadata.icon || (symbol ? symbol.charAt(0) : '?');
  const bgColor = fallbackColor || metadata.color || '#54c255';

  // Should we show image or text fallback?
  const showImage = imageUrl && !imageError;

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size * 0.4,
    backgroundColor: showImage ? 'transparent' : bgColor,
  };

  const textStyle = {
    fontSize: size * 0.45,
  };

  if (showImage) {
    return (
      <View style={[styles.container, styles.svgContainer, containerStyle, style]}>
        <SvgUri
          width={size}
          height={size}
          uri={imageUrl}
          onError={() => setImageError(true)}
        />
      </View>
    );
  }

  // Fallback to text icon
  return (
    <View style={[styles.container, styles.textContainer, containerStyle, style]}>
      <Text style={[styles.iconText, textStyle]}>
        {textIcon}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default CryptoIcon;
