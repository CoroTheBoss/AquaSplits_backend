import AsyncStorage from '@react-native-async-storage/async-storage';
import { Race, ThemeMode } from './types';

const RACES_KEY = '@aquasplit:races';
const USERNAME_KEY = '@aquasplit:username';
const THEME_MODE_KEY = '@aquasplit:themeMode';

export async function saveRace(race: Race): Promise<void> {
  try {
    const races = await getRaces();
    races.push(race);
    await AsyncStorage.setItem(RACES_KEY, JSON.stringify(races));
  } catch (error) {
    console.error('Error saving race:', error);
    throw error;
  }
}

export async function getRaces(): Promise<Race[]> {
  try {
    const data = await AsyncStorage.getItem(RACES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting races:', error);
    return [];
  }
}

export async function deleteRace(id: string): Promise<void> {
  try {
    const races = await getRaces();
    const filtered = races.filter(r => r.id !== id);
    await AsyncStorage.setItem(RACES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting race:', error);
    throw error;
  }
}

export async function clearAllRaces(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RACES_KEY);
  } catch (error) {
    console.error('Error clearing races:', error);
    throw error;
  }
}

// Settings storage
export async function getUsername(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(USERNAME_KEY)) || '';
  } catch (error) {
    console.error('Error getting username:', error);
    return '';
  }
}

export async function saveUsername(username: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USERNAME_KEY, username);
  } catch (error) {
    console.error('Error saving username:', error);
    throw error;
  }
}

export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const mode = await AsyncStorage.getItem(THEME_MODE_KEY);
    return (mode as ThemeMode) || 'system';
  } catch (error) {
    console.error('Error getting theme mode:', error);
    return 'system';
  }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  } catch (error) {
    console.error('Error saving theme mode:', error);
    throw error;
  }
}

