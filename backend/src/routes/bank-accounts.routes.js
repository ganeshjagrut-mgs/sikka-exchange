const express = require('express');
const router = express.Router();
const dbService = require('../services/db.service');
const { verifyFirebaseToken, requireAuth } = require('../middleware/auth');

/**
 * Helper function to validate IFSC code
 * @param {string} ifsc - IFSC code to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateIFSC(ifsc) {
  if (!ifsc || ifsc.length !== 11) {
    return false;
  }
  // IFSC format: First 4 chars are bank code (letters), 5th char is 0, last 6 chars are branch code (alphanumeric)
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
}

/**
 * Helper function to set an account as default (unsets all others)
 * @param {number} userId - User ID
 * @param {number} accountId - Account ID to set as default
 * @returns {Promise<Object>} - Updated account
 */
async function setDefaultAccount(userId, accountId) {
  return await dbService.transaction(async (client) => {
    // Unset all other defaults for this user
    await client.query(
      'UPDATE bank_accounts SET is_default = false WHERE user_id = $1',
      [userId]
    );

    // Set this account as default
    const result = await client.query(
      'UPDATE bank_accounts SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [accountId, userId]
    );

    return result.rows[0];
  });
}

/**
 * POST /api/bank-accounts
 * Add a new bank account
 *
 * Body: {
 *   account_holder_name: string,
 *   account_number: string,
 *   ifsc_code: string,
 *   bank_name: string,
 *   is_default?: boolean
 * }
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, data: {...} }
 */
router.post('/', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const { account_holder_name, account_number, ifsc_code, bank_name, is_default } = req.body;
    const userId = req.user.id;

    // Validate required fields (bank_name is optional, will be derived from IFSC)
    if (!account_holder_name || !account_number || !ifsc_code) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Required fields: account_holder_name, account_number, ifsc_code'
      });
    }

    // Validate IFSC code
    if (!validateIFSC(ifsc_code)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_IFSC',
        message: 'Invalid IFSC code. Must be 11 characters (e.g., SBIN0001234)'
      });
    }

    // Check for duplicate account (unique: user_id + account_number + ifsc_code)
    const existingAccount = await dbService.findOne('bank_accounts', {
      user_id: userId,
      account_number,
      ifsc_code
    });

    if (existingAccount) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_ACCOUNT',
        message: 'This bank account already exists'
      });
    }

    // Derive bank name from IFSC code if not provided (first 4 characters)
    const finalBankName = bank_name || ifsc_code.substring(0, 4);

    // If is_default is true, unset other defaults in a transaction
    if (is_default === true) {
      const account = await dbService.transaction(async (client) => {
        // Unset all other defaults
        await client.query(
          'UPDATE bank_accounts SET is_default = false WHERE user_id = $1',
          [userId]
        );

        // Insert new account as default
        const result = await client.query(
          `INSERT INTO bank_accounts (user_id, account_holder_name, account_number, ifsc_code, bank_name, is_default)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [userId, account_holder_name, account_number, ifsc_code, finalBankName, true]
        );

        return result.rows[0];
      });

      return res.status(201).json({
        success: true,
        data: account
      });
    } else {
      // Insert normally (not default)
      const account = await dbService.insert('bank_accounts', {
        user_id: userId,
        account_holder_name,
        account_number,
        ifsc_code,
        bank_name: finalBankName,
        is_default: false
      });

      return res.status(201).json({
        success: true,
        data: account
      });
    }
  } catch (error) {
    console.error('Add bank account error:', error);
    return res.status(500).json({
      success: false,
      error: 'ADD_ACCOUNT_FAILED',
      message: 'Failed to add bank account'
    });
  }
});

/**
 * GET /api/bank-accounts
 * List all bank accounts for current user
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, data: [...] }
 */
router.get('/', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const accounts = await dbService.queryMany(
      `SELECT * FROM bank_accounts
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('List bank accounts error:', error);
    return res.status(500).json({
      success: false,
      error: 'LIST_ACCOUNTS_FAILED',
      message: 'Failed to list bank accounts'
    });
  }
});

/**
 * GET /api/bank-accounts/:id
 * Get a specific bank account
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, data: {...} }
 */
router.get('/:id', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;

    const account = await dbService.queryOne(
      'SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'ACCOUNT_NOT_FOUND',
        message: 'Bank account not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Get bank account error:', error);
    return res.status(500).json({
      success: false,
      error: 'GET_ACCOUNT_FAILED',
      message: 'Failed to get bank account'
    });
  }
});

/**
 * PUT /api/bank-accounts/:id
 * Update a bank account
 *
 * Body: {
 *   account_holder_name?: string,
 *   account_number?: string,
 *   ifsc_code?: string,
 *   bank_name?: string,
 *   is_default?: boolean
 * }
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, data: {...} }
 */
router.put('/:id', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;
    const { account_holder_name, account_number, ifsc_code, bank_name, is_default } = req.body;

    // Check if account exists and belongs to user
    const existingAccount = await dbService.queryOne(
      'SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        error: 'ACCOUNT_NOT_FOUND',
        message: 'Bank account not found'
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (account_holder_name !== undefined) updateData.account_holder_name = account_holder_name;
    if (account_number !== undefined) updateData.account_number = account_number;
    if (bank_name !== undefined) updateData.bank_name = bank_name;

    if (ifsc_code !== undefined) {
      // Validate IFSC if provided
      if (!validateIFSC(ifsc_code)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_IFSC',
          message: 'Invalid IFSC code. Must be 11 characters (e.g., SBIN0001234)'
        });
      }
      updateData.ifsc_code = ifsc_code;
    }

    // If is_default is being set to true, use transaction
    if (is_default === true) {
      const account = await setDefaultAccount(userId, accountId);

      // Apply other updates if any
      if (Object.keys(updateData).length > 0) {
        const updatedAccount = await dbService.updateById('bank_accounts', accountId, updateData);
        return res.status(200).json({
          success: true,
          data: updatedAccount
        });
      }

      return res.status(200).json({
        success: true,
        data: account
      });
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0 && is_default !== false) {
      return res.status(400).json({
        success: false,
        error: 'NO_FIELDS_TO_UPDATE',
        message: 'No fields provided to update'
      });
    }

    // Add is_default to update if it's explicitly set to false
    if (is_default === false) {
      updateData.is_default = false;
    }

    // Update account
    const updatedAccount = await dbService.updateById('bank_accounts', accountId, updateData);

    return res.status(200).json({
      success: true,
      data: updatedAccount
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    return res.status(500).json({
      success: false,
      error: 'UPDATE_ACCOUNT_FAILED',
      message: 'Failed to update bank account'
    });
  }
});

/**
 * DELETE /api/bank-accounts/:id
 * Delete a bank account
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, message: "..." }
 */
router.delete('/:id', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;

    // Check if account exists and belongs to user
    const account = await dbService.queryOne(
      'SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'ACCOUNT_NOT_FOUND',
        message: 'Bank account not found'
      });
    }

    // Check for pending withdrawals using this account
    const pendingWithdrawals = await dbService.queryOne(
      'SELECT COUNT(*) as count FROM withdrawals WHERE bank_account_id = $1 AND status = $2',
      [accountId, 'pending']
    );

    if (pendingWithdrawals && parseInt(pendingWithdrawals.count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'PENDING_WITHDRAWALS_EXIST',
        message: 'Cannot delete bank account with pending withdrawals'
      });
    }

    // Delete account
    await dbService.deleteById('bank_accounts', accountId);

    return res.status(200).json({
      success: true,
      message: 'Bank account deleted'
    });
  } catch (error) {
    console.error('Delete bank account error:', error);
    return res.status(500).json({
      success: false,
      error: 'DELETE_ACCOUNT_FAILED',
      message: 'Failed to delete bank account'
    });
  }
});

/**
 * POST /api/bank-accounts/:id/set-default
 * Set a bank account as default
 *
 * Headers: Authorization: Bearer <firebase_token>
 * Returns: { success, data: {...} }
 */
router.post('/:id/set-default', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;

    // Check if account exists and belongs to user
    const account = await dbService.queryOne(
      'SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'ACCOUNT_NOT_FOUND',
        message: 'Bank account not found'
      });
    }

    // Set as default using transaction
    const updatedAccount = await setDefaultAccount(userId, accountId);

    return res.status(200).json({
      success: true,
      data: updatedAccount
    });
  } catch (error) {
    console.error('Set default account error:', error);
    return res.status(500).json({
      success: false,
      error: 'SET_DEFAULT_FAILED',
      message: 'Failed to set default account'
    });
  }
});

module.exports = router;
