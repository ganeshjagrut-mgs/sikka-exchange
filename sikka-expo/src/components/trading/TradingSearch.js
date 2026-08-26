import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import Input from '../ui/Input';

const TradingSearch = memo(({
  onSearchChange,
  searchTerm = '',
}) => {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet } = useBreakpoints();

  // Responsive font sizes
  const getFontSize = () => {
    return isMobile ? 14 : isTablet ? 15 : 16;
  };

  // Responsive spacing
  const getPadding = () => {
    return isMobile ? 16 : isTablet ? 20 : 24;
  };

  // Handle search input change
  const handleSearchChange = (text) => {
    onSearchChange?.(text);
  };

  return (
    <View style={[styles.container, { padding: getPadding() }]}>
      <Input
        placeholder="Search cryptocurrencies..."
        value={searchTerm}
        onChangeText={handleSearchChange}
        leftIcon={<Search width={20} height={20} color={colors.textSecondary} />}
        containerStyle={{ marginBottom: 0 }}
        inputStyle={{
          fontSize: getFontSize(),
          fontFamily: typography.fontFamily?.primary,
        }}
        style={{
          backgroundColor: colors.surface + '40',
          borderColor: colors.border,
        }}
      />
    </View>
  );
});

TradingSearch.displayName = 'TradingSearch';

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
});

export default TradingSearch;
