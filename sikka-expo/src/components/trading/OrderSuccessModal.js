import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import Button from '../ui/Button';

/**
 * Success modal shown after order execution
 * Shows confirmation message with order details
 */
const OrderSuccessModal = ({ visible, orderType, amount, symbol, usdValue, onClose }) => {
  const { colors, typography } = useTheme();

  const isBuy = orderType === 'buy';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Success icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
            <CheckCircle size={64} color={colors.success} strokeWidth={2} />
          </View>

          {/* Title */}
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
              },
            ]}
          >
            Order Confirmed
          </Text>

          {/* Message */}
          <Text
            style={[
              styles.message,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              },
            ]}
          >
            You have {isBuy ? 'purchased' : 'sold'} {amount} of {symbol}
          </Text>

          {/* Done button */}
          <View style={styles.buttonWrapper}>
            <Button
              variant="primary"
              size="large"
              onPress={onClose}
              style={styles.doneButton}
            >
              Done
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  doneButton: {
    minWidth: 120,
  },
});

export default OrderSuccessModal;
