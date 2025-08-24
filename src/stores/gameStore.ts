import { writable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

export interface GameInfo {
  key: string;
  name: string;
  path: string;
  version: string;
  found: boolean;
  is_running: boolean;
  process_id?: number;
}

export interface RunningGame {
  name: string;
  process_id: number;
}

export interface ScanResult {
  found: boolean;
  path: string;
  multiple_installations: boolean;
  all_paths: string[];
}

// Create stores
export const games = writable<GameInfo[]>([]);
export const runningGames = writable<RunningGame[]>([]);
export const isLoading = writable(false);

// Initialize default games
const defaultGames: GameInfo[] = [
  { key: 'wc2-remastered', name: 'Warcraft II: Remastered', path: '', version: 'Remastered', found: false, is_running: false },
  { key: 'wc2-combat', name: 'Warcraft II: Combat Edition', path: '', version: 'Combat', found: false, is_running: false },
  { key: 'wc2-bnet', name: 'Warcraft II: Battle.net Edition', path: '', version: 'Battle.net', found: false, is_running: false },
  { key: 'wc2-dos', name: 'Warcraft II: Tides of Darkness (DOS)', path: '', version: 'DOS', found: false, is_running: false },
  { key: 'wc2-dosx', name: 'Warcraft II: Beyond the Dark Portal (DOS)', path: '', version: 'DOS', found: false, is_running: false },
];

// Initialize the store
games.set(defaultGames);

export async function scanGames() {
  isLoading.set(true);
  try {
    const results = await invoke<Record<string, ScanResult>>('scan_for_games');
    
    // Update games with scan results
    games.update(currentGames => {
      return currentGames.map(game => {
        const result = results[game.key];
        if (result) {
          return {
            ...game,
            found: result.found,
            path: result.path,
          };
        }
        return game;
      });
    });
    
    console.log('Games scanned successfully:', results);
  } catch (error) {
    console.error('Failed to scan games:', error);
    throw error;
  } finally {
    isLoading.set(false);
  }
}

export async function refreshGames() {
  try {
    const runningGamesList = await invoke<RunningGame[]>('get_running_games');
    runningGames.set(runningGamesList);
    
    console.log('Game status refreshed:', runningGamesList);
  } catch (error) {
    console.error('Failed to refresh game status:', error);
    throw error;
  }
}

export async function launchGame(gameName: string) {
  try {
    await invoke('launch_game', { gameName });
    console.log(`Game ${gameName} launched successfully`);
    
    // Refresh status after a short delay
    setTimeout(() => {
      refreshGames();
      scanGames();
    }, 2000);
  } catch (error) {
    console.error(`Failed to launch game ${gameName}:`, error);
    throw error;
  }
}

