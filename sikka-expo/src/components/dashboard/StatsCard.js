import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';

const StatsCard = memo(({ title, value, change, icon: Icon, color, isPositive = true }) => {
  const { theme } = useTheme();
  const { isMobile, isTablet, screenWidth } = useBreakpoints();

  const formatChange = (change) => {
    if (!change) return '0%';
    const prefix = isPositive ? '+' : '';
    return `${prefix}${change}`;
  };

  // Calculate responsive card width for proper 2x2 grid on mobile/tablet
  const getCardWidth = () => {
    if (isMobile) {
      // Mobile: 2 cards per row with gap and padding
      return (screenWidth - 48) / 2 - 6; // Account for container padding and gap
    } else if (isTablet) {
      // Tablet: 2 cards per row  
      return (screenWidth - 60) / 2 - 12;
    } else {
      // Desktop: Fixed 280px width (existing behavior)
      return 280;
    }
  };

  const styles = StyleSheet.create({
    cardContainer: {
      // FIXED: Use responsive width instead of flex: 1 to enable 2x2 grid
      width: getCardWidth(),
      minWidth: 150,
      marginVertical: theme.spacing[2],
    },
    card: {
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[4],
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    changeBadge: {
      paddingVertical: theme.spacing[1],
      paddingHorizontal: theme.spacing[2],
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
    },
    changeText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    content: {
      gap: theme.spacing[1],
    },
    title: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.primary,
      fontWeight: theme.typography.fontWeight.normal,
    },
    value: {
      fontSize: theme.typography.fontSize['2xl'],
      fontFamily: theme.typography.fontFamily.primary,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
    },
  });

  const gradientColors = color ? [color, `${color}CC`] : [theme.colors.primary, `${theme.colors.primary}CC`];
  const changeColor = isPositive ? theme.colors.success : theme.colors.error;

  return (
    <View style={styles.cardContainer}>
      <GlassContainer style={styles.card}>
        <View style={styles.header}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            {Icon && <Icon width={24} height={24} color="#FFFFFF" />}
          </LinearGradient>
          
          {change && (
            <View style={[
              styles.changeBadge,
              {
                backgroundColor: isPositive 
                  ? `${theme.colors.success}10` 
                  : `${theme.colors.error}10`,
                borderColor: isPositive 
                  ? `${theme.colors.success}20` 
                  : `${theme.colors.error}20`,
              }
            ]}>
              <Text style={[styles.changeText, { color: changeColor }]}>
                {formatChange(change)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.value}>
            {value}
          </Text>
        </View>
      </GlassContainer>
    </View>
  );
});

StatsCard.displayName = 'StatsCard';

export default StatsCard;