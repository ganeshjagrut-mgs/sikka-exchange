import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import KYCCheck from '../kyc/KYCCheck';
import useKYCStore from '../../store/kycStore';
import {
  Shield,
  Star,
  Copy,
  RefreshCw,
} from 'lucide-react-native';

/**
 * ProfileHeader Component
 *
 * Displays user profile information, verification status, and account statistics
 * Features:
 * - User avatar with profile picture or placeholder
 * - User name, email, and verification badges
 * - Account statistics (Member Since)
 * - Responsive design for mobile, tablet, and desktop
 * - Glass morphism design consistency
 */
export default function ProfileHeader() {
  const { colors, typography } = useTheme();
  const { user } = useStore();
  const { isMobile, isTablet } = useBreakpoints();
  const { kycStatus, fetchKYCStatus, refreshKYCStatus } = useKYCStore();
  const [kycLoading, setKycLoading] = useState(false);

  // Fetch KYC status on mount
  useEffect(() => {
    const loadData = async () => {
      setKycLoading(true);
      try {
        // Fetch KYC status
        await fetchKYCStatus();
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setKycLoading(false);
      }
    };

    loadData();
    // CRITICAL: Empty dependency array - only run once on mount (prevents infinite loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Copy UID to clipboard
  const copyUIDToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(user?.kucoin_uid || '');
      if (Platform.OS === 'web') {
        window.alert('UID copied to clipboard');
      } else {
        Alert.alert('Copied', 'UID copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy UID:', error);
    }
  };

  // Refresh KYC status with toast notification
  const handleRefreshKYC = async () => {
    try {
      setKycLoading(true);
      const result = await refreshKYCStatus();

      if (!result.success) {
        // Show error alert
        if (Platform.OS === 'web') {
          window.alert(result.error || 'Failed to refresh KYC status');
        } else {
          Alert.alert('Refresh Failed', result.error || 'Failed to refresh KYC status');
        }
        return;
      }

      // Show status change notification
      if (result.changed) {
        const messages = {
          'approved': 'Congratulations! Your KYC has been approved.',
          'rejected': 'Your KYC was rejected. Please resubmit with correct documents.',
          'pending': 'Your KYC status has changed to pending review.'
        };

        const message = messages[result.newStatus] || 'Your KYC status has been updated.';

        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Status Updated', message);
        }
      } else {
        // No change - show status-specific confirmation
        const upToDateMessages = {
          'pending': 'KYC status is up to date (still pending review)',
          'approved': 'KYC status is up to date (approved)',
          'rejected': 'KYC status is up to date (still rejected)'
        };

        const message = upToDateMessages[result.newStatus] || 'KYC status is up to date';

        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Up to Date', message);
        }
      }
    } catch (error) {
      console.error('Error refreshing KYC:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to refresh KYC status');
      } else {
        Alert.alert('Error', 'Failed to refresh KYC status');
      }
    } finally {
      setKycLoading(false);
    }
  };

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <View style={styles.container}>
        <GlassContainer style={[styles.profileSection, { padding: 20 }]}>
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
              Loading profile...
            </Text>
          </View>
        </GlassContainer>
      </View>
    );
  }

  // Responsive styling
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        padding: 12,
        avatarSize: 64,
        fontSize: {
          name: 22,
          email: 14,
          stats: 16,
          statsValue: 20,
        },
      };
    } else if (isTablet) {
      return {
        padding: 20,
        avatarSize: 100,
        fontSize: {
          name: 28,
          email: 16,
          stats: 18,
          statsValue: 24,
        },
      };
    } else {
      return {
        padding: 24,
        avatarSize: 120,
        fontSize: {
          name: 32,
          email: 18,
          stats: 20,
          statsValue: 28,
        },
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Stats Card Component
  const StatsCard = ({ icon: IconComponent, label, value, change, color }) => (
    <GlassContainer style={[styles.statsCard, { minWidth: isMobile ? 120 : 140 }]}>
      <View style={styles.statsHeader}>
        <IconComponent size={24} color={color || colors.primary} strokeWidth={1.5} />
      </View>
      <Text 
        style={[
          styles.statsValue,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.statsValue,
          }
        ]}
      >
        {value}
      </Text>
      <Text 
        style={[
          styles.statsLabel,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.stats - 4,
          }
        ]}
      >
        {label}
      </Text>
      {change && (
        <Text 
          style={[
            styles.statsChange,
            {
              color: change.startsWith('+') ? colors.success : colors.error,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize.stats - 2,
            }
          ]}
        >
          {change}
        </Text>
      )}
    </GlassContainer>
  );

  return (
    <View style={styles.container}>
      {/* User Profile Section */}
      <GlassContainer style={[styles.profileSection, { padding: responsive.padding }]}>
        <View style={isMobile ? styles.profileMobile : styles.profileDesktop}>
          
          {/* Avatar and Basic Info */}
          <View style={styles.profileInfo}>
            <View style={[styles.avatarContainer, { width: responsive.avatarSize, height: responsive.avatarSize }]}>
              {user.avatar && user.avatar.trim().length > 0 ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={[styles.avatar, { width: responsive.avatarSize, height: responsive.avatarSize }]}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#54c255', '#2286ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.avatarPlaceholder, {
                    width: responsive.avatarSize,
                    height: responsive.avatarSize,
                  }]}
                >
                  <Text style={[styles.initialsText, {
                    fontSize: responsive.avatarSize * 0.4,
                    fontFamily: typography.fontFamily?.primary,
                  }]}>
                    {getUserInitials(user.name)}
                  </Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.userDetails}>
              <View style={styles.nameSection}>
                <Text 
                  style={[
                    styles.userName,
                    {
                      color: colors.text,
                      fontFamily: typography.fontFamily?.primary,
                      fontSize: responsive.fontSize.name,
                    }
                  ]}
                >
                  {user.name}
                </Text>
                {user.verified && (
                  <View style={[styles.verificationBadge, { backgroundColor: colors.success }]}>
                    <Shield size={14} color={colors.background} strokeWidth={2} />
                  </View>
                )}
              </View>
              
              <View style={styles.uidContainer}>
                <TouchableOpacity
                  onPress={copyUIDToClipboard}
                  style={styles.uidRow}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.userEmail,
                      {
                        color: colors.textSecondary,
                        fontFamily: typography.fontFamily?.primary,
                        fontSize: responsive.fontSize.email,
                      }
                    ]}
                  >
                    UID: {user?.kucoin_uid || 'N/A'}
                  </Text>
                  <Copy size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>

              <View style={styles.statusTags}>
                {kycLoading ? (
                  <View style={[styles.statusTag, { backgroundColor: colors.surfaceVariant }]}>
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: colors.textSecondary,
                          fontFamily: typography.fontFamily?.primary,
                          fontSize: responsive.fontSize.email - 2,
                        }
                      ]}
                    >
                      Loading KYC...
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <KYCCheck
                      status={kycStatus?.status || 'not_submitted'}
                      compact={false}
                      style={{ marginBottom: 4 }}
                    />
                    {/* Show refresh button only for pending users */}
                    {kycStatus?.status === 'pending' && (
                      <TouchableOpacity
                        onPress={handleRefreshKYC}
                        disabled={kycLoading}
                        style={{
                          padding: 8,
                          backgroundColor: 'rgba(251, 191, 36, 0.1)',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: 'rgba(251, 191, 36, 0.3)',
                        }}
                        activeOpacity={0.7}
                      >
                        <RefreshCw size={16} color="#fbbf24" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {user.twoFactorEnabled && (
                  <View style={[styles.statusTag, { backgroundColor: colors.primary + '20' }]}>
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: colors.primary,
                          fontFamily: typography.fontFamily?.primary,
                          fontSize: responsive.fontSize.email - 2,
                        }
                      ]}
                    >
                      2FA Enabled
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </GlassContainer>

      {/* Account Statistics */}
      <View style={[styles.statsContainer, { marginTop: responsive.padding }]}>
        <StatsCard
          icon={Star}
          label="Member Since"
          value={user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
          color={colors.info}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    borderRadius: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMobile: {
    alignItems: 'center',
  },
  profileDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    borderRadius: 100,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    borderRadius: 100,
  },
  avatarPlaceholder: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userDetails: {
    flex: 1,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  verificationBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userEmail: {
    opacity: 0.8,
  },
  uidContainer: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  uidRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  statsHeader: {
    marginBottom: 8,
  },
  statsValue: {
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  statsLabel: {
    textAlign: 'center',
    opacity: 0.8,
  },
  statsChange: {
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});