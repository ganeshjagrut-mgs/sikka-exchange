const firebaseService = require('../services/firebase.service');
const dbService = require('../services/db.service');

/**
 * Middleware to verify Firebase token and attach user to request
 * Extracts token from Authorization header and verifies it
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    // Extract token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify Firebase token
    const firebaseUser = await firebaseService.getUserFromToken(token);

    if (!firebaseUser) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired Firebase token'
      });
    }

    // Check if user exists in our database
    const dbUser = await dbService.findOne('users', { firebase_uid: firebaseUser.uid });

    // Attach both Firebase user and DB user to request
    req.firebaseUser = firebaseUser;
    req.user = dbUser; // May be null for new users (register flow)

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Authentication failed'
    });
  }
}

/**
 * Middleware to require authenticated user
 * Must be used after verifyFirebaseToken
 * Ensures user exists in database
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not registered. Please complete registration first.'
    });
  }

  next();
}

/**
 * Middleware to require KYC verification
 * Must be used after requireAuth
 */
function requireKYC(req, res, next) {
  if (!req.user.kucoin_sub_account_uid) {
    return res.status(403).json({
      success: false,
      error: 'KYC_NOT_SUBMITTED',
      message: 'KYC verification required. Please submit KYC first.'
    });
  }

  if (req.user.kyc_status !== 'approved') {
    return res.status(403).json({
      success: false,
      error: 'KYC_NOT_APPROVED',
      message: `KYC status: ${req.user.kyc_status}. Please wait for approval.`
    });
  }

  next();
}

module.exports = {
  verifyFirebaseToken,
  requireAuth,
  requireKYC
};
