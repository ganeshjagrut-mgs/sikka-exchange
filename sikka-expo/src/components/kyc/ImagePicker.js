import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * KYC Image Picker Component
 * Allows users to upload ID proof and selfie images
 * Converts images to base64 for API submission
 */
const KYCImagePicker = ({ label, value, onChange, required = false }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  // Request permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera roll permission is required to upload images.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  // Pick image from gallery
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true, // CRITICAL: Get base64 directly
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Check file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Error', 'Image must be under 5MB');
          setLoading(false);
          return;
        }

        // Convert to base64 with data URI
        const base64String = `data:image/jpeg;base64,${asset.base64}`;
        onChange(base64String);
        console.log('✅ Image uploaded, base64 length:', base64String.length);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Camera is not available on web. Please use gallery.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to take photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Check file size
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Error', 'Image must be under 5MB');
          setLoading(false);
          return;
        }

        const base64String = `data:image/jpeg;base64,${asset.base64}`;
        onChange(base64String);
        console.log('✅ Photo taken, base64 length:', base64String.length);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show options (camera or gallery)
  const showOptions = () => {
    if (Platform.OS === 'web') {
      pickImage(); // Web only supports gallery
      return;
    }

    Alert.alert(
      'Upload Image',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  // Clear image
  const clearImage = () => {
    onChange(null);
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: colors.text }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Upload Area */}
      {!value ? (
        <TouchableOpacity
          style={[
            styles.uploadArea,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={showOptions}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Upload size={32} color={colors.textSecondary} />
          <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
            {loading ? 'Loading...' : 'Tap to upload image'}
          </Text>
          <Text style={[styles.uploadHint, { color: colors.textSecondary }]}>
            Max 5MB • JPG, PNG
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.previewContainer}>
          {/* Image Preview */}
          <Image
            source={{ uri: value }}
            style={[styles.preview, { borderColor: colors.border }]}
            resizeMode="cover"
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={showOptions}
              activeOpacity={0.7}
            >
              <Camera size={16} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Change
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={clearImage}
              activeOpacity={0.7}
            >
              <X size={16} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 12,
    marginTop: 4,
  },
  previewContainer: {
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default KYCImagePicker;
