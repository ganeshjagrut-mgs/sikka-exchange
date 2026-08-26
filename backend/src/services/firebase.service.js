const admin = require('../config/firebase');

/**
 * Firebase authentication service
 */
const firebaseService = {
  /**
   * Verify a Firebase ID token
   * @param {string} firebaseToken - Firebase ID token from client
   * @returns {Promise<Object|null>} Decoded token with user info or null
   */
  async verifyToken(firebaseToken) {
    try {
      // Validate input
      if (!firebaseToken || typeof firebaseToken !== 'string') {
        console.error('Invalid token: Token must be a non-empty string');
        return null;
      }

      // Verify the token with Firebase Admin SDK
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      return decodedToken;
    } catch (error) {
      // Handle specific Firebase errors
      if (error.code === 'auth/id-token-expired') {
        console.error('Token verification failed: Token has expired');
      } else if (error.code === 'auth/argument-error') {
        console.error('Token verification failed: Invalid token format');
      } else if (error.code === 'auth/invalid-id-token') {
        console.error('Token verification failed: Invalid token');
      } else {
        console.error('Token verification error:', error);
      }
      return null;
    }
  },

  /**
   * Extract user information from Firebase token
   * @param {string} firebaseToken - Firebase ID token from client
   * @returns {Promise<Object|null>} User object with uid, email, emailVerified or null
   */
  async getUserFromToken(firebaseToken) {
    try {
      // First verify the token
      const decodedToken = await this.verifyToken(firebaseToken);

      if (!decodedToken) {
        return null;
      }

      // Extract and return user information
      return {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        emailVerified: decodedToken.email_verified || false,
      };
    } catch (error) {
      console.error('Get user from token error:', error);
      return null;
    }
  },

  /**
   * Delete all Firebase users (for development/testing flush script only)
   * WARNING: This will delete ALL users in the Firebase project
   * @returns {Promise<number>} Number of users deleted
   */
  async deleteAllUsers() {
    let deletedCount = 0;

    try {
      console.log('Starting Firebase user deletion...');

      // List all users (paginated if more than 1000)
      let listUsersResult = await admin.auth().listUsers(1000);
      let allUsers = listUsersResult.users;

      // Continue fetching if there are more pages
      while (listUsersResult.pageToken) {
        listUsersResult = await admin.auth().listUsers(1000, listUsersResult.pageToken);
        allUsers = allUsers.concat(listUsersResult.users);
      }

      console.log(`Found ${allUsers.length} users to delete`);

      // Delete each user
      for (const user of allUsers) {
        try {
          await admin.auth().deleteUser(user.uid);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete user ${user.uid}:`, error.message);
        }
      }

      console.log(`Successfully deleted ${deletedCount} Firebase users`);
      return deletedCount;
    } catch (error) {
      console.error('Delete all users error:', error);
      throw error;
    }
  },
};

module.exports = firebaseService;
