const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  console.log('Firebase Admin SDK initialized for project:', process.env.FIREBASE_PROJECT_ID);
} else {
  console.warn('Firebase credentials not found - Firebase features will be disabled');
}

module.exports = admin;
