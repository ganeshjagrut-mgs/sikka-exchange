import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRouter } from 'expo-router';
import { CheckCircle, XCircle, Clock, AlertCircle, FileText, LogOut } from 'lucide-react-native';
import Button from './Button';
import useKYCStore from '../../store/kycStore';
import { useStore } from '../../store/useStore';

/**
 * KYCModal Component
 *
 * Modal that blocks all user functionality until KYC is completed
 * Shows current KYC status and provides actions to complete/resubmit
 */
export default function KYCModal({ visible, onClose }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { kycStatus, loading, fetchKYCStatus } = useKYCStore();
  const { logout } = useStore();

  // Fetch KYC status when modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchKYCStatus();
    }
    // CRITICAL: Only depend on visible, not fetchKYCStatus (prevents infinite loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Get status display info
  const getStatusInfo = () => {
    if (!kycStatus) {
      return {
        icon: AlertCircle,
        iconColor: colors.textSecondary,
        title: 'KYC Required',
        subtitle: 'Complete your KYC verification to access all features',
        showCompleteButton: true,
      };
    }

    switch (kycStatus.status) {
      case 'pending':
        return {
          icon: Clock,
          iconColor: '#f59e0b',
          title: 'KYC Under Review',
          subtitle: 'Your KYC application is being reviewed. This usually takes 24-48 hours.',
          showRefreshButton: true,
        };

      case 'approved':
        return null; // No modal for approved users

      case 'rejected':
        return {
          icon: XCircle,
          iconColor: '#ef4444',
          title: 'KYC Verification Failed',
          subtitle: kycStatus.rejectionReason || 'Please resubmit your documents with correct information.',
          showResubmitButton: true,
        };

      default:
        return {
          icon: AlertCircle,
          iconColor: colors.textSecondary,
          title: 'KYC Required',
          subtitle: 'Complete your KYC verification to access all features',
          showCompleteButton: true,
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Don't show modal if KYC is approved or not visible
  if (!visible || (kycStatus && kycStatus.status === 'approved')) {
    return null;
  }

  // Auto-redirect approved users
  if (kycStatus && kycStatus.status === 'approved') {
    router.replace('/(tabs)/');
    return null;
  }

  const StatusIcon = statusInfo.icon;

  // Navigate based on KYC status
  const handleCompleteKYC = () => {
    const navigationPath = useKYCStore.getState().getNavigationPath();
    router.push(navigationPath);
    // Don't close modal immediately - let navigation happen first
    // Modal will auto-close when KYC status changes
  };

  // Refresh status
  const handleRefresh = () => {
    fetchKYCStatus();
  };

  // Handle logout
  const handleLogout = async () => {
    // Use native confirm for web, Alert.alert for native
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out from your Sikkaa Exchange account?');
      if (!confirmed) return;

      try {
        await logout();
        // Navigation will be handled automatically by AuthWrapper
      } catch (error) {
        window.alert('Failed to sign out. Please try again.');
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out from your Sikkaa Exchange account?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
                // Navigation will be handled automatically by AuthWrapper
              } catch (error) {
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              }
            }
          }
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {}} // Prevent closing by back button
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Verification Required
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Complete KYC to access trading features
            </Text>
          </View>

          {/* Status Card */}
          <View style={[styles.statusCard, { backgroundColor: colors.background }]}>
            <View style={styles.iconContainer}>
              <StatusIcon size={48} color={statusInfo.iconColor} />
            </View>

            <Text style={[styles.statusTitle, { color: colors.text }]}>
              {statusInfo.title}
            </Text>

            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
              {statusInfo.subtitle}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {statusInfo.showCompleteButton && (
              <Button
                variant="primary"
                onPress={handleCompleteKYC}
                style={styles.actionButton}
              >
                Complete KYC
              </Button>
            )}

            {statusInfo.showRefreshButton && (
              <Button
                variant="secondary"
                onPress={handleRefresh}
                loading={loading}
                disabled={loading}
                style={styles.actionButton}
              >
                {loading ? 'Refreshing...' : 'Refresh Status'}
              </Button>
            )}

            {statusInfo.showResubmitButton && (
              <Button
                variant="primary"
                onPress={handleCompleteKYC}
                style={styles.actionButton}
              >
                Resubmit KYC
              </Button>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <FileText size={16} color={colors.textSecondary} />
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              KYC verification is mandatory for trading on Sikkaa Exchange
            </Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={16} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={[styles.logoutText, { color: colors.error }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 12,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
  },
});