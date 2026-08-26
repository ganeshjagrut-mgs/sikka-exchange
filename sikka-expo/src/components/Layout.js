import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useBreakpoints } from '../hooks/useBreakpoints';
import { Menu } from 'lucide-react-native';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoints();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['left', 'right', 'top']}
    >
      <View style={styles.content}>
        {children}
      </View>

      {/* Floating Burger Menu Button - Mobile/Tablet only */}
      {!isDesktop && (
        <TouchableOpacity
          style={[
            styles.floatingMenuButton,
            {
              top: insets.top + 4,
              backgroundColor: isDark ? 'rgba(24, 26, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }
          ]}
          onPress={() => setSidebarOpen(true)}
        >
          <Menu size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
      )}

      {/* Sidebar Drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    // paddingBottom set dynamically inline to account for safe area
  },
  floatingMenuButton: {
    position: 'absolute',
    left: 16,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 1000,
  },
});

export default Layout;