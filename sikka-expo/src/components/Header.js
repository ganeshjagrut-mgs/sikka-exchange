import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Menu,
  TrendingUp
} from './ui/Icons';
import { useTheme } from '../theme/ThemeProvider';
import GlassContainer from './ui/GlassContainer';
import { useStore } from '../store/useStore';
import useWalletStore from '../store/walletStore';
import { useBreakpoints } from '../hooks/useBreakpoints';

const Header = ({ onMenuClick }) => {
  const { colors, isDark } = useTheme();
  const { user } = useStore();
  const { balance } = useWalletStore();
  const { isMobile, isDesktop } = useBreakpoints();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Animate header slide down
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const formatBalance = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Get real balance from walletStore (INR total)
  const userBalance = balance ? parseFloat(balance.INR || 0) : 0;

  return (
    <Animated.View 
      style={[
        styles.header,
        { 
          transform: [{ translateY: slideAnim }],
          borderBottomColor: `${colors.border}80`,
        }
      ]}
    >
      <GlassContainer
        intensity={80}
        className="flex-1"
        style={{
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: `${colors.border}80`,
        }}
      >
        <SafeAreaView edges={['top']}>
          <View style={[styles.container, { minHeight: 64 }]}>
            {/* Left Section */}
            <View style={styles.leftSection}>
              {isMobile && (
                <TouchableOpacity 
                  onPress={onMenuClick}
                  style={[
                    styles.iconButton,
                    { 
                      backgroundColor: `${colors.surface}80`,
                      borderColor: `${colors.primary}20`,
                    }
                  ]}
                >
                  <Menu size={24} color={colors.text} />
                </TouchableOpacity>
              )}
              
              {/* Logo - Hidden on mobile, visible on desktop (1024px+) */}
              {isDesktop && (
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={[colors.primary, `${colors.primary}CC`]}
                    style={styles.logoIcon}
                  >
                    <TrendingUp size={20} color="white" />
                  </LinearGradient>
                  <LinearGradient
                    colors={[colors.primary, `${colors.primary}CC`]}
                    style={styles.logoTextGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={[styles.logoText, { color: colors.primary }]}>
                      Sikkaa Exchange
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Right Section */}
            <View style={styles.rightSection}>
              {/* User Profile */}
              <View style={[
                styles.userProfile,
                { borderLeftColor: `${colors.border}80` }
              ]}>
                {isMobile ? null : (
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                      {user?.name || 'Test User'}
                    </Text>
                    <Text style={[styles.userBalance, { color: colors.primary }]}>
                      ₹{formatBalance(userBalance)}
                    </Text>
                  </View>
                )}
                <View style={styles.avatarContainer}>
                  {user.avatar && user.avatar.trim().length > 0 ? (
                    <Image
                      source={{ uri: user.avatar }}
                      style={[
                        styles.avatar,
                        {
                          borderColor: isDark ? `${colors.primary}80` : `${colors.primary}60`
                        }
                      ]}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#54c255', '#2286ff']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.avatar,
                        {
                          borderColor: isDark ? `${colors.primary}80` : `${colors.primary}60`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }
                      ]}
                    >
                      <Text style={styles.avatarInitials}>
                        {getUserInitials(user?.name)}
                      </Text>
                    </LinearGradient>
                  )}
                  <View style={styles.statusIndicator}>
                    <LinearGradient
                      colors={[colors.primary, `${colors.primary}CC`]}
                      style={styles.statusDot}
                    >
                      <View style={styles.statusInner} />
                    </LinearGradient>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </GlassContainer>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoTextGradient: {
    borderRadius: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    position: 'relative',
  },
  themeToggleContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    borderLeftWidth: 1,
  },
  userInfo: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  userBalance: {
    fontSize: 12,
    fontWeight: '600',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 2,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
});

export default Header;