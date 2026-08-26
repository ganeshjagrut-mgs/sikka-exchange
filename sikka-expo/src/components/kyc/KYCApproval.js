import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react-native';
import useKYCStore from '../../store/kycStore';

/**
 * KYCApproval Component
 *
 * Component for approval workflow with status polling
 * Automatically polls for status updates when in pending state
 *
 * @param {Object} props
 * @param {Function} props.onApprove - Approval callback
 * @param {Function} props.onReject - Rejection callback
 * @param {Function} props.onComplete - Completion callback (when approved)
 * @param {Object} props.style - Additional styles
 */
const KYCApproval = ({ onApprove, onReject, onComplete, style }) => {
  const { colors } = useTheme();
  const { kycStatus, loading, fetchKYCStatus } = useKYCStore();
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Poll for status updates when pending
  useEffect(() => {
    if (!kycStatus || kycStatus.status !== 'pending' || !autoRefreshEnabled) {
      return;
    }

    const pollInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing KYC status...');
      fetchKYCStatus();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
      setAutoRefreshEnabled(false);
    };
    // CRITICAL: Only depend on status and autoRefresh flag, not fetchKYCStatus function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kycStatus?.status, autoRefreshEnabled]);

  // Manual refresh
  const handleRefresh = async () => {
    setAutoRefreshEnabled(false);
    try {
      await fetchKYCStatus();
    } catch (error) {
      console.error('Error refreshing KYC status:', error);
    } finally {
      setAutoRefreshEnabled(true);
    }
  };

  // Check if KYC is approved
  const isApproved = kycStatus?.status === 'approved';
  const isPending = kycStatus?.status === 'pending';
  const isRejected = kycStatus?.status === 'rejected';

  if (!kycStatus) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading KYC status...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, style]}>
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View
          style={[
            styles.statusIcon,
            {
              backgroundColor:
                isApproved
                  ? colors.success + '20'
                  : isPending
                  ? '#f59e0b20'
                  : isRejected
                  ? colors.error + '20'
                  : colors.surfaceVariant,
            },
          ]}
        >
          {isApproved ? (
            <CheckCircle size={32} color={colors.success} />
          ) : isPending ? (
            <Clock size={32} color="#f59e0b" />
          ) : isRejected ? (
            <AlertCircle size={32} color={colors.error} />
          ) : (
            <AlertCircle size={32} color={colors.textSecondary} />
          )}
        </View>

        <View style={styles.statusTextContainer}>
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {isApproved
              ? 'KYC Approved'
              : isPending
              ? 'KYC Under Review'
              : isRejected
              ? 'KYC Rejected'
              : 'KYC Not Submitted'}
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
            {isApproved
              ? 'User can start trading'
              : isPending
              ? 'Awaiting admin review'
              : isRejected
              ? 'Please resubmit with correct documents'
              : 'KYC submission required'}
          </Text>
        </View>

        {/* Auto-refresh Toggle */}
        {isPending && (
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={loading}
            style={styles.refreshButton}
          >
            <RefreshCw
              size={20}
              color={loading ? colors.textSecondary : colors.primary}
              style={loading && styles.spinning}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Approval Actions */}
      {(isPending || isRejected) && (onApprove || onReject) && (
        <View style={styles.actionsContainer}>
          {onApprove && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => onApprove(kycStatus)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionButtonText, { color: colors.background }]}>
                Approve
              </Text>
            </TouchableOpacity>
          )}

          {onReject && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={() => onReject(kycStatus)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionButtonText, { color: colors.background }]}>
                Reject
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Completion Action */}
      {isApproved && onComplete && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={onComplete}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionButtonText, { color: colors.background }]}>
            Continue
          </Text>
        </TouchableOpacity>
      )}

      {/* KYC Details */}
      {kycStatus.fullName && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Applicant:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {kycStatus.fullName}
            </Text>
          </View>

          {kycStatus.submittedAt && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Submitted:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {new Date(kycStatus.submittedAt).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          {kycStatus.rejectionReason && (
            <View style={styles.rejectionContainer}>
              <Text style={[styles.rejectionLabel, { color: colors.error }]}>
                Rejection Reason:
              </Text>
              <Text style={[styles.rejectionText, { color: colors.text }]}>
                {kycStatus.rejectionReason}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Auto-refresh Indicator */}
      {isPending && autoRefreshEnabled && (
        <View style={styles.autoRefreshContainer}>
          <Clock size={12} color={colors.textSecondary} />
          <Text style={[styles.autoRefreshText, { color: colors.textSecondary }]}>
            Auto-refreshing every 30 seconds
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
  },
  refreshButton: {
    padding: 8,
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  rejectionContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  rejectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
  },
  autoRefreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  autoRefreshText: {
    fontSize: 12,
  },
});

export default KYCApproval;
