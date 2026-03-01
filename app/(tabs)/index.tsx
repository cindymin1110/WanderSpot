/**
 * Explore Tab — Camera Screen
 *
 * Flow:
 *  1. Request camera + location permissions on mount.
 *  2. Show a live camera preview with a capture button.
 *  3. On capture: save photo to the app's permanent documents directory,
 *     fetch GPS coordinates, reverse-geocode to a street name.
 *  4. Navigate to /confirmation with the photo URI and location info.
 *
 * The photo is copied to documentDirectory immediately so its URI stays
 * valid after the camera session ends and across app restarts.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { reverseGeocode } from '@/utils/geocoding';

export default function ExploreScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);

  // expo-camera permission hook
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  // Camera state
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // ── Request location permission on mount ──────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'WanderSpot needs your location to identify the street and find local stories.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  // Reset camera ready state when the tab regains focus
  useFocusEffect(
    useCallback(() => {
      setCameraReady(false);
    }, [])
  );

  // ── Permission gate: camera not yet determined ───────────────────────────
  if (!cameraPermission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  // ── Permission denied: camera ────────────────────────────────────────────
  if (!cameraPermission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionSubtitle}>
          WanderSpot uses your camera to capture the street you're standing on.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Capture photo ─────────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (capturing || !cameraReady || !cameraRef.current) return;

    setCapturing(true);
    try {
      // Take the picture — no base64 here, we'll read it later from the file
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.75,
        skipProcessing: Platform.OS === 'android', // faster on Android
      });

      if (!photo?.uri) throw new Error('No photo URI returned from camera');

      // Copy to permanent document directory so the URI stays valid
      const permanentUri = FileSystem.documentDirectory + `photo_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: photo.uri, to: permanentUri });

      // Get current GPS coordinates
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = location.coords;

      // Reverse-geocode to a human-readable street name
      const geo = await reverseGeocode(lat, lng);

      // Navigate to confirmation screen with all the context
      router.push({
        pathname: '/confirmation',
        params: {
          photoUri: permanentUri,
          lat: String(lat),
          lng: String(lng),
          streetName: geo.streetName,
          city: geo.city,
        },
      });
    } catch (err: any) {
      console.error('[ExploreScreen] handleCapture error:', err);
      Alert.alert('Capture failed', err.message || 'Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  // ── Upload from library ───────────────────────────────────────────────────
  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to upload a street view.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setCapturing(true);
    try {
      // Copy to permanent document directory so the URI stays valid
      const permanentUri = FileSystem.documentDirectory + `photo_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: permanentUri });

      // Get current GPS coordinates — location is always from device, not the image
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = location.coords;

      const geo = await reverseGeocode(lat, lng);

      router.push({
        pathname: '/confirmation',
        params: {
          photoUri: permanentUri,
          lat: String(lat),
          lng: String(lng),
          streetName: geo.streetName,
          city: geo.city,
        },
      });
    } catch (err: any) {
      console.error('[ExploreScreen] handleUpload error:', err);
      Alert.alert('Upload failed', err.message || 'Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  // ── Flip camera ───────────────────────────────────────────────────────────
  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Live camera preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={() => setCameraReady(true)}
      >
        {/* Top hint */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Point at the street around you</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.controls}>
          {/* Flip camera button */}
          <TouchableOpacity style={styles.flipButton} onPress={toggleFacing}>
            <Ionicons name="camera-reverse-outline" size={28} color={Colors.text} />
          </TouchableOpacity>

          {/* Capture button */}
          <TouchableOpacity
            style={[styles.captureButton, (!cameraReady || capturing) && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={!cameraReady || capturing}
          >
            {capturing ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>

          {/* Upload from library button */}
          <TouchableOpacity style={styles.flipButton} onPress={handleUpload} disabled={capturing}>
            <Ionicons name="image-outline" size={28} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Location permission warning banner (non-blocking) */}
      {locationPermission === false && (
        <View style={styles.locationWarning}>
          <Ionicons name="location-outline" size={16} color={Colors.warning} />
          <Text style={styles.locationWarningText}>
            Location off — street name will not be detected
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hintContainer: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: Colors.overlay,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  flipButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.text,
    borderWidth: 4,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  permissionTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  locationWarning: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  locationWarningText: {
    color: Colors.warning,
    fontSize: 12,
  },
});
