const express = require('express');
const router = express.Router();
const adminService = require('../../services/admin.service');

/**
 * POST /api/admin/auth/login
 * Admin login
 *
 * Body: {
 *   username: string,
 *   password: string
 * }
 * Returns: { success, data: { token, admin: {...} } }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Username and password are required'
      });
    }

    // Authenticate admin
    const admin = await adminService.authenticateAdmin(username, password);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = adminService.generateAdminJWT(admin.id);

    console.log('Admin login successful:', {
      adminId: admin.id,
      username: admin.username
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      error: 'LOGIN_FAILED',
      message: 'Failed to login'
    });
  }
});

module.exports = router;
