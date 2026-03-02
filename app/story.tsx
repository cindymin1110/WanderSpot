/**
 * Story Screen
 *
 * Used for two cases:
 *
 *  A) NEW story (params: photoUri, lat, lng, streetName, city, mode, isNew='true')
 *     - Reads the photo file as base64, calls the backend to generate a story.
 *     - Saves the resulting story to AsyncStorage.
 *     - Stores the generated story in React state so back-navigation
 *       does not re-trigger generation.
 *
 *  B) SAVED story (params: storyId)
 *     - Loads the story from AsyncStorage and displays it.
 *
 * In both cases the UI shows:
 *   - Street photo at the top
 *   - Street name as the title
 *   - Mode badge (Street Story / News Story)
 *   - Generated story text
 *   - Share button (copies text to clipboard)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Story, StoryMode } from '@/utils/types';
import { saveStory, getStoryById } from '@/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function StoryScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    // New story params
    photoUri?: string;
    lat?: string;
    lng?: string;
    streetName?: string;
    city?: string;
    mode?: StoryMode;
    isNew?: string;
    // Saved story param
    storyId?: string;
  }>();

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Generate a new story by calling the backend ───────────────────────────
  const generateStory = useCallback(async () => {
    const { photoUri, lat, lng, streetName, mode } = params;
    if (!photoUri || !lat || !lng || !streetName || !mode) {
      setError('Missing required parameters to generate a story.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Read the photo as base64 to send to the backend (Claude vision)
      let photoBase64: string;

      if (Platform.OS === 'web') {
        const blob = await fetch(photoUri).then((r) => r.blob());
        photoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve((reader.result as string).split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });
      } else {
        const uniqueName = `temp_photo_${Date.now()}.jpg`;
        const tempFile = new File(Paths.cache, uniqueName);
        new File(photoUri).copy(tempFile);
        photoBase64 = await tempFile.base64();
      }
      

      // POST to backend /api/story
      const response = await fetch(`${API_URL}/api/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoBase64,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          streetName,
          mode,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // Build the story object and persist it
      const newStory: Story = {
        id: `story_${Date.now()}`,
        photoUri,
        streetName,
        mode,
        content: data.story,
        date: new Date().toISOString(),
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      };

      await saveStory(newStory);
      setStory(newStory);
    } catch (err: any) {
      console.error('[StoryScreen] generateStory error:', err);
      setError(err.message || 'Could not generate story. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  // ── Load a saved story from AsyncStorage ─────────────────────────────────
  const loadSavedStory = useCallback(async () => {
    try {
      setLoading(true);
      const saved = await getStoryById(params.storyId!);
      if (!saved) throw new Error('Story not found in saved stories.');
      setStory(saved);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params.storyId]);

  // ── On mount: decide which path to take ──────────────────────────────────
  useEffect(() => {
    if (params.isNew === 'true') {
      generateStory();
    } else if (params.storyId) {
      loadSavedStory();
    } else {
      setError('No story parameters provided.');
      setLoading(false);
    }
  }, []); // Run once on mount

  // Update the header title once story data is available
  useEffect(() => {
    if (story) {
      navigation.setOptions({ title: story.streetName.split(',')[0] });
    }
  }, [story, navigation]);

  // ── Share the story ───────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!story) return;
    try {
      await Share.share({
        message: `📍 ${story.streetName}\n\n${story.content}\n\n— Shared from WanderSpot`,
        title: `WanderSpot: ${story.streetName}`,
      });
    } catch (err: any) {
      console.error('[StoryScreen] share error:', err);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Crafting your story…</Text>
        <Text style={styles.loadingSubtext}>
          Reading the street, checking local news, and weaving it together
        </Text>
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        {params.isNew === 'true' && (
          <TouchableOpacity style={styles.retryButton} onPress={generateStory}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!story) return null;

  const modeLabel = story.mode === 'news' ? 'News Story' : 'Street Story';
  const modeColor = story.mode === 'news' ? '#5e3570' : Colors.primaryDark;

  // ── Story display ─────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero photo */}
      <Image
        source={{ uri: story.photoUri }}
        style={styles.photo}
        resizeMode="cover"
      />

      {/* Title section */}
      <View style={styles.header}>
        {/* Mode badge */}
        <View style={[styles.modeBadge, { backgroundColor: modeColor }]}>
          <Text style={styles.modeBadgeText}>{modeLabel}</Text>
        </View>

        <Text style={styles.streetName}>{story.streetName}</Text>

        <Text style={styles.date}>
          {new Date(story.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Story text */}
      <Text style={styles.storyText}>{story.content}</Text>

      {/* Share button */}
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-outline" size={20} color={Colors.background} />
        <Text style={styles.shareButtonText}>Share this story</Text>
      </TouchableOpacity>

      {/* Coordinates footnote */}
      <Text style={styles.coords}>
        {story.coordinates.lat.toFixed(5)}, {story.coordinates.lng.toFixed(5)}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 48,
  },
  photo: {
    width: '100%',
    height: 280,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  modeBadgeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  streetName: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 6,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  storyText: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 26,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  shareButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  coords: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  // Loading / error states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  loadingText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
});
