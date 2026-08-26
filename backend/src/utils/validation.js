/**
 * Validation utility functions for KYC and other operations
 */

/**
 * Check if a string is valid base64 encoded data
 * Supports both data URI format and raw base64 strings
 * @param {string} str - String to validate
 * @returns {boolean} True if valid base64
 */
function isValidBase64(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }

  try {
    // Check if it's a data URI format (data:image/png;base64,...)
    if (str.startsWith('data:')) {
      const matches = str.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/);
      if (!matches) {
        return false;
      }
      // Validate the base64 part after the comma
      const base64Data = matches[2];
      return isValidBase64Raw(base64Data);
    }

    // Otherwise validate as raw base64
    return isValidBase64Raw(str);
  } catch (error) {
    return false;
  }
}

/**
 * Validate raw base64 string (without data URI prefix)
 * @param {string} str - Base64 string
 * @returns {boolean} True if valid
 */
function isValidBase64Raw(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Base64 regex pattern
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  // Must match pattern and length must be multiple of 4
  if (!base64Regex.test(str) || str.length % 4 !== 0) {
    return false;
  }

  // Try to decode to verify it's valid
  try {
    Buffer.from(str, 'base64');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the size in bytes of a base64 encoded string
 * Handles both data URI format and raw base64
 * @param {string} base64String - Base64 encoded string
 * @returns {number} Size in bytes
 */
function getBase64Size(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    return 0;
  }

  let base64Data = base64String;

  // If it's a data URI, extract the base64 part
  if (base64String.startsWith('data:')) {
    const matches = base64String.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/);
    if (matches && matches[2]) {
      base64Data = matches[2];
    }
  }

  // Calculate size: base64 encoding increases size by ~33%
  // Formula: (base64Length * 3) / 4
  // Remove padding characters (=) from calculation
  const paddingCount = (base64Data.match(/=/g) || []).length;
  const sizeInBytes = (base64Data.length * 3) / 4 - paddingCount;

  return Math.floor(sizeInBytes);
}

/**
 * Validate that a base64 photo is under the size limit
 * @param {string} base64String - Base64 encoded photo
 * @param {number} maxSizeMB - Maximum size in megabytes (default: 10)
 * @returns {object} { valid: boolean, sizeMB: number, message: string }
 */
function validatePhotoSize(base64String, maxSizeMB = 10) {
  if (!base64String) {
    return {
      valid: false,
      sizeMB: 0,
      message: 'Photo data is required'
    };
  }

  const sizeBytes = getBase64Size(base64String);
  const sizeMB = sizeBytes / (1024 * 1024);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (sizeBytes > maxSizeBytes) {
    return {
      valid: false,
      sizeMB: sizeMB.toFixed(2),
      message: `Photo size (${sizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
    };
  }

  return {
    valid: true,
    sizeMB: sizeMB.toFixed(2),
    message: 'Photo size is valid'
  };
}

/**
 * Validate all photos for KYC submission based on ID type
 * @param {object} photos - Object containing facePhoto, frontPhoto, backendPhoto
 * @param {string} idType - ID type (PASSPORT, NATIONAL_ID, DRIVERS_LICENSE, AADHAAR)
 * @returns {object} { valid: boolean, errors: array }
 */
function validateKYCPhotos(photos, idType) {
  console.log('validateKYCPhotos called with:', {
    idType,
    hasFacePhoto: !!photos.facePhoto,
    hasFrontPhoto: !!photos.frontPhoto,
    hasBackendPhoto: !!photos.backendPhoto,
    facePhotoLength: photos.facePhoto ? photos.facePhoto.length : 0,
    frontPhotoLength: photos.frontPhoto ? photos.frontPhoto.length : 0,
    backendPhotoLength: photos.backendPhoto ? photos.backendPhoto.length : 0
  });

  const errors = [];
  const { facePhoto, frontPhoto, backendPhoto } = photos;

  // facePhoto is always required
  if (!facePhoto) {
    console.log('validateKYCPhotos: facePhoto is missing');
    errors.push('facePhoto is required for all KYC submissions');
  } else {
    console.log('validateKYCPhotos: validating facePhoto');
    if (!isValidBase64(facePhoto)) {
      console.log('validateKYCPhotos: facePhoto failed base64 validation');
      errors.push('facePhoto must be valid base64 encoded image data');
    }
    const sizeCheck = validatePhotoSize(facePhoto);
    if (!sizeCheck.valid) {
      console.log('validateKYCPhotos: facePhoto failed size validation:', sizeCheck);
      errors.push(`facePhoto: ${sizeCheck.message}`);
    }
  }

  // Photo requirements based on ID type
  console.log('validateKYCPhotos: checking ID type requirements for:', idType);
  switch (idType) {
    case 'PASSPORT':
      console.log('validateKYCPhotos: PASSPORT - facePhoto required, front/backend optional');
      // facePhoto required, frontPhoto optional, backendPhoto optional
      if (frontPhoto) {
        console.log('validateKYCPhotos: validating frontPhoto for PASSPORT');
        if (!isValidBase64(frontPhoto)) {
          console.log('validateKYCPhotos: frontPhoto failed base64 validation');
          errors.push('frontPhoto must be valid base64 encoded image data');
        }
        const sizeCheck = validatePhotoSize(frontPhoto);
        if (!sizeCheck.valid) {
          console.log('validateKYCPhotos: frontPhoto failed size validation:', sizeCheck);
          errors.push(`frontPhoto: ${sizeCheck.message}`);
        }
      }
      if (backendPhoto) {
        console.log('validateKYCPhotos: validating backendPhoto for PASSPORT');
        if (!isValidBase64(backendPhoto)) {
          console.log('validateKYCPhotos: backendPhoto failed base64 validation');
          errors.push('backendPhoto must be valid base64 encoded image data');
        }
        const sizeCheck = validatePhotoSize(backendPhoto);
        if (!sizeCheck.valid) {
          console.log('validateKYCPhotos: backendPhoto failed size validation:', sizeCheck);
          errors.push(`backendPhoto: ${sizeCheck.message}`);
        }
      }
      break;

    case 'NATIONAL_ID':
    case 'AADHAR':  // Single 'A' variant
    case 'AADHAAR': // Double 'A' variant
      console.log('validateKYCPhotos: NATIONAL_ID/AADHAAR - all photos required');
      // facePhoto, frontPhoto, and backendPhoto all required
      if (!frontPhoto) {
        console.log('validateKYCPhotos: frontPhoto missing for NATIONAL_ID/AADHAAR');
        errors.push('frontPhoto is required for National ID / Aadhaar');
      } else {
        console.log('validateKYCPhotos: validating frontPhoto for NATIONAL_ID/AADHAAR');
        if (!isValidBase64(frontPhoto)) {
          console.log('validateKYCPhotos: frontPhoto failed base64 validation');
          errors.push('frontPhoto must be valid base64 encoded image data');
        }
        const sizeCheck = validatePhotoSize(frontPhoto);
        if (!sizeCheck.valid) {
          console.log('validateKYCPhotos: frontPhoto failed size validation:', sizeCheck);
          errors.push(`frontPhoto: ${sizeCheck.message}`);
        }
      }
      if (!backendPhoto) {
        console.log('validateKYCPhotos: backendPhoto missing for NATIONAL_ID/AADHAAR');
        errors.push('backendPhoto is required for National ID / Aadhaar');
      } else {
        console.log('validateKYCPhotos: validating backendPhoto for NATIONAL_ID/AADHAAR');
        if (!isValidBase64(backendPhoto)) {
          console.log('validateKYCPhotos: backendPhoto failed base64 validation');
          errors.push('backendPhoto must be valid base64 encoded image data');
        }
        const sizeCheck = validatePhotoSize(backendPhoto);
        if (!sizeCheck.valid) {
          console.log('validateKYCPhotos: backendPhoto failed size validation:', sizeCheck);
          errors.push(`backendPhoto: ${sizeCheck.message}`);
        }
      }
      break;

    case 'DRIVERS_LICENSE':
      console.log('validateKYCPhotos: DRIVERS_LICENSE - facePhoto and frontPhoto required, backend optional');
      // facePhoto and frontPhoto required, backendPhoto optional
      if (!frontPhoto) {
        console.log('validateKYCPhotos: frontPhoto missing for DRIVERS_LICENSE');
        errors.push('frontPhoto is required for Driver\'s License');
      } else {
        console.log('validateKYCPhotos: validating frontPhoto for DRIVERS_LICENSE');
        if (!isValidBase64(frontPhoto)) {
          console.log('validateKYCPhotos: frontPhoto failed base64 validation');
          errors.push('frontPhoto must be valid base64 encoded image data');
        }
        const sizeCheck = validatePhotoSize(frontPhoto);
        if (!sizeCheck.valid) {
          console.log('validateKYCPhotos: frontPhoto failed size validation:', sizeCheck);
          errors.push(`frontPhoto: ${sizeCheck.message}`);
        }
      }
      if (backendPhoto) {
        console.log('validateKYCPhotos: validating backendPhoto for DRIVERS_LICENSE');
        if (!isValidBase64(backendPhoto)) {
          console.log('validateKYCPhotos: backendPhoto failed base64 validation');
          errors.push('backendPhoto must be valid base64 encoded image data');
        }
        const sizeCheck = validatePhotoSize(backendPhoto);
        if (!sizeCheck.valid) {
          console.log('validateKYCPhotos: backendPhoto failed size validation:', sizeCheck);
          errors.push(`backendPhoto: ${sizeCheck.message}`);
        }
      }
      break;

    default:
      console.log('validateKYCPhotos: invalid idType:', idType);
      errors.push(`Invalid idType: ${idType}`);
  }

  console.log('validateKYCPhotos: final result:', {
    valid: errors.length === 0,
    errorCount: errors.length,
    errors
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Map our ID type enum to KuCoin's format
 * @param {string} ourType - Our ID type (PASSPORT, NATIONAL_ID, etc.)
 * @returns {string} KuCoin ID type format
 */
function mapIdTypeToKuCoin(ourType) {
  const mapping = {
    'PASSPORT': 'passport',
    'NATIONAL_ID': 'idcard',
    'DRIVERS_LICENSE': 'drivinglicense',
    'AADHAR': 'idcard',   // Map Aadhar (single A) to idcard
    'AADHAAR': 'idcard'   // Map Aadhaar (double A) to idcard
  };
  return mapping[ourType] || 'idcard';
}

/**
 * Map our KYC data to KuCoin API format
 * @param {object} data - Our KYC data format
 * @returns {object} KuCoin API format
 */
function mapKYCDataToKuCoin(data) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    birthDate: data.dateOfBirth,           // Rename dateOfBirth -> birthDate
    issueCountry: data.country,            // Rename country -> issueCountry
    identityType: mapIdTypeToKuCoin(data.idType),  // Convert enum
    identityNumber: data.idNumber,         // Rename idNumber -> identityNumber
    expireDate: data.expireDate,
    facePhoto: data.facePhoto,
    frontPhoto: data.frontPhoto,
    backendPhoto: data.backendPhoto
  };
}

module.exports = {
  isValidBase64,
  getBase64Size,
  validatePhotoSize,
  validateKYCPhotos,
  mapIdTypeToKuCoin,
  mapKYCDataToKuCoin
};
