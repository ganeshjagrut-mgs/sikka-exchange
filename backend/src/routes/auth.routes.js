const express = require('express');
const router = express.Router();
const dbService = require('../services/db.service');
const { verifyFirebaseToken, requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new user with Firebase authentication
 *
 * Body: { full_name (optional), phone_number (optional), email (optional) }
 * Headers: Authorization: Bearer <firebase_token>
 * Note: email is extracted from Firebase token if not provided
 */
router.post('/register', verifyFirebaseToken, async (req, res) => {
  try {
    const { phone_number, email, full_name } = req.body;

    // Check if user already exists
    if (req.user) {
      return res.status(400).json({
        success: false,
        error: 'USER_ALREADY_EXISTS',
        message: 'User already registered'
      });
    }

    // Check if phone number already used (if provided)
    if (phone_number) {
      const existingUser = await dbService.findOne('users', { phone: phone_number });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'PHONE_ALREADY_REGISTERED',
          message: 'Phone number already registered'
        });
      }
    }

    // Create new user
    const newUser = await dbService.insert('users', {
      firebase_uid: req.firebaseUser.uid,
      phone: phone_number || null,
      email: email || req.firebaseUser.email || null,
      full_name: full_name || null,
      kyc_status: 'not_submitted',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Return user data (exclude sensitive fields)
    return res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        firebase_uid: newUser.firebase_uid,
        phone_number: newUser.phone,
        email: newUser.email,
        full_name: newUser.full_name,
        kyc_status: newUser.kyc_status,
        created_at: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'REGISTRATION_FAILED',
      message: 'Failed to register user'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with Firebase authentication
 * Simply verifies token and returns user profile
 *
 * Headers: Authorization: Bearer <firebase_token>
 */
router.post('/login', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    // User already authenticated by middleware
    return res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        firebase_uid: req.user.firebase_uid,
        phone_number: req.user.phone,
        email: req.user.email,
        full_name: req.user.full_name,
        kyc_status: req.user.kyc_status,
        kucoin_uid: req.user.kucoin_sub_account_uid,
        created_at: req.user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'LOGIN_FAILED',
      message: 'Failed to login'
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 *
 * Headers: Authorization: Bearer <firebase_token>
 */
router.get('/profile', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    // Fetch fresh user data from database
    const user = await dbService.findOne('users', { id: req.user.id });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        phone_number: user.phone,
        email: user.email,
        full_name: user.full_name,
        kyc_status: user.kyc_status,
        kucoin_uid: user.kucoin_sub_account_uid,
        kucoin_api_key: user.kucoin_api_key ? '***' : null, // Masked for security
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'PROFILE_FETCH_FAILED',
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 *
 * Body: { full_name (optional), phone (optional) }
 * Headers: Authorization: Bearer <firebase_token>
 * Note: Email cannot be updated (tied to Firebase auth)
 */
router.put('/profile', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const updateData = { updated_at: new Date() };

    // Validate and add full_name if provided
    if (full_name !== undefined) {
      if (typeof full_name !== 'string' || full_name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_NAME',
          message: 'Full name must be at least 2 characters'
        });
      }
      updateData.full_name = full_name.trim();
    }

    // Validate and add phone if provided
    if (phone !== undefined) {
      // Allow null to clear phone
      if (phone !== null) {
        if (typeof phone !== 'string' || phone.trim().length < 10) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_PHONE',
            message: 'Phone number must be at least 10 characters'
          });
        }

        // Check if phone is already used by another user
        const existingUser = await dbService.findOne('users', { phone: phone.trim() });
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({
            success: false,
            error: 'PHONE_ALREADY_EXISTS',
            message: 'Phone number is already in use'
          });
        }

        updateData.phone = phone.trim();
      } else {
        updateData.phone = null;
      }
    }

    // Update user in database
    const updatedUser = await dbService.updateById('users', req.user.id, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: updatedUser.id,
        firebase_uid: updatedUser.firebase_uid,
        phone_number: updatedUser.phone,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        kyc_status: updatedUser.kyc_status,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({
      success: false,
      error: 'PROFILE_UPDATE_FAILED',
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;
