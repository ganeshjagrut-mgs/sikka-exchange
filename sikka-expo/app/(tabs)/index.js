import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Platform, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Wallet, BarChart3, TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, Clock, XCircle, Eye, EyeOff, Star, Building2, ShieldCheck, RefreshCw } from 'lucide-react-native';
import { useBreakpoints } from '../../src/hooks/useBreakpoints';
import { useStore } from '../../src/store/useStore';
import useWalletStore from '../../src/store/walletStore';
import useKYCStore from '../../src/store/kycStore';
import { formatIndianCurrency } from '../../src/utils/formatIndianCurrency';
import { extractBalanceData, parseNumeric } from '../../src/utils/walletData';
import { useRouter } from 'expo-router';
import { getCryptoMetadata } from '../../src/constants/cryptoMetadata';
import CryptoIcon from '../../src/components/ui/CryptoIcon';

// Clean Welcome Header
const WelcomeHeader = ({ user }) => {
  return (
    <View style={dashboardStyles.welcomeSection}>
      <View style={dashboardStyles.welcomeContent}>
        <View>
          <Text style={dashboardStyles.welcomeTitle}>
            Welcome back, {user.name.split(' ')[0]}
          </Text>
          <Text style={dashboardStyles.welcomeSubtitle}>
            Here's what's happening with your crypto portfolio today.
          </Text>
        </View>
      </View>
    </View>
  );
};

const getStatsCardLayoutStyle = ({ isDesktop, isTablet, isMobile }) => {
  if (isMobile) {
    return {
      width: '48%',
      flexBasis: '48%',
      maxWidth: '48%',
      flex: 0,
      marginBottom: 8,
    };
  }

  if (isTablet) {
    return {
      flexBasis: 300,
      maxWidth: 300,
      width: 300,
      flex: 0,
    };
  }

  return {
    flexBasis: 320,
    maxWidth: 320,
    width: 320,
    flex: 0,
  };
};

// Stats Card with responsive sizing and font scaling
const StatsCard = ({ title, value, isPositive, icon: IconComponent, color, onPress, hideValues }) => {
  const { isDesktop, isTablet, isMobile, screenWidth } = useBreakpoints();
  
  // Responsive font scaling
  const getFontSizes = () => {
    if (isDesktop) {
      return { title: 14, value: 32 };
    } else if (isTablet) {
      return { title: 13, value: 28 };
    } else {
      return { title: 12, value: 18 }; // FIXED: Reduced from 24 to 18 to prevent text wrapping on mobile
    }
  };
  
  const fontSizes = getFontSizes();
  const cardLayoutStyle = useMemo(
    () => getStatsCardLayoutStyle({ isDesktop, isTablet, isMobile }),
    [isDesktop, isTablet, isMobile]
  );
  
  // Apply hiding if enabled
  const displayValue = hideValues ? '****' : value;

  const cardContent = (
    <BlurView
      intensity={80}
      tint="dark"
      style={dashboardStyles.statsCard}
    >
      <View style={dashboardStyles.statsCardHeader}>
        <LinearGradient
          colors={color}
          style={dashboardStyles.statsIconContainer}
        >
          <IconComponent size={24} color="#fff" />
        </LinearGradient>
      </View>
      <View>
        <Text style={[dashboardStyles.statsTitle, { fontSize: fontSizes.title }]}>{title}</Text>
        <Text style={[dashboardStyles.statsValue, { fontSize: fontSizes.value }]}>{displayValue}</Text>
      </View>
    </BlurView>
  );

  // Wrap with TouchableOpacity if onPress is provided
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={cardLayoutStyle}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <View style={cardLayoutStyle}>{cardContent}</View>;
};

// Portfolio Item matching original React styling
const PortfolioItem = ({ item }) => {
  // Show total value of user's holdings (quantity × price), NOT price per token
  const totalValue = item.value || 0;
  const pnlPercentage = item.change24h || item.change || 0;

  return (
    <BlurView intensity={30} tint="dark" style={dashboardStyles.portfolioItem}>
      <View style={dashboardStyles.portfolioInfo}>
        <CryptoIcon
          symbol={item.symbol}
          size={40}
          fallbackIcon={item.icon}
          fallbackColor={item.color || '#54c255'}
          style={dashboardStyles.portfolioIcon}
        />
        <View>
          <Text style={dashboardStyles.portfolioSymbol}>{item.name}</Text>
          <Text style={dashboardStyles.portfolioName}>
            {item.amount || '0.00'} {item.symbol}
          </Text>
        </View>
      </View>
      <View style={dashboardStyles.portfolioValues}>
        <Text style={dashboardStyles.portfolioValue}>
          {formatIndianCurrency(totalValue)}
        </Text>
        <Text style={[dashboardStyles.portfolioChange, {
          color: pnlPercentage > 0 ? '#54c255' : '#ef4444'
        }]}>
          {pnlPercentage > 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
        </Text>
      </View>
    </BlurView>
  );
};

const StatsCardSkeleton = () => {
  const { isDesktop, isTablet, isMobile } = useBreakpoints();
  const cardLayoutStyle = useMemo(
    () => getStatsCardLayoutStyle({ isDesktop, isTablet, isMobile }),
    [isDesktop, isTablet, isMobile]
  );

  return (
    <BlurView
      intensity={80}
      tint="dark"
      style={[dashboardStyles.statsCard, cardLayoutStyle]}
    >
      <View style={dashboardStyles.skeletonHeader}>
        <View style={dashboardStyles.skeletonCircle} />
        <View style={dashboardStyles.skeletonBadge} />
      </View>
      <View>
        <View style={[dashboardStyles.skeletonLine, dashboardStyles.skeletonLineShort]} />
        <View style={[dashboardStyles.skeletonLine, dashboardStyles.skeletonLineLong]} />
      </View>
    </BlurView>
  );
};

const PortfolioSkeletonItem = () => (
  <BlurView intensity={30} tint="dark" style={dashboardStyles.portfolioItem}>
    <View style={dashboardStyles.portfolioInfo}>
      <View style={dashboardStyles.skeletonCircleSmall} />
      <View>
        <View style={[dashboardStyles.skeletonLine, dashboardStyles.skeletonPortfolioPrimary]} />
        <View style={[dashboardStyles.skeletonLine, dashboardStyles.skeletonPortfolioSecondary]} />
      </View>
    </View>
    <View style={dashboardStyles.portfolioValues}>
      <View style={[dashboardStyles.skeletonLine, dashboardStyles.skeletonValueLine]} />
      <View style={[dashboardStyles.skeletonLine, dashboardStyles.skeletonChangeLine]} />
    </View>
  </BlurView>
);

export default function DashboardScreen() {
  const { user } = useStore();
  const {
    balance,
    holdings,
    loading: walletLoading,
    balanceLoading,
    holdingsLoading,
    hasFetchedBalance,
    hasFetchedHoldings,
    error: walletError,
    errorCode: walletErrorCode,
    fetchBalance,
    fetchHoldings,
  } = useWalletStore();
  const { kycStatus, hasLoadedOnce: kycHasLoaded, refreshKYCStatus } = useKYCStore();
  const { isDesktop, isTablet, isMobile } = useBreakpoints();
  const router = useRouter();
  const [hideValues, setHideValues] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingKYC, setRefreshingKYC] = useState(false);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchBalance(),
        fetchHoldings(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle KYC status refresh from banner
  const handleRefreshKYCStatus = async () => {
    try {
      setRefreshingKYC(true);
      const result = await refreshKYCStatus();

      if (!result.success) {
        Alert.alert('Refresh Failed', result.error || 'Failed to refresh KYC status');
        return;
      }

      // Show status change notification
      if (result.changed) {
        const messages = {
          'approved': 'Congratulations! Your KYC has been approved. You can now start trading.',
          'rejected': 'Your KYC was rejected. Please resubmit with correct documents.',
          'pending': 'Your KYC status has changed to pending review.'
        };

        const message = messages[result.newStatus] || 'Your KYC status has been updated.';
        Alert.alert('Status Updated', message);
      } else {
        Alert.alert('Up to Date', "Your KYC is still under review. We'll notify you once approved.");
      }
    } catch (error) {
      console.error('Error refreshing KYC:', error);
      Alert.alert('Error', 'Failed to refresh KYC status');
    } finally {
      setRefreshingKYC(false);
    }
  };

  // Check if critical data is still loading
  // For pending/rejected KYC users: Only wait for KYC status
  // For approved KYC users: Wait for both KYC status AND balance
  const isLoadingKYC = !kycStatus;
  const isLoadingBalance = kycStatus?.status === 'approved' && !hasFetchedBalance && !walletError;
  const isLoadingCriticalData = isLoadingKYC || isLoadingBalance;


  // Fetch wallet data on component mount
  // Note: KYC status is already fetched by tab layout, no need to fetch again
  // Only fetch balance/holdings if KYC is approved to avoid 403 errors
  useEffect(() => {
    if (user && user.id && kycStatus?.status === 'approved' && !hasFetchedBalance) {
      const fetchData = async () => {
        try {
          // Parallel execution with Promise.all for faster loading
          await Promise.all([
            fetchBalance(),
            fetchHoldings()
          ]);
        } catch (error) {
          console.error('Error fetching data:', error);
          // Error is already handled in the store methods
        }
      };
      fetchData();
    }
    // CRITICAL: Only depend on primitive values, NOT function references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, kycStatus?.status, hasFetchedBalance]);

  // Show error state if authentication expired
  if (walletError && walletError.includes('Authentication expired')) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: '#ef4444', fontSize: 18, textAlign: 'center' }]}>
          Your session has expired. Please log in again.
        </Text>
      </View>
    );
  }

  // Add null checks for user data to prevent crashes
  console.log('📱 Dashboard: User data:', user);
  console.log('📱 Dashboard: Wallet balance:', balance);

  // Return loading state if user data is not available
  if (!user) {
    console.log('⚠️ Dashboard: User data not available, showing loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // FIXED: Only show loading skeletons for approved users waiting for balance
  // For pending/rejected users, show "KYC Required" immediately (no need to wait for balance)
  const isKYCApproved = kycStatus?.status === 'approved';
  const isBalanceLoading = isKYCApproved && (balanceLoading || (!hasFetchedBalance && !walletError));
  const isHoldingsLoading = isKYCApproved && (holdingsLoading || (!hasFetchedHoldings && !walletError));


  // Calculate financial metrics from wallet store API response
  const balanceData = extractBalanceData(balance);

  // Total Portfolio: Everything you own (crypto + USDT)
  const totalPortfolioValue = balanceData ? parseNumeric(balanceData.totalValueUSD || 0) : 0;

  // Crypto Holdings: Sum of current value from holdings (same data as portfolio list shows)
  const cryptoHoldings = holdings && Array.isArray(holdings)
    ? holdings.reduce((sum, holding) => sum + parseNumeric(holding.currentValueUSD, 0), 0)
    : 0;

  // Available Cash: USDT balance minus locked for withdrawals (from backend)
  const availableCash = balanceData ? parseNumeric(balanceData.available?.usd || 0) : 0;

  // Calculate total P&L from holdings
  const totalPnL = holdings
    ? holdings.reduce((sum, holding) => sum + parseNumeric(holding.pnlUSD, 0), 0)
    : 0;
  const totalPnLPercentage = totalPortfolioValue > 0 ? (totalPnL / (totalPortfolioValue - totalPnL)) * 100 : 0;

  // Check if user can view balances
  const isKYCBlocked = !isKYCApproved || walletErrorCode === 'KYC_REQUIRED';
  const shouldShowBalance = isKYCApproved && !isKYCBlocked;

  const stats = [
    {
      title: 'Total Portfolio',
      value: formatIndianCurrency(isKYCBlocked ? 0 : totalPortfolioValue),
      icon: BarChart3,
      color: ['#2286ff', '#2286ffcc']
    },
    {
      title: 'Available Cash',
      value: formatIndianCurrency(isKYCBlocked ? 0 : availableCash),
      icon: DollarSign,
      color: ['#54c255', '#54c255cc']
    },
    {
      title: 'Total P&L',
      value: formatIndianCurrency(isKYCBlocked ? 0 : totalPnL),
      isPositive: totalPnL >= 0,
      icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
      color: totalPnL >= 0 ? ['#54c255', '#54c255cc'] : ['#ef4444', '#ef4444cc']
    },
    {
      title: 'Crypto Holdings',
      value: formatIndianCurrency(isKYCBlocked ? 0 : cryptoHoldings),
      icon: Wallet,
      color: ['#f7931a', '#f7931acc']
    }
  ];

  // KYC Banner Component - Shows status-specific banner
  const KYCStatusBanner = () => {
    // Don't render until KYC status is loaded
    if (!kycHasLoaded) return null;
    if (!kycStatus) return null;

    const status = kycStatus.status;

    // Approved status - don't show banner (user is already verified)
    if (status === 'approved') {
      return null;
    }

    // Pending status - yellow banner
    if (status === 'pending') {
      return (
        <BlurView
          intensity={80}
          tint="dark"
          style={[
            dashboardStyles.kycBanner,
            {
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              borderColor: 'rgba(251, 191, 36, 0.3)'
            }
          ]}
        >
          <View style={dashboardStyles.kycBannerContent}>
            <Clock size={24} color="#fbbf24" />
            <View style={dashboardStyles.kycBannerText}>
              <Text style={[dashboardStyles.kycBannerTitle, { color: '#fff' }]}>
                KYC Under Review
              </Text>
              <Text style={[dashboardStyles.kycBannerMessage, { color: '#9ca3af' }]}>
                Your KYC documents are being verified. This usually takes 24-48 hours.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={handleRefreshKYCStatus}
                  disabled={refreshingKYC}
                  style={[
                    dashboardStyles.kycBannerButton,
                    {
                      borderColor: '#fbbf24',
                      backgroundColor: refreshingKYC ? 'rgba(251, 191, 36, 0.05)' : 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }
                  ]}
                >
                  {refreshingKYC ? (
                    <ActivityIndicator size="small" color="#fbbf24" />
                  ) : (
                    <RefreshCw size={14} color="#fbbf24" />
                  )}
                  <Text style={[dashboardStyles.kycBannerButtonText, { color: '#fbbf24' }]}>
                    {refreshingKYC ? 'Refreshing...' : 'Refresh Status'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/kyc-status')}
                  style={[
                    dashboardStyles.kycBannerButton,
                    {
                      borderColor: '#9ca3af',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }
                  ]}
                >
                  <Text style={[dashboardStyles.kycBannerButtonText, { color: '#9ca3af' }]}>
                    View Details
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      );
    }

    // Rejected status - red banner with resubmit option
    if (status === 'rejected') {
      return (
        <BlurView
          intensity={80}
          tint="dark"
          style={[
            dashboardStyles.kycBanner,
            {
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)'
            }
          ]}
        >
          <View style={dashboardStyles.kycBannerContent}>
            <XCircle size={24} color="#ef4444" />
            <View style={dashboardStyles.kycBannerText}>
              <Text style={[dashboardStyles.kycBannerTitle, { color: '#fff' }]}>
                KYC Rejected
              </Text>
              <Text style={[dashboardStyles.kycBannerMessage, { color: '#9ca3af' }]}>
                {kycStatus.rejectionReason || 'Your KYC submission was rejected. Please resubmit with correct documents.'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/kyc')}
                style={[dashboardStyles.kycBannerButton, { borderColor: '#ef4444', marginTop: 8 }]}
              >
                <Text style={[dashboardStyles.kycBannerButtonText, { color: '#ef4444' }]}>
                  Resubmit KYC
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      );
    }

    // No KYC submission yet - orange banner
    return (
      <BlurView
        intensity={80}
        tint="dark"
        style={[
          dashboardStyles.kycBanner,
          {
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            borderColor: 'rgba(249, 115, 22, 0.3)'
          }
        ]}
      >
        <View style={dashboardStyles.kycBannerContent}>
          <AlertCircle size={24} color="#f97316" />
          <View style={dashboardStyles.kycBannerText}>
            <Text style={[dashboardStyles.kycBannerTitle, { color: '#fff' }]}>
              Complete Your KYC
            </Text>
            <Text style={[dashboardStyles.kycBannerMessage, { color: '#9ca3af' }]}>
              Complete your KYC verification to start trading on Sikkaa Exchange.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/kyc')}
              style={[dashboardStyles.kycBannerButton, { borderColor: '#f97316', marginTop: 8 }]}
            >
              <Text style={[dashboardStyles.kycBannerButtonText, { color: '#f97316' }]}>
                Start KYC
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    );
  };

  // Show loading state until critical data is ready
  if (isLoadingCriticalData) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Welcome Section */}
          <View style={dashboardStyles.welcomeHeaderContainer}>
            <WelcomeHeader user={user} />
          </View>

          {/* Loading skeleton for KYC banner */}
          <View style={{ height: 100, marginBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#54c255" />
            <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
              Loading your data...
            </Text>
          </View>

          {/* Loading skeletons for stats cards */}
          <View style={[
            styles.statsGrid,
            {
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'space-between' : 'flex-start',
              alignItems: 'stretch',
              ...(isMobile ? {
                gap: 8,
              } : {
                gap: isDesktop ? 20 : 16,
              }),
            }
          ]}>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#54c255"
          />
        }
      >
        {/* KYC Status Banner */}
        <KYCStatusBanner />

        {/* Welcome Section */}
        <WelcomeHeader user={user} />

        {/* Stats Header with Hide Toggle */}
        <View style={dashboardStyles.statsHeader}>
          <Text style={dashboardStyles.statsHeaderTitle}>Your Stats</Text>
          <TouchableOpacity
            onPress={() => setHideValues(!hideValues)}
            activeOpacity={0.7}
            style={dashboardStyles.hideToggle}
          >
            {hideValues ? (
              <EyeOff size={20} color="#9ca3af" />
            ) : (
              <Eye size={20} color="#9ca3af" />
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Grid - 4 cards with responsive layout */}
        <View style={[
          styles.statsGrid,
          {
            // CRITICAL: 2x2 grid layout for mobile using flexDirection: 'row' + flexWrap: 'wrap'
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'space-between' : 'flex-start', // space-between for mobile 2x2, flex-start for desktop
            alignItems: 'stretch', // Make all cards same height
            
            // Platform-specific gap handling
            ...(isMobile ? {
              gap: 8, // Small gap between cards creates the 2x2 layout on mobile
            } : {
              gap: isDesktop ? 20 : 16, // Larger gap on desktop/tablet
            }),
          }
        ]}>
          {isBalanceLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <StatsCardSkeleton key={`stats-skeleton-${index}`} />
              ))
            : stats.map((stat) => (
                <StatsCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  change={stat.change}
                  isPositive={stat.isPositive}
                  icon={stat.icon}
                  color={stat.color}
                  hideValues={hideValues}
                  onPress={
                    (stat.title === 'Total Portfolio' || stat.title === 'Crypto Holdings')
                      ? () => router.push({ pathname: '/wallet', params: { tab: 'assets' } })
                      : undefined
                  }
                />
              ))}
        </View>
        
        {/* Portfolio Holdings - Full Width */}
        <BlurView intensity={80} tint="dark" style={dashboardStyles.portfolioSection}>
          <View style={dashboardStyles.sectionHeader}>
            <Text style={dashboardStyles.sectionTitle}>Your Portfolio</Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/wallet', params: { tab: 'assets' } })}
              accessibilityRole="button"
              accessibilityLabel="View full portfolio"
              activeOpacity={0.7}
            >
              <Text style={dashboardStyles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={dashboardStyles.portfolioList}>
            {isHoldingsLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <PortfolioSkeletonItem key={`portfolio-skeleton-${index}`} />
              ))
            ) : holdings && holdings.length > 0 ? (
              holdings.map(holding => {
                const metadata = getCryptoMetadata(holding.symbol);
                return (
                  <PortfolioItem key={holding.symbol} item={{
                    id: holding.symbol,
                    name: holding.symbol,
                    symbol: holding.symbol,
                    amount: holding.quantity,
                    value: holding.currentValueUSD, // Total value user owns (quantity × price)
                    price: holding.currentPrice, // Price per token (reference only)
                    change24h: holding.pnlPercentage,
                    change: holding.pnlPercentage,
                    icon: metadata.icon,
                    color: metadata.color
                  }} />
                );
              })
            ) : (
              <View style={dashboardStyles.emptyState}>
                <Text style={dashboardStyles.emptyStateText}>
                  {walletError ? 'Unable to load portfolio at the moment.' : 'You have no holdings yet.'}
                </Text>
                {walletError && !walletError.includes('Authentication expired') && (
                  <Text style={dashboardStyles.emptyStateError}>{walletError}</Text>
                )}
              </View>
            )}
          </View>
        </BlurView>

        {/* Trust Badges */}
        <View style={dashboardStyles.trustBadgesContainer}>
          <View style={dashboardStyles.trustBadge}>
            <Star size={20} color="#9ca3af" />
            <Text style={dashboardStyles.trustBadgeValue}>4.4+</Text>
            <Text style={dashboardStyles.trustBadgeLabel}>Rated</Text>
          </View>
          <View style={dashboardStyles.trustBadge}>
            <Building2 size={20} color="#9ca3af" />
            <Text style={dashboardStyles.trustBadgeValue}>FIU</Text>
            <Text style={dashboardStyles.trustBadgeLabel}>Registered</Text>
          </View>
          <View style={dashboardStyles.trustBadge}>
            <ShieldCheck size={20} color="#9ca3af" />
            <Text style={dashboardStyles.trustBadgeValue}>ISO</Text>
            <Text style={dashboardStyles.trustBadgeLabel}>Certified</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Dashboard-specific styles matching original React design exactly
const dashboardStyles = StyleSheet.create({
  // Welcome Section
  welcomeSection: {
    marginBottom: 32,
    marginTop: 12, // Add small top margin to prevent content from touching top edge
    paddingLeft: 50, // Clear the burger menu icon
  },
  welcomeHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#9ca3af',
    lineHeight: 22,
  },
  // Stats Header with hide toggle
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statsHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  hideToggle: {
    padding: 8,
  },
  balanceToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats Cards - base styles (responsive sizing handled in component)
  statsCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsTitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },
  statsValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
  },

  // KYC Banner
  kycBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  kycBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kycBannerText: {
    flex: 1,
  },
  kycBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  kycBannerMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  kycBannerButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  kycBannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Portfolio Section
  portfolioSection: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAllButton: {
    color: '#54c255',
    fontSize: 14,
    fontWeight: '500',
  },
  portfolioList: {
    gap: 16,
  },
  portfolioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  portfolioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  portfolioIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  portfolioIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  portfolioSymbol: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  portfolioName: {
    color: '#9ca3af',
    fontSize: 14,
  },
  portfolioValues: {
    alignItems: 'flex-end',
  },
  portfolioValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  portfolioChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonBadge: {
    width: 60,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    marginBottom: 10,
  },
  skeletonLineShort: {
    width: '40%',
  },
  skeletonLineLong: {
    width: '70%',
  },
  skeletonCircleSmall: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 16,
  },
  skeletonPortfolioPrimary: {
    width: 120,
  },
  skeletonPortfolioSecondary: {
    width: 80,
  },
  skeletonValueLine: {
    width: 100,
  },
  skeletonChangeLine: {
    width: 60,
  },
  emptyState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyStateError: {
    marginTop: 8,
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
  },
  // Trust Badges
  trustBadgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  trustBadge: {
    alignItems: 'center',
  },
  trustBadgeValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  trustBadgeLabel: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181a2a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Platform.select({
      web: 16,
      default: 0,
    }),
    paddingBottom: 100, // Tab bar height (60) + trust badges clearance
  },
  statsGrid: {
    marginBottom: 24,
    // Individual styles applied inline for responsive behavior
  },
  // Loading state styles
  loadingContainer: {
    flex: 1,
    backgroundColor: '#181a2a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
});