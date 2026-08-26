const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbService = require('./db.service');

/**
 * Admin authentication service
 */
const adminService = {
  /**
   * Authenticate admin user
   * @param {string} username - Admin username
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} Admin user object or null
   */
  async authenticateAdmin(username, password) {
    try {
      // Find admin user by username
      const admin = await dbService.findOne('admin_users', { username });

      if (!admin) {
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

      if (!isPasswordValid) {
        return null;
      }

      // Update last login
      await dbService.updateById('admin_users', admin.id, {
        last_login_at: new Date(),
      });

      // Return admin without password hash
      const { password_hash, ...adminData } = admin;
      return adminData;
    } catch (error) {
      console.error('Admin authentication error:', error);
      throw error;
    }
  },

  /**
   * Generate JWT token for admin
   * @param {number} adminId - Admin user ID
   * @returns {string} JWT token
   */
  generateAdminJWT(adminId) {
    const payload = {
      adminId,
      type: 'admin',
    };

    const token = jwt.sign(payload, process.env.ADMIN_JWT_SECRET, {
      expiresIn: '24h',
    });

    return token;
  },

  /**
   * Verify admin JWT token
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload or null
   */
  verifyAdminJWT(token) {
    try {
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      return decoded;
    } catch (error) {
      console.error('Admin JWT verification error:', error);
      return null;
    }
  },

  /**
   * Get admin by ID
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object|null>} Admin user object (without password) or null
   */
  async getAdminById(adminId) {
    try {
      const admin = await dbService.findOne('admin_users', { id: adminId });

      if (!admin) {
        return null;
      }

      // Return admin without password hash
      const { password_hash, ...adminData } = admin;
      return adminData;
    } catch (error) {
      console.error('Get admin by ID error:', error);
      throw error;
    }
  },
};

module.exports = adminService;
