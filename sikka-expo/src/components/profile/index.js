// Profile Components - Phase 4G: Complete Profile Screen Implementation
// Architecture for Sikka-Expo Profile Screen Implementation
//
// This directory contains all profile-related components:
// - ProfileHeader: User info display with avatar, stats cards, and quick actions (✅)
// - ProfileTabs: 4-tab navigation system (Personal, Security, Settings, Help) (✅)
// - PersonalInfo: Editable personal information form with validation (✅)
// - SecurityCenter: Security management, 2FA, password change, login history (✅)
// - AppSettings: App preferences, theme toggle, notifications, privacy settings (✅)
// - HelpSupport: Comprehensive FAQ, contact support, documentation links (✅)
// - BankAccounts: Bank account management for withdrawals (✅)
//
// Implementation phases:
// ✅ Phase 1: ProfileHeader Component (COMPLETE)
// ✅ Phase 2: ProfileTabs Component (COMPLETE)
// ✅ Phase 3: PersonalInfo Component (COMPLETE)
// ✅ Phase 4: SecurityCenter Component (COMPLETE)
// ✅ Phase 5: AppSettings Component (COMPLETE)
// ✅ Phase 6: HelpSupport Component (COMPLETE)
// ✅ Phase 7: Profile Components Index (COMPLETE)
// ✅ Phase 8: BankAccounts Component (COMPLETE)
// 🔄 Phase 9: Store Integration (NEXT)
// 🔄 Phase 10: Main Profile Screen Integration (NEXT)

export { default as ProfileHeader } from './ProfileHeader';
export { default as ProfileTabs } from './ProfileTabs';
export { default as PersonalInfo } from './PersonalInfo';
export { default as SecurityCenter } from './SecurityCenter';
export { default as AppSettings } from './AppSettings';
export { default as HelpSupport } from './HelpSupport';
export { default as BankAccounts } from './BankAccounts';

// Export default as object for easier importing
const ProfileComponents = {
  ProfileHeader: require('./ProfileHeader').default,
  ProfileTabs: require('./ProfileTabs').default,
  PersonalInfo: require('./PersonalInfo').default,
  SecurityCenter: require('./SecurityCenter').default,
  AppSettings: require('./AppSettings').default,
  HelpSupport: require('./HelpSupport').default,
  BankAccounts: require('./BankAccounts').default,
};

export default ProfileComponents;