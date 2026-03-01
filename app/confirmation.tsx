/**
 * Confirmation Screen
 *
 * Shown after the user takes a photo. Displays:
 *  - The captured photo
 *  - The detected street name
 *  - Two buttons to choose the storytelling mode:
 *      "Street Story" → historical/cultural overview
 *      "News Story"   → recent local news narrative
 *
 * Navigates to /story with the chosen mode and all location params.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { StoryMode } from '@/utils/types';

export default function ConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    photoUri: string;
    lat: string;
    lng: string;
    streetName: string;
    city: string;
  }>();

  const { photoUri, lat, lng, streetName, city } = params;

  // Navigate to the story screen with the selected mode
  const handleModeSelect = (mode: StoryMode) => {
    router.push({
      pathname: '/story',
      params: {
        photoUri,
        lat,
        lng,
        streetName,
        city,
        mode,
        // isNew tells the story screen to generate (vs. load from storage)
        isNew: 'true',
      },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      {/* Captured photo */}
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          resizeMode="cover"
        />
      </View>

      {/* Detected location */}
      <View style={styles.locationRow}>
        <Ionicons name="location" size={18} color={Colors.primary} />
        <Text style={styles.streetName} numberOfLines={2}>
          {streetName || 'Unknown street'}
        </Text>
      </View>

      {/* Mode selection prompt */}
      <Text style={styles.prompt}>What story do you want to hear?</Text>

      {/* Street Story button — historical / cultural mode */}
      <TouchableOpacity
        style={[styles.modeButton, styles.overviewButton]}
        onPress={() => handleModeSelect('overview')}
        activeOpacity={0.85}
      >
        <Ionicons name="book-outline" size={26} color={Colors.text} />
        <View style={styles.modeTextGroup}>
          <Text style={styles.modeTitle}>Street Story</Text>
          <Text style={styles.modeSubtitle}>
            The history, character, and soul of this place
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* News Story button — recent local news mode */}
      <TouchableOpacity
        style={[styles.modeButton, styles.newsButton]}
        onPress={() => handleModeSelect('news')}
        activeOpacity={0.85}
      >
        <Ionicons name="newspaper-outline" size={26} color={Colors.text} />
        <View style={styles.modeTextGroup}>
          <Text style={styles.modeTitle}>News Story</Text>
          <Text style={styles.modeSubtitle}>
            What's happening here right now
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Coordinate detail */}
      {lat && lng ? (
        <Text style={styles.coords}>
          {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  photoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8, // Shadow for Android
  },
  photo: {
    width: '100%',
    height: 260,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 6,
  },
  streetName: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    lineHeight: 23,
  },
  prompt: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    marginBottom: 14,
    gap: 14,
    borderWidth: 1,
  },
  overviewButton: {
    backgroundColor: Colors.card,
    borderColor: Colors.primaryDark,
  },
  newsButton: {
    backgroundColor: Colors.card,
    borderColor: '#5e3570',
  },
  modeTextGroup: {
    flex: 1,
  },
  modeTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  modeSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  coords: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
