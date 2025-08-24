import { writable, derived } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

// Types matching the backend
export interface GameInfo {
  key: string;
  name: string;
  path: string;
  version: string;
  found: boolean;
  is_running: boolean;
  game_type: 'wc1' | 'wc2' | 'wc3';
}

export interface ScanResult {
  games: ScanResultGame[];
}

export interface ScanResultGame {
  name: string;
  path: string;
  version: string;
  game_type: 'WC1' | 'WC2' | 'WC3'; // Backend uses uppercase
  is_running: boolean;
}

export interface RunningGame {
  name: string;
  process_id: number;
  game_type: 'WC1' | 'WC2' | 'WC3';
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
    const results = await invoke<ScanResult>('scan_for_games');
    
    // Update games with scan results
    games.update(currentGames => {
      return currentGames.map(game => {
        // Find matching game from scan results (convert backend enum to frontend format)
        const foundGame = results.games.find(scanGame => 
          scanGame.game_type.toLowerCase() === game.game_type
        );
        
        if (foundGame) {
          return {
            ...game,
            found: true,
            path: foundGame.path,
            version: foundGame.version,
            is_running: foundGame.is_running,
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

// Derived stores for filtered games
export const wc1Games = derived(games, $games => 
  $games.filter(game => game.game_type === 'wc1')
);

export const wc2Games = derived(games, $games => 
  $games.filter(game => game.game_type === 'wc2')
);

export const wc3Games = derived(games, $games => 
  $games.filter(game => game.game_type === 'wc3')
);

export const wc1RunningGames = derived(runningGames, $runningGames => 
  $runningGames.filter(game => game.game_type.toLowerCase() === 'wc1')
);

export const wc2RunningGames = derived(runningGames, $runningGames => 
  $runningGames.filter(game => game.game_type.toLowerCase() === 'wc2')
);

export const wc3RunningGames = derived(runningGames, $runningGames => 
  $runningGames.filter(game => game.game_type.toLowerCase() === 'wc3')
);

// Helper functions to get games by type (for backward compatibility)
export function getGamesByType(gameType: 'wc1' | 'wc2' | 'wc3') {
  switch (gameType) {
    case 'wc1': return wc1Games;
    case 'wc2': return wc2Games;
    case 'wc3': return wc3Games;
    default: return wc2Games; // fallback
  }
}

export function getRunningGamesByType(gameType: 'wc1' | 'wc2' | 'wc3') {
  switch (gameType) {
    case 'wc1': return wc1RunningGames;
    case 'wc2': return wc2RunningGames;
    case 'wc3': return wc3RunningGames;
    default: return wc2RunningGames; // fallback
  }
}

