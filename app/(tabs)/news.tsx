/**
 * News Tab — Neighborhood News Feed
 *
 * On load:
 *  1. Gets the user's current GPS coordinates.
 *  2. Reverse-geocodes to a city / neighborhood name.
 *  3. Calls the backend GET /api/news?city=... which:
 *       a. Fetches recent articles from NewsAPI.
 *       b. Asks Claude to write a 3-sentence neighborhood digest.
 *  4. Displays the digest at the top as a "Neighborhood Digest" card.
 *  5. Lists the raw articles as scrollable NewsCards below.
 *
 * Pull-to-refresh re-runs the full fetch cycle.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import NewsCard from '@/components/NewsCard';
import { reverseGeocode } from '@/utils/geocoding';
import { NewsArticle, NewsResponse } from '@/utils/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function NewsScreen() {
  const [digest, setDigest] = useState<string>('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [cityName, setCityName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch location, geocode, then fetch news ─────────────────────────────
  const fetchNews = useCallback(async () => {
    try {
      setError(null);

      // Request location permission if not already granted
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to show local news. Please enable it in Settings.');
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = location.coords;

      // Reverse-geocode to get city name for the news query
      const geo = await reverseGeocode(lat, lng);
      const city = geo.city || geo.neighborhood || `${lat.toFixed(3)},${lng.toFixed(3)}`;
      setCityName(city);

      // Call backend news endpoint
      const response = await fetch(`${API_URL}/api/news?city=${encodeURIComponent(city)}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data: NewsResponse = await response.json();
      setDigest(data.digest);
      setArticles(data.articles);
    } catch (err: any) {
      console.error('[NewsScreen] fetchNews error:', err);
      setError(err.message || 'Could not load news. Please try again.');
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchNews();
      setLoading(false);
    })();
  }, []);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Finding your neighborhood…</Text>
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>Could not load news</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchNews().finally(() => setLoading(false)); }}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Digest header component rendered above the article list ──────────────
  const ListHeader = () => (
    <View>
      {/* City label */}
      <View style={styles.cityRow}>
        <Ionicons name="location" size={16} color={Colors.primary} />
        <Text style={styles.cityName}>{cityName}</Text>
      </View>

      {/* Neighborhood Digest card */}
      {digest ? (
        <View style={styles.digestCard}>
          <View style={styles.digestHeader}>
            <Ionicons name="sparkles" size={16} color={Colors.primary} />
            <Text style={styles.digestLabel}>Neighborhood Digest</Text>
          </View>
          <Text style={styles.digestText}>{digest}</Text>
        </View>
      ) : null}

      {/* Articles heading */}
      <Text style={styles.sectionTitle}>Latest Stories</Text>
    </View>
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="newspaper-outline" size={40} color={Colors.textMuted} />
      <Text style={styles.emptyText}>No recent articles found for {cityName}</Text>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={articles}
      keyExtractor={(item, index) => item.url || String(index)}
      renderItem={({ item }) => <NewsCard article={item} />}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
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
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  cityName: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  digestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  digestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  digestLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  digestText: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  // Shared states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginTop: 16,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
