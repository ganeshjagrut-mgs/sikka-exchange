import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { CheckCircle, ArrowRight, RefreshCw } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import useWalletStore from '../../src/store/walletStore';
import GlassContainer from '../../src/components/ui/GlassContainer';

/**
 * DepositSuccess Screen
 *
 * Confirmation screen shown after successful deposit payment
 * Features:
 * - Success message with animation
 * - Order details display
 * - Auto-refresh balance
 * - Navigation back to wallet
 */
export default function DepositSuccess() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fetchBalance } = useWalletStore();

  // Extract order details from URL params (Cashfree redirects with these)
  const orderId = params.order_id;
  const orderAmount = params.order_amount;
  const orderStatus = params.order_status || 'SUCCESS';

  // Refresh balance on mount
  useEffect(() => {
    const refreshBalance = async () => {
      try {
        console.log('🔄 Refreshing balance after deposit...');
        await fetchBalance();
        console.log('✅ Balance refreshed');
      } catch (error) {
        console.error('❌ Failed to refresh balance:', error);
      }
    };

    // Refresh after a short delay to allow backend to process
    const timer = setTimeout(refreshBalance, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleBackToWallet = () => {
    router.push('/(tabs)/wallet');
  };

  const handleRefreshBalance = async () => {
    try {
      await fetchBalance();
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
          <CheckCircle size={80} color={colors.success} strokeWidth={1.5} />
        </View>

        {/* Success Message */}
        <Text style={[
          styles.title,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
          }
        ]}>
          Deposit Successful!
        </Text>

        <Text style={[
          styles.subtitle,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          Your wallet will be credited shortly
        </Text>

        {/* Order Details */}
        {orderId && (
          <GlassContainer style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Order ID
              </Text>
              <Text style={[
                styles.detailValue,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                {orderId}
              </Text>
            </View>

            {orderAmount && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Amount
                </Text>
                <Text style={[
                  styles.detailValue,
                  {
                    color: colors.success,
                    fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                  }
                ]}>
                  ₹{parseFloat(orderAmount).toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Status
              </Text>
              <Text style={[
                styles.detailValue,
                {
                  color: colors.success,
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                {orderStatus}
              </Text>
            </View>
          </GlassContainer>
        )}

        {/* Info Message */}
        <GlassContainer style={styles.infoCard}>
          <Text style={[
            styles.infoText,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
            }
          ]}>
            💡 Your balance will be updated within 2-5 minutes. You'll receive a notification once the funds are credited.
          </Text>
        </GlassContainer>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.background + '40', borderColor: colors.border }]}
            onPress={handleRefreshBalance}
            activeOpacity={0.8}
          >
            <RefreshCw size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[
              styles.refreshButtonText,
              {
                color: colors.primary,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Refresh Balance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackToWallet}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.backButtonText,
              {
                color: '#ffffff',
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              }
            ]}>
              Back to Wallet
            </Text>
            <ArrowRight size={20} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.8,
  },
  detailsCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    width: '100%',
    maxWidth: 400,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  actions: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
