import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, Clock, CheckCircle } from '../components/ui/Icons';
import { useTheme } from '../hooks/useTheme';
import GlassContainer from './ui/GlassContainer';
import { formatIndianCurrency } from '../utils/formatIndianCurrency';

// Animated value for press effects
const useScaleAnimation = () => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.01,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scaleValue, animatePress };
};

const TransactionItem = memo(({ transaction, onPress }) => {
  const { theme } = useTheme();
  const { scaleValue, animatePress } = useScaleAnimation();

  const handlePress = () => {
    animatePress();
    onPress?.(transaction);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    const iconProps = { width: 16, height: 16 };
    
    switch (transaction.status) {
      case 'completed':
        return <CheckCircle {...iconProps} color={theme.colors.success} />;
      case 'pending':
        return <Clock {...iconProps} color={theme.colors.warning} />;
      default:
        return <Clock {...iconProps} color={theme.colors.textSecondary} />;
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'completed':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getTransactionColors = () => {
    switch (transaction.type) {
      case 'buy':
        return {
          backgroundColor: `${theme.colors.success}20`, // 20% opacity
          iconColor: theme.colors.success,
        };
      case 'sell':
        return {
          backgroundColor: `${theme.colors.error}20`, // 20% opacity
          iconColor: theme.colors.error,
        };
      case 'transfer':
        return {
          backgroundColor: `${theme.colors.primary}20`, // 20% opacity
          iconColor: theme.colors.primary,
        };
      default:
        return {
          backgroundColor: `${theme.colors.textSecondary}20`, // 20% opacity
          iconColor: theme.colors.textSecondary,
        };
    }
  };

  const transactionColors = getTransactionColors();

  const formatTotal = (total) => {
    return formatIndianCurrency(total);
  };

  const styles = StyleSheet.create({
    transactionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing[4],
      marginVertical: theme.spacing[1],
    },
    transactionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    transactionRight: {
      alignItems: 'flex-end',
    },
    typeIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing[3],
      backgroundColor: transactionColors.backgroundColor,
    },
    transactionDetails: {
      // Natural width based on content
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    transactionTitle: {
      color: theme.colors.text,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'capitalize',
    },
    statusIcon: {
      marginLeft: theme.spacing[2],
    },
    transactionSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.normal,
      marginTop: theme.spacing[1],
    },
    transactionTotal: {
      color: theme.colors.text,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing[1],
    },
    transactionStatus: {
      color: getStatusColor(),
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      textTransform: 'capitalize',
    },
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={{
          opacity: 1,
          transform: [{ translateY: 0 }],
        }}
      >
        <GlassContainer
          style={{
            backgroundColor: theme.colors.glassBackground + '30',
          }}
        >
          <View style={styles.transactionContainer}>
            {/* Left Side - Transaction Info */}
            <View style={styles.transactionLeft}>
              {/* Transaction Type Icon */}
              <View style={styles.typeIcon}>
                {transaction.type === 'buy' && (
                  <ArrowUpRight width={20} height={20} color={transactionColors.iconColor} />
                )}
                {transaction.type === 'sell' && (
                  <ArrowDownRight width={20} height={20} color={transactionColors.iconColor} />
                )}
                {transaction.type === 'transfer' && (
                  <ArrowRightLeft width={20} height={20} color={transactionColors.iconColor} />
                )}
                {!['buy', 'sell', 'transfer'].includes(transaction.type) && (
                  <ArrowUpRight width={20} height={20} color={transactionColors.iconColor} />
                )}
              </View>
              
              {/* Transaction Details */}
              <View style={styles.transactionDetails}>
                <View style={styles.titleRow}>
                  <Text style={styles.transactionTitle}>
                    {transaction.type} {transaction.symbol}
                  </Text>
                  <View style={styles.statusIcon}>
                    {getStatusIcon()}
                  </View>
                </View>
                
                <Text 
                  style={styles.transactionSubtitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {transaction.amount} {transaction.symbol} • {formatDate(transaction.date)}
                </Text>
              </View>
            </View>
            
            {/* Right Side - Amount and Status */}
            <View style={styles.transactionRight}>
              <Text style={styles.transactionTotal}>
                {formatTotal(transaction.total)}
              </Text>
              
              <Text style={styles.transactionStatus}>
                {transaction.status ? transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) : ''}
              </Text>
            </View>
          </View>
        </GlassContainer>
      </TouchableOpacity>
    </Animated.View>
  );
});

TransactionItem.displayName = 'TransactionItem';

export default TransactionItem;