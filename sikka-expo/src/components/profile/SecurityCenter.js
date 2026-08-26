import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { 
  Shield, 
  Lock, 
  Key, 
  Smartphone, 
  Eye,
  EyeOff,
  Clock,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  LogOut,
} from 'lucide-react-native';

/**
 * SecurityCenter Component
 * 
 * Comprehensive security management interface
 * Features:
 * - Two-Factor Authentication (2FA) toggle and setup
 * - Password change with validation
 * - Recent login history with device/location info
 * - Security alerts and notifications
 * - Session management and logout options
 * - Security recommendations
 * - Responsive design with professional UI
 */
export default function SecurityCenter() {
  const { colors, typography } = useTheme();
  const { user, updateUser } = useStore();
  const { isMobile, isTablet } = useBreakpoints();

  // State management
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <View style={styles.container}>
        <GlassContainer style={[styles.contentContainer, { padding: 20 }]}>
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
              Loading security settings...
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
        padding: 16,
        fontSize: {
          title: 20,
          subtitle: 14,
          label: 14,
          body: 14,
        },
        spacing: 12,
      };
    } else if (isTablet) {
      return {
        padding: 20,
        fontSize: {
          title: 24,
          subtitle: 16,
          label: 16,
          body: 16,
        },
        spacing: 16,
      };
    } else {
      return {
        padding: 24,
        fontSize: {
          title: 28,
          subtitle: 18,
          label: 18,
          body: 18,
        },
        spacing: 20,
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Mock login history data
  const loginHistory = [
    {
      id: 1,
      device: 'iPhone 14 Pro',
      location: 'Mumbai, India',
      timestamp: '2024-09-07 10:30 AM',
      status: 'success',
      ip: '192.168.1.1'
    },
    {
      id: 2,
      device: 'Chrome on Windows',
      location: 'Mumbai, India',
      timestamp: '2024-09-06 03:45 PM',
      status: 'success',
      ip: '192.168.1.2'
    },
    {
      id: 3,
      device: 'Safari on MacBook',
      location: 'Delhi, India',
      timestamp: '2024-09-05 11:20 AM',
      status: 'failed',
      ip: '203.45.67.89'
    },
  ];

  // Handle 2FA toggle
  const handle2FAToggle = async (enabled) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTwoFactorEnabled(enabled);
      updateUser({ twoFactorEnabled: enabled });
      
      Alert.alert(
        enabled ? '2FA Enabled' : '2FA Disabled',
        enabled 
          ? 'Two-Factor Authentication has been enabled for your account.' 
          : 'Two-Factor Authentication has been disabled for your account.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update 2FA settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowChangePassword(false);
      
      Alert.alert('Success', 'Your password has been changed successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Security Item Component
  const SecurityItem = ({ 
    icon: IconComponent, 
    title, 
    description, 
    action, 
    status, 
    onPress,
    showSwitch = false,
    switchValue = false,
    onSwitchChange
  }) => (
    <TouchableOpacity
      style={[styles.securityItem, { backgroundColor: colors.surfaceVariant + '30' }]}
      onPress={onPress}
      activeOpacity={showSwitch ? 1 : 0.7}
      disabled={showSwitch}
    >
      <View style={styles.securityItemContent}>
        <View style={[styles.securityIconContainer, { backgroundColor: colors.primary + '20' }]}>
          <IconComponent size={24} color={colors.primary} strokeWidth={1.5} />
        </View>

        <View style={styles.securityItemInfo}>
          <Text style={[
            styles.securityItemTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize.label,
            }
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.securityItemDescription,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize.body - 2,
            }
          ]}>
            {description}
          </Text>
          {status && (
            <View style={styles.statusContainer}>
              {status === 'enabled' ? (
                <CheckCircle size={16} color={colors.success} />
              ) : (
                <XCircle size={16} color={colors.error} />
              )}
              <Text style={[
                styles.statusText,
                {
                  color: status === 'enabled' ? colors.success : colors.error,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.fontSize.body - 4,
                }
              ]}>
                {status === 'enabled' ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          )}
        </View>

        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={switchValue ? colors.primary : colors.textSecondary}
          />
        ) : (
          <View style={styles.securityItemAction}>
            <Text style={[
              styles.actionText,
              {
                color: colors.primary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.body - 2,
              }
            ]}>
              {action}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Login History Item Component
  const LoginHistoryItem = ({ item }) => (
    <View style={[styles.historyItem, { backgroundColor: colors.surfaceVariant + '20' }]}>
      <View style={styles.historyContent}>
        <View style={styles.historyHeader}>
          <View style={styles.historyInfo}>
            <Text style={[
              styles.historyDevice,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.label,
              }
            ]}>
              {item.device}
            </Text>
            <Text style={[
              styles.historyLocation,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.body - 2,
              }
            ]}>
              {item.location} • {item.ip}
            </Text>
            <Text style={[
              styles.historyTime,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.body - 2,
              }
            ]}>
              {item.timestamp}
            </Text>
          </View>

          <View style={[
            styles.historyStatus,
            {
              backgroundColor: item.status === 'success' 
                ? colors.success + '20' 
                : colors.error + '20',
            }
          ]}>
            {item.status === 'success' ? (
              <CheckCircle size={16} color={colors.success} />
            ) : (
              <XCircle size={16} color={colors.error} />
            )}
            <Text style={[
              styles.historyStatusText,
              {
                color: item.status === 'success' ? colors.success : colors.error,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.body - 4,
              }
            ]}>
              {item.status === 'success' ? 'Success' : 'Failed'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Security Settings */}
      <GlassContainer style={[styles.section, { padding: responsive.padding, marginBottom: responsive.spacing }]}>
        <View style={styles.sectionHeader}>
          <Shield size={24} color={colors.primary} strokeWidth={1.5} />
          <Text style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize.title,
            }
          ]}>
            Security Settings
          </Text>
        </View>

        <SecurityItem
          icon={Smartphone}
          title="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
          status={twoFactorEnabled ? 'enabled' : 'disabled'}
          showSwitch={true}
          switchValue={twoFactorEnabled}
          onSwitchChange={handle2FAToggle}
        />

        <SecurityItem
          icon={Key}
          title="Change Password"
          description="Update your account password"
          action="Change"
          onPress={() => setShowChangePassword(!showChangePassword)}
        />

        <SecurityItem
          icon={LogOut}
          title="Sign Out All Devices"
          description="Sign out from all other devices and sessions"
          action="Sign Out"
          onPress={() => Alert.alert('Confirm', 'Sign out from all devices?')}
        />
      </GlassContainer>

      {/* Change Password Form */}
      {showChangePassword && (
        <GlassContainer style={[styles.section, { padding: responsive.padding, marginBottom: responsive.spacing }]}>
          <View style={styles.sectionHeader}>
            <Lock size={24} color={colors.primary} strokeWidth={1.5} />
            <Text style={[
              styles.sectionTitle,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.title,
              }
            ]}>
              Change Password
            </Text>
          </View>

          <View style={styles.passwordForm}>
            <View style={styles.passwordField}>
              <Input
                placeholder="Current Password"
                value={passwordForm.currentPassword}
                onChangeText={(value) => setPasswordForm(prev => ({ ...prev, currentPassword: value }))}
                secureTextEntry={!showPasswords.current}
                style={styles.passwordInput}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? (
                      <EyeOff size={20} color={colors.textSecondary} />
                    ) : (
                      <Eye size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                }
              />
            </View>

            <View style={styles.passwordField}>
              <Input
                placeholder="New Password"
                value={passwordForm.newPassword}
                onChangeText={(value) => setPasswordForm(prev => ({ ...prev, newPassword: value }))}
                secureTextEntry={!showPasswords.new}
                style={styles.passwordInput}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? (
                      <EyeOff size={20} color={colors.textSecondary} />
                    ) : (
                      <Eye size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                }
              />
            </View>

            <View style={styles.passwordField}>
              <Input
                placeholder="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChangeText={(value) => setPasswordForm(prev => ({ ...prev, confirmPassword: value }))}
                secureTextEntry={!showPasswords.confirm}
                style={styles.passwordInput}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff size={20} color={colors.textSecondary} />
                    ) : (
                      <Eye size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                }
              />
            </View>

            <Button
              onPress={handlePasswordChange}
              loading={isLoading}
              style={styles.changePasswordButton}
            >
              Change Password
            </Button>
          </View>
        </GlassContainer>
      )}

      {/* Login History */}
      <GlassContainer style={[styles.section, { padding: responsive.padding }]}>
        <View style={styles.sectionHeader}>
          <Clock size={24} color={colors.primary} strokeWidth={1.5} />
          <Text style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize.title,
            }
          ]}>
            Recent Login Activity
          </Text>
        </View>

        <Text style={[
          styles.sectionDescription,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.body,
          }
        ]}>
          Monitor your account access and security events
        </Text>

        {loginHistory.map((item) => (
          <LoginHistoryItem key={item.id} item={item} />
        ))}
      </GlassContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    borderRadius: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    borderRadius: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionDescription: {
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 20,
  },
  securityItem: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },
  securityItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  securityItemInfo: {
    flex: 1,
  },
  securityItemTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  securityItemDescription: {
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  securityItemAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionText: {
    fontWeight: '500',
  },
  passwordForm: {
    marginTop: 16,
  },
  passwordField: {
    marginBottom: 16,
  },
  passwordInput: {
    borderRadius: 12,
  },
  changePasswordButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  historyItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyInfo: {
    flex: 1,
  },
  historyDevice: {
    fontWeight: '600',
    marginBottom: 4,
  },
  historyLocation: {
    opacity: 0.8,
    marginBottom: 2,
  },
  historyTime: {
    opacity: 0.6,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyStatusText: {
    marginLeft: 4,
    fontWeight: '500',
    fontSize: 12,
  },
});