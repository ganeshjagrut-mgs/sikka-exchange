require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function flushFirebase() {
  console.log('🔥 Flushing Firebase users...\n');

  try {
    // Check if Firebase credentials are configured
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.log('⚠️  Firebase not configured (.env missing credentials)');
      console.log('   Skipping Firebase flush...');
      return;
    }

    const admin = require('firebase-admin');

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

    console.log('Fetching all Firebase users...');
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;

    if (users.length === 0) {
      console.log('✅ No Firebase users to delete');
      return;
    }

    console.log(`Found ${users.length} users. Deleting...`);

    // Delete all users
    const deletePromises = users.map(user => admin.auth().deleteUser(user.uid));
    await Promise.all(deletePromises);

    console.log(`✅ Deleted ${users.length} Firebase users successfully!`);
  } catch (error) {
    console.error('❌ Firebase flush failed:', error.message);
    throw error;
  }
}

flushFirebase();
