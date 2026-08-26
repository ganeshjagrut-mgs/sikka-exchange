const adminService = require('../services/admin.service');

/**
 * Middleware to verify admin JWT token and attach admin to request
 * Extracts token from Authorization header and verifies it
 */
async function verifyAdminJWT(req, res, next) {
  try {
    // Extract token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No admin token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify admin JWT token
    const decoded = adminService.verifyAdminJWT(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid admin token'
      });
    }

    // Get admin user details
    const admin = await adminService.getAdminById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'ADMIN_NOT_FOUND',
        message: 'Admin user not found'
      });
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Admin authentication failed'
    });
  }
}

module.exports = {
  verifyAdminJWT
};
