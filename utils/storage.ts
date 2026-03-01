/**
 * AsyncStorage helpers for persisting WanderSpot stories across sessions.
 *
 * All stories are stored as a JSON array under the STORIES_KEY.
 * Each story includes a permanent local photo URI so it remains
 * visible after the app is closed and re-opened.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Story } from './types';

const STORIES_KEY = 'wanderspot_stories';

/**
 * Retrieve all saved stories, sorted newest-first.
 * Returns an empty array if nothing has been saved yet.
 */
export async function getStories(): Promise<Story[]> {
  try {
    const raw = await AsyncStorage.getItem(STORIES_KEY);
    if (!raw) return [];
    const stories: Story[] = JSON.parse(raw);
    // Sort by date descending so the most recent story appears first
    return stories.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    console.error('[storage] getStories error:', err);
    return [];
  }
}

/**
 * Save a single story.  If a story with the same ID already exists it is
 * replaced; otherwise the new story is prepended to the list.
 */
export async function saveStory(story: Story): Promise<void> {
  try {
    const existing = await getStories();
    // Remove any old entry with the same id
    const filtered = existing.filter((s) => s.id !== story.id);
    // Prepend the new story and persist
    await AsyncStorage.setItem(STORIES_KEY, JSON.stringify([story, ...filtered]));
  } catch (err) {
    console.error('[storage] saveStory error:', err);
    throw err;
  }
}

/**
 * Retrieve a single story by its ID.
 * Returns null if not found.
 */
export async function getStoryById(id: string): Promise<Story | null> {
  try {
    const stories = await getStories();
    return stories.find((s) => s.id === id) ?? null;
  } catch (err) {
    console.error('[storage] getStoryById error:', err);
    return null;
  }
}

/**
 * Delete all saved stories from AsyncStorage.
 * This is irreversible — used by the "Clear history" button.
 */
export async function clearAllStories(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORIES_KEY);
  } catch (err) {
    console.error('[storage] clearAllStories error:', err);
    throw err;
  }
}
