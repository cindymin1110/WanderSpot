/**
 * Saved Tab — Recent Stories
 *
 * Loads all stories from AsyncStorage and displays them as a scrollable
 * list of StoryCards.  Each card navigates to the full story view.
 *
 * A "Clear History" button at the top lets users wipe all saved stories.
 *
 * The list refreshes whenever this tab comes into focus (e.g. after a new
 * story is generated on the Explore tab).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import StoryCard from '@/components/StoryCard';
import { getStories, clearAllStories } from '@/utils/storage';
import { Story } from '@/utils/types';

export default function SavedScreen() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Reload stories every time this tab gains focus ─────────────────────
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const saved = await getStories();
        if (active) {
          setStories(saved);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  // ── Clear all saved stories ────────────────────────────────────────────
  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'This will permanently delete all your saved stories. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllStories();
              setStories([]);
            } catch (err) {
              Alert.alert('Error', 'Could not clear stories. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  // ── List header — shows the clear button only when there are stories ───
  const ListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.sectionTitle}>
        {stories.length} {stories.length === 1 ? 'story' : 'stories'} saved
      </Text>
      {stories.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearHistory}
        >
          <Ionicons name="trash-outline" size={15} color={Colors.error} />
          <Text style={styles.clearButtonText}>Clear History</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Empty state ───────────────────────────────────────────────────────
  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={52} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No saved stories yet</Text>
      <Text style={styles.emptySubtitle}>
        Head to Explore, take a photo of a street, and generate your first story!
      </Text>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={stories.length === 0 ? styles.emptyList : styles.listContent}
      data={stories}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <StoryCard story={item} />}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flexGrow: 1,
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  clearButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
