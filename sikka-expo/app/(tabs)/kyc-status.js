import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react-native';
import Button from '../../src/components/ui/Button';
import useKYCStore from '../../src/store/kycStore';
import Layout from '../../src/components/Layout';

/**
 * KYC Status Screen
 * Shows current KYC verification status
 */
export default function KYCStatusScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { kycStatus, loading, error, errorType, fetchKYCStatus, clearError } = useKYCStore();

  // Fetch KYC status on mount
  useEffect(() => {
    fetchKYCStatus();
  }, []);

  // Redirect approved users to dashboard
  useEffect(() => {
    if (kycStatus?.status === 'approved') {
      router.replace('/(tabs)/');
    }
  }, [kycStatus, router]);

  // Refresh status with error handling
  const handleRefresh = async () => {
    clearError();
    try {
      await fetchKYCStatus();
    } catch (err) {
      console.error('❌ Error refreshing KYC status:', err);
      // Error is already handled in the store
    }
  };

  // Navigate to KYC form
  const handleCompleteKYC = () => {
    router.push('/(tabs)/kyc');
  };

  // Get status display info
  const getStatusInfo = () => {
    if (!kycStatus) {
      return {
        icon: AlertCircle,
        iconColor: colors.textSecondary,
        title: 'KYC Not Started',
        subtitle: 'Complete your KYC to start trading',
        showCompleteButton: true,
      };
    }

    switch (kycStatus.status) {
      case 'pending':
        return {
          icon: Clock,
          iconColor: '#f59e0b',
          title: 'Under Review',
          subtitle: 'Your KYC application is being reviewed. This usually takes 24-48 hours.',
          showRefreshButton: true,
        };

      case 'approved':
        return {
          icon: CheckCircle,
          iconColor: '#10b981',
          title: 'Verified ✓',
          subtitle: 'Your KYC has been approved. You can now start trading.',
          showDashboardButton: true,
        };

      case 'rejected':
        return {
          icon: XCircle,
          iconColor: '#ef4444',
          title: 'Verification Failed',
          subtitle: kycStatus.rejectionReason || 'Your KYC application was rejected. Please resubmit with correct documents.',
          showResubmitButton: true,
        };

      default:
        return {
          icon: AlertCircle,
          iconColor: colors.textSecondary,
          title: 'Unknown Status',
          subtitle: 'Unable to determine KYC status',
          showRefreshButton: true,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (loading && !kycStatus) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading KYC status...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          <StatusIcon size={64} color={statusInfo.iconColor} />
        </View>

        {/* Status Title */}
        <Text style={[styles.statusTitle, { color: colors.text }]}>
          {statusInfo.title}
        </Text>

        {/* Status Subtitle */}
        <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
          {statusInfo.subtitle}
        </Text>

        {/* Submission Details (if KYC submitted) */}
        {kycStatus && kycStatus.status !== 'not_submitted' && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Submitted:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {new Date(kycStatus.submittedAt || kycStatus.createdAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            {kycStatus.fullName && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Name:
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {kycStatus.fullName}
                </Text>
              </View>
            )}

            {kycStatus.canTrade && (
              <View style={[styles.tradingBadge, { backgroundColor: '#10b981' + '20' }]}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={[styles.tradingBadgeText, { color: '#10b981' }]}>
                  Trading Enabled
                </Text>
              </View>
            )}
          </View>
        )}
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
          <View>
            <Button
              variant="primary"
              onPress={handleCompleteKYC}
              style={styles.actionButton}
            >
              Resubmit KYC
            </Button>
            <Text style={[styles.retryHint, { color: colors.textSecondary }]}>
              Navigate to the KYC form to update and resubmit your information
            </Text>
          </View>
        )}

        {statusInfo.showDashboardButton && (
          <Button
            variant="primary"
            onPress={() => router.replace('/(tabs)/')}
            style={styles.actionButton}
          >
            Go to Dashboard
          </Button>
        )}

        {/* Auto-redirect approved users */}
        {kycStatus?.status === 'approved' && (
          <View style={styles.redirectingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.redirectingText, { color: colors.textSecondary }]}>
              Redirecting to dashboard...
            </Text>
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
          <View style={styles.errorHeader}>
            <Text style={[styles.errorTitle, { color: colors.error }]}>
              Status Check Failed
            </Text>
            {errorType === 'NETWORK' && (
              <Text style={[styles.errorType, { color: colors.error }]}>
                Network Issue
              </Text>
            )}
          </View>
          <Text style={[styles.errorMessage, { color: colors.error }]}>
            {error}
          </Text>
          {errorType === 'NETWORK' && (
            <Text style={[styles.errorSuggestion, { color: colors.textSecondary }]}>
              Check your internet connection and try refreshing.
            </Text>
          )}
        </View>
      )}

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <FileText size={16} color={colors.textSecondary} />
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          KYC verification is mandatory for trading on Sikkaa Exchange
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  statusCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  detailsContainer: {
    width: '100%',
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  tradingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  tradingBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 12,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
  },
  redirectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  redirectingText: {
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorType: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSuggestion: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
