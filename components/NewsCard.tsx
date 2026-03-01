/**
 * NewsCard — displays a single news article in a compact card.
 * Shows headline, source, date, and links to the full article.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { NewsArticle } from '@/utils/types';

interface NewsCardProps {
  article: NewsArticle;
}

export default function NewsCard({ article }: NewsCardProps) {
  // Format the publish date as a short readable string
  const formattedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handlePress = () => {
    if (article.url) {
      Linking.openURL(article.url).catch((err) =>
        console.error('[NewsCard] Cannot open URL:', err)
      );
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      {/* Article thumbnail if available */}
      {article.urlToImage ? (
        <Image
          source={{ uri: article.urlToImage }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.thumbnailPlaceholderText}>No Image</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Source and date row */}
        <View style={styles.meta}>
          <Text style={styles.source} numberOfLines={1}>
            {article.source?.name || 'Unknown Source'}
          </Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        {/* Headline */}
        <Text style={styles.title} numberOfLines={3}>
          {article.title}
        </Text>

        {/* Description snippet */}
        {article.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {article.description}
          </Text>
        ) : null}

        {/* Read more indicator */}
        <Text style={styles.readMore}>Read full article →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnail: {
    width: '100%',
    height: 160,
  },
  thumbnailPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
  },
  thumbnailPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  content: {
    padding: 14,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  source: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  title: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 6,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  readMore: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
