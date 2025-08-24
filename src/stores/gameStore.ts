import { writable, derived } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

// Types matching the backend
export interface GameInfo {
  name: string;
  path: string;
  version: string;
  game_type: 'WC1' | 'WC2' | 'WC3';
  is_running: boolean;
  executable: string;
  maps_folder?: string;
  installation_type: InstallationType;
  drive: string;
}

export type InstallationType = 
  | 'Original'
  | 'Remastered'
  | 'BattleNet'
  | 'Combat'
  | 'DOS'
  | 'Reforged'
  | 'FrozenThrone'
  | 'ReignOfChaos'
  | 'Custom';

export interface ScanResult {
  games: GameInfo[];
  total_found: number;
  drives_scanned: string[];
}

export interface RunningGame {
  name: string;
  process_id: number;
  game_type: 'WC1' | 'WC2' | 'WC3';
  executable_path: string;
}

export interface GameLaunchRequest {
  executable_path: string;
  working_directory: string;
}

// Create stores
export const games = writable<GameInfo[]>([]);
export const runningGames = writable<RunningGame[]>([]);
export const isLoading = writable(false);
export const scanResult = writable<ScanResult | null>(null);

// Derived stores for filtered games
export const wc1Games = derived(games, $games => 
  $games.filter(game => game.game_type === 'WC1')
);

export const wc2Games = derived(games, $games => 
  $games.filter(game => game.game_type === 'WC2')
);

export const wc3Games = derived(games, $games => 
  $games.filter(game => game.game_type === 'WC3')
);

export const wc1RunningGames = derived(runningGames, $runningGames => 
  $runningGames.filter(game => game.game_type === 'WC1')
);

export const wc2RunningGames = derived(runningGames, $runningGames => 
  $runningGames.filter(game => game.game_type === 'WC2')
);

export const wc3RunningGames = derived(runningGames, $runningGames => 
  $runningGames.filter(game => game.game_type === 'WC3')
);

// Helper function to get default game for each type
export function getDefaultGame(gameType: 'WC1' | 'WC2' | 'WC3') {
  let currentGames: GameInfo[] = [];
  games.subscribe(value => {
    currentGames = value;
  })();
  
  const gamesOfType = currentGames.filter((game: GameInfo) => game.game_type === gameType);
  
  // Priority order: Remastered > BattleNet > Original > Custom
  const priority = ['Remastered', 'BattleNet', 'Original', 'Custom'];
  
  for (const priorityType of priority) {
    const found = gamesOfType.find((game: GameInfo) => 
      game.installation_type === priorityType
    );
    if (found) return found;
  }
  
  // Return first found if no priority match
  return gamesOfType[0] || null;
}

export async function scanGames() {
  isLoading.set(true);
  try {
    const results = await invoke<ScanResult>('scan_for_games');
    
    // Update games store
    games.set(results.games);
    
    // Update scan result store
    scanResult.set(results);
    
    console.log('Games scanned successfully:', results);
    console.log(`Found ${results.total_found} games across ${results.drives_scanned.length} drives`);
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

export async function launchGame(gameInfo: GameInfo) {
  try {
    const request: GameLaunchRequest = {
      executable_path: gameInfo.executable,
      working_directory: gameInfo.path
    };
    
    await invoke('launch_game', { request });
    console.log(`Game ${gameInfo.name} launched successfully`);
    
    // Refresh status after a short delay
    setTimeout(() => {
      refreshGames();
      scanGames();
    }, 2000);
  } catch (error) {
    console.error(`Failed to launch game ${gameInfo.name}:`, error);
    throw error;
  }
}

export async function getGameAssets(gameType: string, gamePath: string) {
  try {
    const assets = await invoke<string[]>('get_game_assets', { gameType, gamePath });
    console.log(`Retrieved assets for ${gameType}:`, assets);
    return assets;
  } catch (error) {
    console.error(`Failed to get assets for ${gameType}:`, error);
    throw error;
  }
}

// Helper functions to get games by type (for backward compatibility)
export function getGamesByType(gameType: 'wc1' | 'wc2' | 'wc3') {
  const upperType = gameType.toUpperCase() as 'WC1' | 'WC2' | 'WC3';
  switch (upperType) {
    case 'WC1': return wc1Games;
    case 'WC2': return wc2Games;
    case 'WC3': return wc3Games;
    default: return wc2Games; // fallback
  }
}

export function getRunningGamesByType(gameType: 'wc1' | 'wc2' | 'wc3') {
  const upperType = gameType.toUpperCase() as 'WC1' | 'WC2' | 'WC3';
  switch (upperType) {
    case 'WC1': return wc1RunningGames;
    case 'WC2': return wc2RunningGames;
    case 'WC3': return wc3RunningGames;
    default: return wc2RunningGames; // fallback
  }
}

