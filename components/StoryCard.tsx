/**
 * StoryCard — compact list item for the Saved Stories screen.
 * Shows the photo thumbnail, street name, mode badge, and date.
 * Tapping it navigates to the full story view.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Story } from '@/utils/types';

interface StoryCardProps {
  story: Story;
}

export default function StoryCard({ story }: StoryCardProps) {
  const router = useRouter();

  const formattedDate = new Date(story.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Navigate to the story screen in "view saved" mode
  const handlePress = () => {
    router.push({
      pathname: '/story',
      params: { storyId: story.id },
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      {/* Photo thumbnail */}
      <Image
        source={{ uri: story.photoUri }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      <View style={styles.info}>
        {/* Street name */}
        <Text style={styles.streetName} numberOfLines={2}>
          {story.streetName}
        </Text>

        {/* Mode badge + date row */}
        <View style={styles.meta}>
          <View style={[styles.badge, story.mode === 'news' ? styles.badgeNews : styles.badgeOverview]}>
            <Text style={styles.badgeText}>
              {story.mode === 'news' ? 'News Story' : 'Street Story'}
            </Text>
          </View>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        {/* Story preview */}
        <Text style={styles.preview} numberOfLines={2}>
          {story.content}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnail: {
    width: 90,
    height: 110,
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  streetName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeOverview: {
    backgroundColor: Colors.primaryDark,
  },
  badgeNews: {
    backgroundColor: '#5e3570',  // Purple accent for news mode
  },
  badgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  preview: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
