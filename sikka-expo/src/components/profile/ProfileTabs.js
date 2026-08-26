import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import {
  User,
  Building2,
} from 'lucide-react-native';

/**
 * ProfileTabs Component
 *
 * Tab navigation system for Profile screen with 2 main sections:
 * - Personal: Personal information, account details, and sign out
 * - Banks: Bank account management for withdrawals
 *
 * Features:
 * - Responsive tab layout (horizontal on desktop, scrollable on mobile)
 * - Active tab highlighting with smooth animations
 * - Icon + text labels for better UX
 * - Glass morphism design consistency
 * - Touch-friendly tap targets on mobile
 */
export default function ProfileTabs({ activeTab = 'personal', onTabChange }) {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet } = useBreakpoints();

  // Tab configuration
  const tabs = [
    {
      id: 'personal',
      label: 'Personal',
      icon: User,
      description: 'Profile & Account Info'
    },
    {
      id: 'banks',
      label: 'Banks',
      icon: Building2,
      description: 'Manage Withdrawals'
    },
  ];

  // Responsive styling
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        padding: 12,
        tabPadding: 12,
        fontSize: {
          label: 14,
          description: 11,
        },
        iconSize: 20,
        height: 50,
      };
    } else if (isTablet) {
      return {
        padding: 16,
        tabPadding: 16,
        fontSize: {
          label: 16,
          description: 12,
        },
        iconSize: 22,
        height: 70,
      };
    } else {
      return {
        padding: 20,
        tabPadding: 20,
        fontSize: {
          label: 18,
          description: 14,
        },
        iconSize: 24,
        height: 80,
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Tab Item Component
  const TabItem = ({ tab, isActive, onPress }) => {
    const IconComponent = tab.icon;

    return (
      <TouchableOpacity
        style={[
          styles.tabItem,
          {
            backgroundColor: isActive 
              ? colors.primary + '20' 
              : 'transparent',
            borderColor: isActive 
              ? colors.primary 
              : colors.border + '20',
            paddingHorizontal: responsive.tabPadding,
            height: responsive.height,
            minWidth: isMobile ? 80 : 120,
          }
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          <View style={[
            styles.iconContainer,
            {
              backgroundColor: isActive 
                ? colors.primary + '30' 
                : colors.surfaceVariant + '40',
            }
          ]}>
            <IconComponent 
              size={responsive.iconSize} 
              color={isActive ? colors.primary : colors.textSecondary} 
              strokeWidth={isActive ? 2 : 1.5}
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text 
              style={[
                styles.tabLabel,
                {
                  color: isActive ? colors.primary : colors.text,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.fontSize.label,
                  fontWeight: isActive ? '600' : '500',
                }
              ]}
            >
              {tab.label}
            </Text>
            
            {!isMobile && (
              <Text 
                style={[
                  styles.tabDescription,
                  {
                    color: isActive ? colors.primary + 'CC' : colors.textSecondary,
                    fontFamily: typography.fontFamily?.primary,
                    fontSize: responsive.fontSize.description,
                  }
                ]}
              >
                {tab.description}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <GlassContainer style={[styles.container, { padding: responsive.padding }]}>
      {isMobile ? (
        // Mobile: Horizontal scrollable tabs
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={() => onTabChange?.(tab.id)}
            />
          ))}
        </ScrollView>
      ) : (
        // Desktop/Tablet: Static horizontal layout
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={() => onTabChange?.(tab.id)}
            />
          ))}
        </View>
      )}
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  scrollContainer: {
    paddingHorizontal: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  tabItem: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  tabLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },
  tabDescription: {
    marginTop: 2,
    textAlign: 'center',
    opacity: 0.8,
  },
});