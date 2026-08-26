import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Plus, Star, Trash2, X, CreditCard, Building } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import useBankAccountStore from '../../store/bankAccountStore';
import GlassContainer from '../ui/GlassContainer';

/**
 * BankAccounts Component
 *
 * Manage bank accounts for withdrawals
 * Features:
 * - List all bank accounts
 * - Show default badge
 * - Add new account with validation
 * - Edit existing account
 * - Delete account with confirmation
 * - Set as default
 */
const BankAccounts = () => {
  const { colors, typography } = useTheme();
  const { accounts, loading, error, fetchAccounts, addAccount, updateAccount, deleteAccount, setDefault } = useBankAccountStore();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    account_holder_name: '',
    account_number: '',
    account_number_confirm: '',
    ifsc_code: '',
    account_type: 'savings',
    branch: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(null);

  // Fetch accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      await fetchAccounts();
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
      Alert.alert('Error', 'Failed to load bank accounts. Please try again.');
    }
  };

  // Show loading state while fetching accounts
  if (loading) {
    return (
      <View style={styles.container}>
        <GlassContainer style={[styles.contentContainer, { padding: 20 }]}>
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
              Loading bank accounts...
            </Text>
          </View>
        </GlassContainer>
      </View>
    );
  }

  // Validation functions
  const validateIFSC = (ifsc) => {
    // IFSC code: 11 characters, format: ABCD0123456
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifsc.length === 11 && ifscRegex.test(ifsc.toUpperCase());
  };

  const validateAccountNumber = (accNum) => {
    // Account number: 9-18 digits
    const accRegex = /^\d{9,18}$/;
    return accRegex.test(accNum);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.account_holder_name.trim()) {
      errors.account_holder_name = 'Account holder name is required';
    }

    if (!validateAccountNumber(formData.account_number)) {
      errors.account_number = 'Account number must be 9-18 digits';
    }

    if (!validateAccountNumber(formData.account_number_confirm)) {
      errors.account_number_confirm = 'Account number must be 9-18 digits';
    }

    if (formData.account_number !== formData.account_number_confirm) {
      errors.account_number_confirm = 'Account numbers do not match';
    }

    if (!validateIFSC(formData.ifsc_code)) {
      errors.ifsc_code = 'IFSC code must be 11 characters (e.g., SBIN0001234)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form handlers
  const handleOpenForm = () => {
    // Reset form for adding new account
    setFormData({
      account_holder_name: '',
      account_number: '',
      account_number_confirm: '',
      ifsc_code: '',
      account_type: 'savings',
      branch: '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      account_holder_name: '',
      account_number: '',
      account_number_confirm: '',
      ifsc_code: '',
      account_type: 'savings',
      branch: '',
    });
    setFormErrors({});
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Convert IFSC to uppercase and exclude confirm field from submission
      const { account_number_confirm, ...dataToSubmit } = formData;
      const submitData = {
        ...dataToSubmit,
        ifsc_code: formData.ifsc_code.toUpperCase(),
      };

      // Add new account
      await addAccount(submitData);
      Alert.alert('Success', 'Bank account added successfully');

      handleCloseForm();
    } catch (error) {
      console.error('Failed to save bank account:', error);
      Alert.alert('Error', error.message || 'Failed to save bank account. Please try again.');
    }
  };

  // Delete handlers
  const handleDeleteClick = (account) => {
    setDeletingAccount(account);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;

    try {
      await deleteAccount(deletingAccount.id);
      Alert.alert('Success', 'Bank account deleted successfully');
      setShowDeleteConfirm(false);
      setDeletingAccount(null);
    } catch (error) {
      console.error('Failed to delete bank account:', error);
      Alert.alert('Error', error.message || 'Failed to delete bank account. Please try again.');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingAccount(null);
  };

  // Set default handler
  const handleSetDefault = async (accountId) => {
    try {
      await setDefault(accountId);
      Alert.alert('Success', 'Default bank account updated');
    } catch (error) {
      console.error('Failed to set default account:', error);
      Alert.alert('Error', error.message || 'Failed to set default account. Please try again.');
    }
  };

  // Render account card
  const renderAccountCard = (account) => {
    const isDefault = account.is_default;

    return (
      <GlassContainer key={account.id} style={[
        styles.accountCard,
        { borderColor: isDefault ? colors.primary : colors.border }
      ]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.bankIcon, { backgroundColor: colors.primary + '20' }]}>
              <Building size={24} color={colors.primary} />
            </View>
            <View style={styles.bankInfo}>
              <Text style={[
                styles.bankName,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                }
              ]}>
                {account.bank_name}
              </Text>
              <Text style={[
                styles.accountType,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                {account.account_type === 'savings' ? 'Savings Account' : 'Current Account'}
              </Text>
            </View>
          </View>

          {isDefault && (
            <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
              <Star size={14} color="#ffffff" fill="#ffffff" />
              <Text style={[
                styles.defaultText,
                { fontFamily: typography.fontFamily?.primary }
              ]}>
                Default
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={[
              styles.detailLabel,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Account Holder
            </Text>
            <Text style={[
              styles.detailValue,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              {account.account_holder_name}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[
              styles.detailLabel,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Account Number
            </Text>
            <Text style={[
              styles.detailValue,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              {account.account_number.replace(/\d(?=\d{4})/g, '*')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[
              styles.detailLabel,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              IFSC Code
            </Text>
            <Text style={[
              styles.detailValue,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              {account.ifsc_code}
            </Text>
          </View>

          {account.branch && (
            <View style={styles.detailRow}>
              <Text style={[
                styles.detailLabel,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                Branch
              </Text>
              <Text style={[
                styles.detailValue,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                {account.branch}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          {!isDefault && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
              onPress={() => handleSetDefault(account.id)}
              activeOpacity={0.7}
            >
              <Star size={16} color={colors.primary} />
              <Text style={[
                styles.actionText,
                {
                  color: colors.primary,
                  fontFamily: typography.fontFamily?.primary,
                }
              ]}>
                Set Default
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => handleDeleteClick(account)}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[
              styles.actionText,
              {
                color: colors.error,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </GlassContainer>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <CreditCard size={24} color={colors.primary} />
            <Text style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              }
            ]}>
              Bank Accounts
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => handleOpenForm()}
            activeOpacity={0.8}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={[
          styles.description,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
          }
        ]}>
          Manage your bank accounts for INR withdrawals
        </Text>

        {/* Loading State */}
        {loading && accounts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[
              styles.loadingText,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Loading bank accounts...
            </Text>
          </View>
        ) : accounts.length === 0 ? (
          /* Empty State */
          <GlassContainer style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <Building size={48} color={colors.textSecondary} />
            </View>
            <Text style={[
              styles.emptyTitle,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              }
            ]}>
              No Bank Accounts
            </Text>
            <Text style={[
              styles.emptyText,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Add a bank account to enable INR withdrawals
            </Text>
          </GlassContainer>
        ) : (
          /* Account List */
          <View style={styles.accountsList}>
            {accounts.map(renderAccountCard)}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseForm}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[
                styles.modalTitle,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
                }
              ]}>
                Add Bank Account
              </Text>
              <TouchableOpacity onPress={handleCloseForm} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Account Holder Name */}
              <View style={styles.formGroup}>
                <Text style={[
                  styles.label,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  Account Holder Name *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: formErrors.account_holder_name ? colors.error : colors.border,
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}
                  value={formData.account_holder_name}
                  onChangeText={(text) => setFormData({ ...formData, account_holder_name: text })}
                  placeholder="Enter account holder name"
                  placeholderTextColor={colors.textSecondary}
                />
                {formErrors.account_holder_name && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {formErrors.account_holder_name}
                  </Text>
                )}
              </View>

              {/* Account Number (Masked) */}
              <View style={styles.formGroup}>
                <Text style={[
                  styles.label,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  Account Number *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: formErrors.account_number ? colors.error : colors.border,
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}
                  value={formData.account_number}
                  onChangeText={(text) => setFormData({ ...formData, account_number: text.replace(/\D/g, '') })}
                  placeholder="Enter account number (9-18 digits)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  secureTextEntry={true}
                  maxLength={18}
                />
                {formErrors.account_number && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {formErrors.account_number}
                  </Text>
                )}
              </View>

              {/* Confirm Account Number (Visible) */}
              <View style={styles.formGroup}>
                <Text style={[
                  styles.label,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  Confirm Account Number *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: formErrors.account_number_confirm ? colors.error : colors.border,
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}
                  value={formData.account_number_confirm}
                  onChangeText={(text) => setFormData({ ...formData, account_number_confirm: text.replace(/\D/g, '') })}
                  placeholder="Re-enter account number to confirm"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={18}
                />
                {formErrors.account_number_confirm && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {formErrors.account_number_confirm}
                  </Text>
                )}
              </View>

              {/* IFSC Code */}
              <View style={styles.formGroup}>
                <Text style={[
                  styles.label,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  IFSC Code *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: formErrors.ifsc_code ? colors.error : colors.border,
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}
                  value={formData.ifsc_code}
                  onChangeText={(text) => setFormData({ ...formData, ifsc_code: text.toUpperCase() })}
                  placeholder="Enter IFSC code (e.g., SBIN0001234)"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={11}
                  autoCapitalize="characters"
                />
                {formErrors.ifsc_code && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {formErrors.ifsc_code}
                  </Text>
                )}
              </View>

              {/* Account Type */}
              <View style={styles.formGroup}>
                <Text style={[
                  styles.label,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  Account Type
                </Text>
                <View style={styles.accountTypeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: formData.account_type === 'savings' ? colors.primary : colors.surface,
                        borderColor: colors.border,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, account_type: 'savings' })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      {
                        color: formData.account_type === 'savings' ? '#ffffff' : colors.text,
                        fontFamily: typography.fontFamily?.primary,
                      }
                    ]}>
                      Savings
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: formData.account_type === 'current' ? colors.primary : colors.surface,
                        borderColor: colors.border,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, account_type: 'current' })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      {
                        color: formData.account_type === 'current' ? '#ffffff' : colors.text,
                        fontFamily: typography.fontFamily?.primary,
                      }
                    ]}>
                      Current
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Branch (Optional) */}
              <View style={styles.formGroup}>
                <Text style={[
                  styles.label,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  Branch (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}
                  value={formData.branch}
                  onChangeText={(text) => setFormData({ ...formData, branch: text })}
                  placeholder="Enter branch name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surface }]}
                onPress={handleCloseForm}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalButtonText,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmitForm}
                activeOpacity={0.7}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[
                    styles.modalButtonText,
                    {
                      color: '#ffffff',
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}>
                    Add
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancelDelete}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.confirmModal, { backgroundColor: colors.background }]}>
            <Text style={[
              styles.confirmTitle,
              {
                color: colors.text,
                fontFamily: typography.fontFamily?.bold || typography.fontFamily?.primary,
              }
            ]}>
              Delete Bank Account?
            </Text>

            <Text style={[
              styles.confirmText,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily?.primary,
              }
            ]}>
              Are you sure you want to delete this bank account? This action cannot be undone.
            </Text>

            {deletingAccount && (
              <View style={[styles.confirmAccount, { backgroundColor: colors.surface }]}>
                <Text style={[
                  styles.confirmAccountText,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  {deletingAccount.bank_name} - {deletingAccount.account_number.replace(/\d(?=\d{4})/g, '*')}
                </Text>
              </View>
            )}

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.surface }]}
                onPress={handleCancelDelete}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.confirmButtonText,
                  {
                    color: colors.text,
                    fontFamily: typography.fontFamily?.primary,
                  }
                ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.error }]}
                onPress={handleConfirmDelete}
                activeOpacity={0.7}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[
                    styles.confirmButtonText,
                    {
                      color: '#ffffff',
                      fontFamily: typography.fontFamily?.primary,
                    }
                  ]}>
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 12,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    opacity: 0.8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  accountsList: {
    gap: 16,
  },
  accountCard: {
    padding: 20,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    opacity: 0.8,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  defaultText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  formScroll: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  accountTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Delete confirmation modal
  confirmModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  confirmAccount: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  confirmAccountText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BankAccounts;
