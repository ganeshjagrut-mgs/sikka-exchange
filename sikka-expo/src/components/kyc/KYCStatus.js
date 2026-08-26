import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react-native';

/**
 * KYCStatus Component
 *
 * Reusable component to display KYC verification status
 * Supports all status types: not_submitted, pending, approved, rejected
 *
 * @param {Object} props
 * @param {string} props.status - KYC status ('not_submitted', 'pending', 'approved', 'rejected')
 * @param {string} props.rejectionReason - Reason for rejection (if status is 'rejected')
 * @param {string} props.submittedAt - Submission date (if status is 'pending' or 'approved')
 * @param {boolean} props.canTrade - Whether trading is enabled
 * @param {Object} props.style - Additional styles
 * @param {Function} props.onRefresh - Refresh callback
 * @param {Function} props.onComplete - Complete KYC callback
 */
const KYCStatus = ({
  status = 'not_submitted',
  rejectionReason,
  submittedAt,
  canTrade = false,
  style,
  onRefresh,
  onComplete,
}) => {
  const { colors } = useTheme();

  // Get status display information
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          iconColor: '#f59e0b',
          bgColor: colors.warning + '20',
          title: 'Under Review',
          subtitle: 'Your KYC application is being reviewed. This usually takes 24-48 hours.',
          showRefresh: true,
          showComplete: false,
        };

      case 'approved':
        return {
          icon: CheckCircle,
          iconColor: '#10b981',
          bgColor: colors.success + '20',
          title: canTrade ? 'KYC Verified ✓' : 'KYC Approved',
          subtitle: canTrade
            ? 'Your KYC has been approved and trading is enabled.'
            : 'Your KYC has been approved.',
          showRefresh: false,
          showComplete: false,
        };

      case 'rejected':
        return {
          icon: XCircle,
          iconColor: '#ef4444',
          bgColor: colors.error + '20',
          title: 'Verification Failed',
          subtitle:
            rejectionReason ||
            'Your KYC application was rejected. Please resubmit with correct documents.',
          showRefresh: false,
          showComplete: true,
        };

      case 'not_submitted':
      default:
        return {
          icon: AlertCircle,
          iconColor: colors.textSecondary,
          bgColor: colors.surfaceVariant,
          title: 'KYC Not Started',
          subtitle: 'Complete your KYC to start trading and access all features.',
          showRefresh: false,
          showComplete: true,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, style]}>
      {/* Status Icon and Badge */}
      <View style={[styles.iconContainer, { backgroundColor: statusInfo.bgColor }]}>
        <StatusIcon size={48} color={statusInfo.iconColor} />
      </View>

      {/* Status Title */}
      <Text style={[styles.title, { color: colors.text }]}>{statusInfo.title}</Text>

      {/* Status Subtitle */}
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {statusInfo.subtitle}
      </Text>

      {/* Submission Details */}
      {(status === 'pending' || status === 'approved') && submittedAt && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Submitted:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {new Date(submittedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>
      )}

      {/* Trading Badge */}
      {canTrade && (
        <View style={[styles.tradingBadge, { backgroundColor: colors.success + '20' }]}>
          <CheckCircle size={16} color={colors.success} />
          <Text style={[styles.tradingBadgeText, { color: colors.success }]}>
            Trading Enabled
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {statusInfo.showRefresh && onRefresh && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: colors.background }]}>
              Refresh Status
            </Text>
          </TouchableOpacity>
        )}

        {statusInfo.showComplete && onComplete && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onComplete}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: colors.background }]}>
              Complete KYC
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailsContainer: {
    width: '100%',
    marginTop: 8,
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
  tradingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  tradingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default KYCStatus;
