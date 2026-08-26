import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../store/useStore';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import {
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react-native';

/**
 * AppSettings Component
 *
 * Simplified app settings and preferences management
 * Features:
 * - Theme toggle (Dark/Light mode)
 * - Account management (Sign out)
 * - Responsive design with professional UI
 */
export default function AppSettings() {
  const { colors, typography } = useTheme();
  const { logout } = useStore();
  const { isMobile, isTablet } = useBreakpoints();


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

  // Setting Item Component
  const SettingItem = ({ 
    icon: IconComponent, 
    title, 
    description, 
    value, 
    onValueChange,
    showSwitch = false,
    showArrow = false,
    onPress,
    iconColor,
    danger = false
  }) => (
    <TouchableOpacity
      style={[
        styles.settingItem, 
        { 
          backgroundColor: colors.surfaceVariant + '30',
          borderLeftColor: iconColor || colors.primary,
          borderLeftWidth: 3,
        }
      ]}
      onPress={onPress}
      activeOpacity={showSwitch ? 1 : 0.7}
      disabled={showSwitch}
    >
      <View style={styles.settingContent}>
        <View style={[
          styles.settingIconContainer, 
          { 
            backgroundColor: (iconColor || colors.primary) + '20' 
          }
        ]}>
          <IconComponent 
            size={24} 
            color={danger ? colors.error : (iconColor || colors.primary)} 
            strokeWidth={1.5} 
          />
        </View>

        <View style={styles.settingInfo}>
          <Text style={[
            styles.settingTitle,
            {
              color: danger ? colors.error : colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize.label,
            }
          ]}>
            {title}
          </Text>
          {description && (
            <Text style={[
              styles.settingDescription,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
                fontSize: responsive.fontSize.body - 2,
              }
            ]}>
              {description}
            </Text>
          )}
        </View>

        {showSwitch ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.border, true: (iconColor || colors.primary) + '40' }}
            thumbColor={value ? (iconColor || colors.primary) : colors.textSecondary}
          />
        ) : showArrow ? (
          <ChevronRight size={20} color={colors.textSecondary} strokeWidth={1.5} />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  // Section Component
  const SettingsSection = ({ title, children, icon: IconComponent, iconColor }) => (
    <GlassContainer style={[styles.section, { padding: responsive.padding, marginBottom: responsive.spacing }]}>
      <View style={styles.sectionHeader}>
        {IconComponent && (
          <IconComponent size={24} color={iconColor || colors.primary} strokeWidth={1.5} />
        )}
        <Text style={[
          styles.sectionTitle,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.title,
            marginLeft: IconComponent ? 8 : 0,
          }
        ]}>
          {title}
        </Text>
      </View>
      {children}
    </GlassContainer>
  );

  // Handle logout
  const handleLogout = async () => {
    // Use native confirm on web, Alert.alert on native
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to sign out from your Sikkaa Exchange account?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out from your Sikkaa Exchange account?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: () => resolve(true)
              }
            ]
          );
        });

    if (confirmed) {
      try {
        await logout();
        // Navigation will be handled automatically by AuthWrapper
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert('Failed to sign out. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to sign out. Please try again.');
        }
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: Platform.OS === 'ios' ? 105 : 85, // Account for bottom tab bar
      }}
    >

      {/* Account Management */}
      <SettingsSection title="Account Management" icon={User} iconColor={colors.warning}>
        <SettingItem
          icon={LogOut}
          title="Sign Out"
          description="Sign out from your Sikkaa Exchange account"
          showArrow={true}
          onPress={handleLogout}
          iconColor={colors.error}
          danger={true}
        />
      </SettingsSection>

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
  },
  settingItem: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    opacity: 0.8,
    lineHeight: 18,
  },
});