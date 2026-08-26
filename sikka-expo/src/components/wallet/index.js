// Wallet Components - Phase 4F: Complete Wallet Interface Implementation
// Architecture for Sikka-Expo Wallet Screen Implementation
//
// This directory contains all wallet-related components:
// - WalletHeader: Balance display with visibility toggle and quick actions (✅)
// - WalletTabs: 5-tab navigation system (Overview, Assets, Transactions, Deposit, Withdraw) (✅)
// - WalletOverview: Portfolio summary with balance cards and P&L display (✅)
// - WalletAssets: Detailed crypto holdings with performance metrics and actions (✅)
// - WalletTransactions: Transaction history with advanced filtering capabilities (✅)
// - DepositINR: Bank details interface for INR deposits with copy functionality (✅)
// - WithdrawINR: Withdrawal form with validation and security confirmations (✅)
// - TransferModal: Internal transfer modal for MAIN ↔ TRADE accounts (✅)
// - TransferHistory: Display history of internal transfers (✅)
//
// Implementation phases:
// ✅ Phase 1: WalletHeader Component (COMPLETE)
// ✅ Phase 2: WalletTabs Component (COMPLETE)
// ✅ Phase 3: WalletOverview Component (COMPLETE)
// ✅ Phase 4: WalletAssets Component (COMPLETE)
// ✅ Phase 5: WalletTransactions Component (COMPLETE)
// ✅ Phase 6: DepositINR Component (COMPLETE)
// ✅ Phase 7: WithdrawINR Component (COMPLETE)
// ✅ Phase 8: TransferModal & TransferHistory Components (COMPLETE)
// ✅ Phase 9: Main Wallet Screen Integration (COMPLETE)

export { default as WalletHeader } from './WalletHeader';
export { default as WalletTabs } from './WalletTabs';
export { default as WalletOverview } from './WalletOverview';
export { default as WalletAssets } from './WalletAssets';
export { default as AccountTransfer } from './AccountTransfer';
export { default as WalletTransactions } from './WalletTransactions';
export { default as DepositINR } from './DepositINR';
export { default as WithdrawINR } from './WithdrawINR';
export { default as WithdrawUSDT } from './WithdrawUSDT';
export { default as TransferModal } from './TransferModal';
export { default as TransferHistory } from './TransferHistory';

// Export default as object for easier importing
const WalletComponents = {
  WalletHeader: require('./WalletHeader').default,
  WalletTabs: require('./WalletTabs').default,
  WalletOverview: require('./WalletOverview').default,
  WalletAssets: require('./WalletAssets').default,
  AccountTransfer: require('./AccountTransfer').default,
  WalletTransactions: require('./WalletTransactions').default,
  DepositINR: require('./DepositINR').default,
  WithdrawINR: require('./WithdrawINR').default,
  WithdrawUSDT: require('./WithdrawUSDT').default,
  TransferModal: require('./TransferModal').default,
  TransferHistory: require('./TransferHistory').default,
};

export default WalletComponents;