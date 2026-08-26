import React, { memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Plus, Minus, DollarSign, ArrowRightLeft } from '../ui/Icons';
import GlassContainer from '../ui/GlassContainer';
import Button from '../ui/Button';

const QuickActions = memo(() => {
  const { theme } = useTheme();

  const handleBuyCrypto = () => {
    console.log('Navigate to Buy Crypto screen');
  };

  const handleSellCrypto = () => {
    console.log('Navigate to Sell Crypto screen');
  };

  const handleAddFunds = () => {
    console.log('Navigate to Add Funds screen');
  };

  const handleWithdraw = () => {
    console.log('Navigate to Withdraw screen');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      marginVertical: theme.spacing[2],
    },
    card: {
      padding: theme.spacing[6],
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.primary,
      marginBottom: theme.spacing[6],
    },
    actionsContainer: {
      gap: theme.spacing[4],
    },
    marketStatus: {
      marginTop: theme.spacing[8],
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}20`,
      backgroundColor: `${theme.colors.primary}10`,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    pulseIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.primary,
      marginRight: theme.spacing[2],
    },
    statusTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      fontFamily: theme.typography.fontFamily.primary,
    },
    statusMessage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.primary,
      lineHeight: theme.typography.fontSize.sm * 1.4,
    },
  });

  // Pulse animation for market status
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <GlassContainer style={styles.card}>
        <Text style={styles.title}>Quick Actions</Text>
        
        <View style={styles.actionsContainer}>
          <Button
            variant="primary"
            size="medium"
            onPress={handleBuyCrypto}
            icon={<Plus />}
            style={{ width: '100%' }}
          >
            Buy Crypto
          </Button>
          
          <Button
            variant="secondary"
            size="medium"
            onPress={handleSellCrypto}
            icon={<Minus />}
            style={{ width: '100%' }}
          >
            Sell Crypto
          </Button>
          
          <Button
            variant="secondary"
            size="medium"
            onPress={handleAddFunds}
            icon={<DollarSign />}
            style={{ width: '100%' }}
          >
            Add Funds
          </Button>
          
          <Button
            variant="secondary"
            size="medium"
            onPress={handleWithdraw}
            icon={<ArrowRightLeft />}
            style={{ width: '100%' }}
          >
            Withdraw
          </Button>
        </View>

        {/* Market Status */}
        <View style={styles.marketStatus}>
          <View style={styles.statusHeader}>
            <Animated.View 
              style={[
                styles.pulseIndicator, 
                { 
                  opacity: pulseAnim,
                  transform: [{ scale: pulseAnim }]
                }
              ]} 
            />
            <Text style={styles.statusTitle}>Market Status</Text>
          </View>
          <Text style={styles.statusMessage}>
            Markets are open and active. Perfect time to trade!
          </Text>
        </View>
      </GlassContainer>
    </View>
  );
});

QuickActions.displayName = 'QuickActions';

export default QuickActions;