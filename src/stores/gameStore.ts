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
  game_type: 'wc1' | 'wc2' | 'wc3';
}

export interface RunningGame {
  name: string;
  process_id: number;
  game_type: 'wc1' | 'wc2' | 'wc3';
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

// Initialize default games for all three Warcraft versions
const defaultGames: GameInfo[] = [
  // Warcraft I games
  { key: 'wc1-original', name: 'Warcraft: Orcs & Humans', path: '', version: 'Original', found: false, is_running: false, game_type: 'wc1' },
  { key: 'wc1-remastered', name: 'Warcraft I: Remastered', path: '', version: 'Remastered', found: false, is_running: false, game_type: 'wc1' },
  
  // Warcraft II games
  { key: 'wc2-remastered', name: 'Warcraft II: Remastered', path: '', version: 'Remastered', found: false, is_running: false, game_type: 'wc2' },
  { key: 'wc2-combat', name: 'Warcraft II: Combat Edition', path: '', version: 'Combat', found: false, is_running: false, game_type: 'wc2' },
  { key: 'wc2-bnet', name: 'Warcraft II: Battle.net Edition', path: '', version: 'Battle.net', found: false, is_running: false, game_type: 'wc2' },
  { key: 'wc2-dos', name: 'Warcraft II: Tides of Darkness (DOS)', path: '', version: 'DOS', found: false, is_running: false, game_type: 'wc2' },
  { key: 'wc2-dosx', name: 'Warcraft II: Beyond the Dark Portal (DOS)', path: '', version: 'DOS', found: false, is_running: false, game_type: 'wc2' },
  
  // Warcraft III games
  { key: 'wc3-reforged', name: 'Warcraft III: Reforged', path: '', version: 'Reforged', found: false, is_running: false, game_type: 'wc3' },
  { key: 'wc3-frozen-throne', name: 'Warcraft III: The Frozen Throne', path: '', version: 'Frozen Throne', found: false, is_running: false, game_type: 'wc3' },
  { key: 'wc3-reign-of-chaos', name: 'Warcraft III: Reign of Chaos', path: '', version: 'Reign of Chaos', found: false, is_running: false, game_type: 'wc3' },
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
        const result = results[game.game_type];
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

export async function getGameAssets(gameType: 'wc1' | 'wc2' | 'wc3', gamePath: string) {
  try {
    const assets = await invoke<string[]>('get_game_assets', { gameType, gamePath });
    console.log(`Retrieved assets for ${gameType}:`, assets);
    return assets;
  } catch (error) {
    console.error(`Failed to get assets for ${gameType}:`, error);
    throw error;
  }
}

// Helper functions to get games by type
export function getGamesByType(gameType: 'wc1' | 'wc2' | 'wc3') {
  return games.map(games => games.filter(game => game.game_type === gameType));
}

export function getRunningGamesByType(gameType: 'wc1' | 'wc2' | 'wc3') {
  return runningGames.map(games => games.filter(game => game.game_type === gameType));
}

