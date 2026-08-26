import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
  Pressable
} from 'react-native';
import { Link, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Home, 
  TrendingUp, 
  Wallet, 
  User, 
  Shield, 
  X,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut
} from './ui/Icons';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../store/useStore';
import GlassContainer from './ui/GlassContainer';
import Badge from './ui/Badge';

const Sidebar = ({ isOpen, onClose }) => {
  const { colors, isDark } = useTheme();
  const { logout, authLoading } = useStore();
  const slideAnim = useRef(new Animated.Value(-256)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pathname = usePathname();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  
  const navItems = [
    { href: '/', icon: Home, label: 'Dashboard', badge: null },
    { href: '/trading', icon: TrendingUp, label: 'Trading', badge: 'Live' },
    { href: '/wallet', icon: Wallet, label: 'Wallet', badge: null },
    { href: '/profile', icon: User, label: 'Profile', badge: null },
  ];

  const secondaryItems = [
    { icon: Settings, label: 'Settings', badge: null },
    { icon: HelpCircle, label: 'Help & Support', badge: null },
  ];

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Animate sidebar in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate sidebar out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -256,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, fadeAnim]);

  const isLargeScreen = screenData.width >= 1024;

  const handleLogout = async () => {
    try {
      console.log('🚪 Sign Out button pressed - starting logout...');
      await logout();
      console.log('✅ Logout completed successfully');
      
      // Close sidebar on mobile after logout
      if (!isLargeScreen) {
        onClose();
      }
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  };

  const NavItemComponent = ({ item, index, isActive }) => {
    const itemAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isOpen) {
        Animated.timing(itemAnim, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      }
    }, [isOpen, index, itemAnim]);

    const handlePress = () => {
      if (!isLargeScreen) {
        onClose();
      }
    };

    return (
      <Animated.View
        style={{
          opacity: itemAnim,
          transform: [
            {
              translateX: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        }}
      >
        <Link href={item.href || '#'} asChild>
          <TouchableOpacity
            onPress={handlePress}
            style={StyleSheet.flatten([
              styles.navItem,
              {
                backgroundColor: isActive 
                  ? `${colors.primary}20` 
                  : 'transparent',
                borderColor: isActive 
                  ? `${colors.primary}30` 
                  : 'transparent',
              },
              isActive && styles.activeNavItem,
            ])}
          >
            {isActive && (
              <LinearGradient
                colors={[`${colors.primary}20`, `${colors.secondary}20`]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
            <item.icon 
              size={20} 
              color={isActive ? colors.primary : colors.textSecondary} 
            />
            <Text 
              style={[
                styles.navItemText,
                { 
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontWeight: isActive ? '600' : '500'
                }
              ]}
            >
              {item.label}
            </Text>
            {item.badge && (
              <Badge 
                variant={item.badge === 'Live' ? 'primary' : item.badge === 'Pro' ? 'warning' : 'primary'}
                style={styles.navItemBadge}
              >
                {item.badge}
              </Badge>
            )}
            {isActive && (
              <View 
                style={[
                  styles.activeIndicator,
                  { backgroundColor: colors.primary }
                ]} 
              />
            )}
          </TouchableOpacity>
        </Link>
      </Animated.View>
    );
  };

  const SecondaryItemComponent = ({ item, index }) => {
    const itemAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isOpen) {
        Animated.timing(itemAnim, {
          toValue: 1,
          duration: 300,
          delay: (navItems.length + index) * 100,
          useNativeDriver: true,
        }).start();
      }
    }, [isOpen, index, itemAnim]);

    return (
      <Animated.View
        style={{
          opacity: itemAnim,
          transform: [
            {
              translateX: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity style={[styles.navItem, styles.secondaryNavItem]}>
          <item.icon size={20} color={colors.textSecondary} />
          <Text style={[styles.navItemText, { color: colors.textSecondary }]}>
            {item.label}
          </Text>
          {item.badge && (
            <Badge variant="warning" style={styles.navItemBadge}>
              {item.badge}
            </Badge>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const SidebarContent = () => (
    <Animated.View
      style={[
        styles.sidebarContainer,
        {
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <GlassContainer
        intensity={95}
        style={[
          styles.sidebarContent,
          { 
            borderRightColor: `${colors.border}80`,
          }
        ]}
      >
        {/* Header - Mobile Only */}
        {!isLargeScreen && (
          <View style={styles.sidebarHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: `${colors.surface}50` }
              ]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sidebarBody}>
          {/* Main Navigation */}
          <View style={styles.navSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              MAIN MENU
            </Text>
            <View style={styles.navItems}>
              {navItems.map((item, index) => (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  index={index}
                  isActive={pathname === item.href}
                />
              ))}
            </View>
          </View>

          {/* Secondary Navigation - COMMENTED OUT
          <View style={styles.navSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              TOOLS
            </Text>
            <View style={styles.navItems}>
              {secondaryItems.map((item, index) => (
                <SecondaryItemComponent
                  key={item.label}
                  item={item}
                  index={index}
                />
              ))}
            </View>
          </View>
          */}
        </View>

        {/* Bottom Section */}
        <View style={styles.sidebarFooter}>
          <View style={[styles.divider, { backgroundColor: `${colors.border}80` }]} />
          
          <TouchableOpacity 
            style={[
              styles.signOutButton,
              { 
                backgroundColor: `${colors.error}10`,
                opacity: authLoading ? 0.6 : 1
              }
            ]}
            onPress={handleLogout}
            disabled={authLoading}
          >
            <LogOut size={20} color={colors.error} />
            <Text style={[styles.signOutText, { color: colors.error }]}>
              {authLoading ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>

          {/* Version Info */}
          <View 
            style={[
              styles.versionInfo,
              { 
                backgroundColor: `${colors.surface}30`,
                borderColor: `${colors.border}30`
              }
            ]}
          >
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              Sikkaa Exchange v2.1.0
            </Text>
            <View 
              style={[
                styles.statusDot,
                { backgroundColor: colors.primary }
              ]} 
            />
          </View>
        </View>
      </GlassContainer>
    </Animated.View>
  );

  if (isLargeScreen) {
    // Desktop - always visible
    return (
      <View style={styles.desktopSidebar}>
        <SidebarContent />
      </View>
    );
  }

  // Mobile - modal overlay
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View 
        style={[
          styles.backdrop,
          { opacity: fadeAnim }
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      
      <SidebarContent />
    </Modal>
  );
};

const styles = StyleSheet.create({
  desktopSidebar: {
    position: 'absolute',
    left: 0,
    top: 64, // header height - aligned with Header.js
    width: 256,
    bottom: 0,
    zIndex: 30,
  },
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 256,
    height: '100%',
    zIndex: 50,
  },
  sidebarContent: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 40,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
  },
  sidebarBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  navSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  navItems: {
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  activeNavItem: {
    borderWidth: 1,
  },
  secondaryNavItem: {
    // Additional styles for secondary items if needed
  },
  navItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  navItemBadge: {
    // Remove marginLeft auto as it causes issues with React Native Web
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  sidebarFooter: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8, // Add top padding to prevent content cramming
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12, // Reduced margin to prevent overlap
  },
  signOutText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4, // Add small top margin for better spacing
  },
  versionText: {
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default Sidebar;