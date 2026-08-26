const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireAuth } = require('../middleware/auth');
const dbService = require('../services/db.service');
const kucoin = require('../services/kucoin.service');
const { validateKYCPhotos, mapKYCDataToKuCoin } = require('../utils/validation');

/**
 * POST /api/kyc/submit
 * Submit KYC documents and create KuCoin sub-account
 *
 * Flow:
 * 1. Validate user hasn't already submitted KYC
 * 2. Create KuCoin sub-account
 * 3. Submit KYC to KuCoin
 * 4. Create API keys for sub-account
 * 5. Store all data in database
 */
router.post('/submit', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const {
      firstName, lastName, dateOfBirth, address, idType, idNumber, country,
      expireDate, facePhoto, frontPhoto, backendPhoto
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !address || !idType || !idNumber || !country) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, dateOfBirth, address, idType, idNumber, country'
      });
    }

    // Check if user has already submitted KYC (do this EARLY before expensive validations)
    if (req.user.kyc_status !== 'not_submitted') {
      return res.status(400).json({
        success: false,
        error: `KYC already submitted. Current status: ${req.user.kyc_status}. Use /api/kyc/resubmit for rejected submissions.`
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dateOfBirth format. Use YYYY-MM-DD'
      });
    }

    // Validate expireDate is present and in future
    if (!expireDate) {
      return res.status(400).json({
        success: false,
        error: 'expireDate is required (YYYY-MM-DD format)'
      });
    }

    const expireDateObj = new Date(expireDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    if (isNaN(expireDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expireDate format. Use YYYY-MM-DD'
      });
    }

    if (expireDateObj <= today) {
      return res.status(400).json({
        success: false,
        error: 'expireDate must be a future date'
      });
    }

    // Validate ID type
    const validIdTypes = ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'AADHAR', 'AADHAAR'];
    if (!validIdTypes.includes(idType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid idType. Must be one of: ${validIdTypes.join(', ')}`
      });
    }

    // Validate photos based on ID type (most expensive validation - do LAST)
    console.log('KYC Photo Validation Debug:', {
      idType,
      hasFacePhoto: !!facePhoto,
      hasFrontPhoto: !!frontPhoto,
      hasBackendPhoto: !!backendPhoto,
      facePhotoFormat: facePhoto ? (facePhoto.startsWith('data:') ? 'data-uri' : 'raw-base64') : null,
      frontPhotoFormat: frontPhoto ? (frontPhoto.startsWith('data:') ? 'data-uri' : 'raw-base64') : null,
      backendPhotoFormat: backendPhoto ? (backendPhoto.startsWith('data:') ? 'data-uri' : 'raw-base64') : null,
      facePhotoLength: facePhoto ? facePhoto.length : 0,
      frontPhotoLength: frontPhoto ? frontPhoto.length : 0,
      backendPhotoLength: backendPhoto ? backendPhoto.length : 0
    });
    console.log('📸 KYC Photo Details:', {
      facePhoto: {
        length: facePhoto?.length,
        format: facePhoto?.substring(0, 50),
        sizeKB: Math.round((facePhoto?.length || 0) * 0.75 / 1024)
      },
      frontPhoto: {
        length: frontPhoto?.length,
        format: frontPhoto?.substring(0, 50),
        sizeKB: Math.round((frontPhoto?.length || 0) * 0.75 / 1024)
      },
      backendPhoto: {
        length: backendPhoto?.length,
        format: backendPhoto?.substring(0, 50),
        sizeKB: Math.round((backendPhoto?.length || 0) * 0.75 / 1024)
      }
    });

    const photoValidation = validateKYCPhotos({ facePhoto, frontPhoto, backendPhoto }, idType);
    if (!photoValidation.valid) {
      console.log('Photo validation failed:', photoValidation.errors);
      return res.status(400).json({
        success: false,
        error: 'Photo validation failed',
        details: photoValidation.errors
      });
    }

    // Start database transaction
    const result = await dbService.transaction(async (client) => {
      // Step 1: Create KuCoin sub-account
      const fullName = `${firstName} ${lastName}`;
      // KuCoin requires account name to be 6-24 characters
      // Format: sikka_XXXX_YYYYYYY (6 + 4 + 1 + 8 = 19 chars)
      const userIdShort = req.user.id.substring(0, 4);
      const timestampShort = Date.now().toString().slice(-8); // Last 8 digits of timestamp
      const subAccountName = `sikka_${userIdShort}_${timestampShort}`;

      const subAccountResponse = await kucoin.createSubAccount(subAccountName);

      if (subAccountResponse.code !== '200000') {
        throw new Error(`KuCoin sub-account creation failed: ${subAccountResponse.msg}`);
      }

      const kucoinUid = subAccountResponse.data.uid;

      // Step 2: Submit KYC to KuCoin (map to KuCoin format)
      const kycData = mapKYCDataToKuCoin({
        firstName,
        lastName,
        country,
        idNumber,
        idType,
        dateOfBirth,
        expireDate,
        facePhoto,
        frontPhoto,
        backendPhoto
      });

      const kycResponse = await kucoin.submitKYC(kucoinUid, kycData);

      if (kycResponse.code !== '200000') {
        throw new Error(`KuCoin KYC submission failed: ${kycResponse.msg}`);
      }

      // Step 3: Create API keys for sub-account
      // Generate a secure passphrase for the API key (7-32 chars, no spaces)
      const apiPassphrase = `sikka${Date.now()}${Math.random().toString(36).substring(2, 10)}`.substring(0, 32);
      const apiKeysResponse = await kucoin.createSubAccountAPIKeys(
        kucoinUid, // uid - MUST be first parameter
        apiPassphrase, // passphrase
        `Sikka_${req.user.id.substring(0, 8)}`, // label (4-24 chars max)
        ['General', 'Spot'], // permissions - MUST be array (NO 'Transfer' - not supported)
        ['35.200.154.218'] // ipWhitelist - REQUIRED: GCP server IP
      );

      if (apiKeysResponse.code !== '200000') {
        throw new Error(`KuCoin API key creation failed: ${apiKeysResponse.msg}`);
      }

      // CRITICAL: KuCoin returns 'secretKey' not 'apiSecret', and doesn't return passphrase
      const { apiKey, secretKey } = apiKeysResponse.data;

      // Validate required fields exist (they should only be shown once at creation)
      if (!apiKey || !secretKey) {
        throw new Error(`KuCoin API key response missing required fields. Got: apiKey=${!!apiKey}, secretKey=${!!secretKey}`);
      }

      // Step 4: Insert KYC submission record (with photos)
      const kycSubmission = await client.query(
        `INSERT INTO kyc_submissions
         (user_id, full_name, date_of_birth, address, id_type, id_number, country, expire_date,
          face_photo, front_photo, backend_photo, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, submitted_at`,
        [req.user.id, fullName, dateOfBirth, address, idType, idNumber, country, expireDate,
         facePhoto, frontPhoto, backendPhoto, 'pending']
      );

      // Step 5: Update users table with KuCoin data
      // Use secretKey (from KuCoin response) and apiPassphrase (that we generated)
      await client.query(
        `UPDATE users
         SET kucoin_sub_account_uid = $1,
             kucoin_api_key = $2,
             kucoin_api_secret = $3,
             kucoin_api_passphrase = $4,
             kyc_status = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [kucoinUid, apiKey, secretKey, apiPassphrase, 'pending', req.user.id]
      );

      return kycSubmission.rows[0];
    });

    res.json({
      success: true,
      data: {
        submissionId: result.id,
        status: 'pending',
        submittedAt: result.submitted_at,
        message: 'KYC submitted successfully. You will be notified once it is reviewed.'
      }
    });

  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit KYC. Please try again later.'
    });
  }
});

/**
 * GET /api/kyc/status
 * Get current KYC status for the authenticated user
 */
router.get('/status', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    // Get latest KYC submission from database
    const kycSubmission = await dbService.queryOne(
      `SELECT id, full_name, date_of_birth, address, id_type, id_number,
              status, rejection_reason, submitted_at, reviewed_at
       FROM kyc_submissions
       WHERE user_id = $1
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    // If no submission found
    if (!kycSubmission) {
      return res.json({
        success: true,
        data: {
          status: 'not_submitted',
          message: 'No KYC submission found. Please submit your KYC documents.'
        }
      });
    }

    // If user has KuCoin UID, optionally fetch latest status from KuCoin
    let kucoinStatus = null;
    if (req.user.kucoin_sub_account_uid) {
      try {
        const kucoinResponse = await kucoin.getKYCStatus(req.user.kucoin_sub_account_uid);
        if (kucoinResponse.code === '200000' && Array.isArray(kucoinResponse.data) && kucoinResponse.data.length > 0) {
          // API returns array: [{clientUid, status, rejectReason}]
          // Status values: NONE, PROCESS, PASS, REJECT
          kucoinStatus = kucoinResponse.data[0].status;

          // Update database if KuCoin status changed (PASS = approved)
          if (kucoinStatus === 'PASS' && kycSubmission.status === 'pending') {
            await dbService.query(
              `UPDATE kyc_submissions
               SET status = $1, reviewed_at = NOW()
               WHERE id = $2`,
              ['approved', kycSubmission.id]
            );
            await dbService.query(
              `UPDATE users SET kyc_status = $1, updated_at = NOW() WHERE id = $2`,
              ['approved', req.user.id]
            );
            kycSubmission.status = 'approved';

            // AUTO-FIX: Check if API credentials are broken (NULL secret) and regenerate
            if (!req.user.kucoin_api_secret) {
              console.log(`[KYC] User ${req.user.email} has broken API credentials - regenerating...`);
              try {
                // Delete existing API key if present
                if (req.user.kucoin_api_key) {
                  await kucoin.deleteSubAccountAPIKey(
                    req.user.kucoin_sub_account_uid,
                    req.user.kucoin_api_key
                  );
                }

                // Generate new passphrase and create new API key
                const newPassphrase = `sikka${Date.now()}${Math.random().toString(36).substring(2, 10)}`.substring(0, 32);
                const apiKeysResponse = await kucoin.createSubAccountAPIKeys(
                  req.user.kucoin_sub_account_uid,
                  newPassphrase,
                  `Sikka_${req.user.id.substring(0, 8)}`,
                  ['General', 'Spot'],
                  ['35.200.154.218']
                );

                if (apiKeysResponse.code === '200000') {
                  const { apiKey, secretKey } = apiKeysResponse.data;
                  if (apiKey && secretKey) {
                    await dbService.query(
                      `UPDATE users
                       SET kucoin_api_key = $1, kucoin_api_secret = $2, kucoin_api_passphrase = $3, updated_at = NOW()
                       WHERE id = $4`,
                      [apiKey, secretKey, newPassphrase, req.user.id]
                    );
                    console.log(`[KYC] Successfully regenerated API credentials for ${req.user.email}`);
                  }
                }
              } catch (credError) {
                console.error(`[KYC] Failed to regenerate credentials for ${req.user.email}:`, credError.message);
                // Don't fail the status check - user can retry or we can fix manually
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch KuCoin status:', error);
        // Continue with database status if KuCoin fetch fails
      }
    }

    res.json({
      success: true,
      data: {
        status: kycSubmission.status,
        submissionId: kycSubmission.id,
        submittedAt: kycSubmission.submitted_at,
        reviewedAt: kycSubmission.reviewed_at,
        rejectionReason: kycSubmission.rejection_reason,
        kucoinStatus: kucoinStatus,
        details: {
          fullName: kycSubmission.full_name,
          dateOfBirth: kycSubmission.date_of_birth,
          address: kycSubmission.address,
          idType: kycSubmission.id_type,
          idNumber: kycSubmission.id_number
        }
      }
    });

  } catch (error) {
    console.error('KYC status fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KYC status. Please try again later.'
    });
  }
});

/**
 * POST /api/kyc/resubmit
 * Resubmit KYC after rejection
 *
 * This endpoint allows users to update their KYC information and resubmit
 * after their previous submission was rejected.
 */
router.post('/resubmit', verifyFirebaseToken, requireAuth, async (req, res) => {
  try {
    const {
      firstName, lastName, dateOfBirth, address, idType, idNumber, country,
      expireDate, facePhoto, frontPhoto, backendPhoto
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !address || !idType || !idNumber || !country) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, dateOfBirth, address, idType, idNumber, country'
      });
    }

    // Check if user's KYC was rejected (do this FIRST before expensive validations)
    if (req.user.kyc_status !== 'rejected') {
      return res.status(400).json({
        success: false,
        error: `Cannot resubmit. Current KYC status: ${req.user.kyc_status}. Resubmission is only allowed for rejected KYC.`
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dateOfBirth format. Use YYYY-MM-DD'
      });
    }

    // Validate expireDate is present and in future
    if (!expireDate) {
      return res.status(400).json({
        success: false,
        error: 'expireDate is required (YYYY-MM-DD format)'
      });
    }

    const expireDateObj = new Date(expireDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(expireDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expireDate format. Use YYYY-MM-DD'
      });
    }

    if (expireDateObj <= today) {
      return res.status(400).json({
        success: false,
        error: 'expireDate must be a future date'
      });
    }

    // Validate ID type
    const validIdTypes = ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'AADHAR', 'AADHAAR'];
    if (!validIdTypes.includes(idType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid idType. Must be one of: ${validIdTypes.join(', ')}`
      });
    }

    // Validate photos based on ID type (most expensive validation - do LAST)
    console.log('KYC Photo Validation Debug (resubmit):', {
      idType,
      hasFacePhoto: !!facePhoto,
      hasFrontPhoto: !!frontPhoto,
      hasBackendPhoto: !!backendPhoto,
      facePhotoFormat: facePhoto ? (facePhoto.startsWith('data:') ? 'data-uri' : 'raw-base64') : null,
      frontPhotoFormat: frontPhoto ? (frontPhoto.startsWith('data:') ? 'data-uri' : 'raw-base64') : null,
      backendPhotoFormat: backendPhoto ? (backendPhoto.startsWith('data:') ? 'data-uri' : 'raw-base64') : null,
      facePhotoLength: facePhoto ? facePhoto.length : 0,
      frontPhotoLength: frontPhoto ? frontPhoto.length : 0,
      backendPhotoLength: backendPhoto ? backendPhoto.length : 0
    });

    const photoValidation = validateKYCPhotos({ facePhoto, frontPhoto, backendPhoto }, idType);
    if (!photoValidation.valid) {
      console.log('Photo validation failed:', photoValidation.errors);
      return res.status(400).json({
        success: false,
        error: 'Photo validation failed',
        details: photoValidation.errors
      });
    }

    // Start database transaction
    const result = await dbService.transaction(async (client) => {
      // Resubmit KYC to KuCoin (using existing sub-account UID)
      const fullName = `${firstName} ${lastName}`;
      const kycData = mapKYCDataToKuCoin({
        firstName,
        lastName,
        country,
        idNumber,
        idType,
        dateOfBirth,
        expireDate,
        facePhoto,
        frontPhoto,
        backendPhoto
      });

      const kycResponse = await kucoin.submitKYC(req.user.kucoin_sub_account_uid, kycData);

      if (kycResponse.code !== '200000') {
        throw new Error(`KuCoin KYC resubmission failed: ${kycResponse.msg}`);
      }

      // Insert new KYC submission record (with photos)
      const kycSubmission = await client.query(
        `INSERT INTO kyc_submissions
         (user_id, full_name, date_of_birth, address, id_type, id_number, country, expire_date,
          face_photo, front_photo, backend_photo, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, submitted_at`,
        [req.user.id, fullName, dateOfBirth, address, idType, idNumber, country, expireDate,
         facePhoto, frontPhoto, backendPhoto, 'pending']
      );

      // Update users table status to pending
      await client.query(
        `UPDATE users
         SET kyc_status = $1, updated_at = NOW()
         WHERE id = $2`,
        ['pending', req.user.id]
      );

      return kycSubmission.rows[0];
    });

    res.json({
      success: true,
      data: {
        submissionId: result.id,
        status: 'pending',
        submittedAt: result.submitted_at,
        message: 'KYC resubmitted successfully. You will be notified once it is reviewed.'
      }
    });

  } catch (error) {
    console.error('KYC resubmission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resubmit KYC. Please try again later.'
    });
  }
});

module.exports = router;
