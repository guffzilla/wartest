export function getInstallationTypeIcon(type: string): string {
  switch (type) {
    case 'Remastered (Windows)':
      return '🎮';
    case 'BattleNet':
      return '🌐';
    case 'Combat':
      return '⚔️';
    case 'Original (DOS)':
      return '💾';
    case 'DOS':
      return '💾';
    case 'Reforged':
      return '🔄';
    case 'FrozenThrone':
      return '❄️';
    case 'ReignOfChaos':
      return '🔥';
    case 'Original':
      return '📀';
    default:
      return '🎯';
  }
}

export function getInstallationTypeColor(type: string): string {
  switch (type) {
    case 'Remastered (Windows)':
      return '#ffd700';
    case 'BattleNet':
      return '#00aeff';
    case 'Combat':
      return '#ff6b6b';
    case 'Original (DOS)':
      return '#4ecdc4';
    case 'DOS':
      return '#4ecdc4';
    case 'Reforged':
      return '#45b7d1';
    case 'FrozenThrone':
      return '#96ceb4';
    case 'ReignOfChaos':
      return '#feca57';
    case 'Original':
      return '#ff9ff3';
    default:
      return '#ffffff';
  }
}

export function getGameTypeIcon(type: string): string {
  switch (type) {
    case 'WC1':
      return '⚔️';
    case 'WC2':
      return '🛡️';
    case 'WC3':
      return '⚡';
    default:
      return '🎮';
  }
}

export function getGameTypeColor(type: string): string {
  switch (type) {
    case 'WC1':
      return '#ffd700';
    case 'WC2':
      return '#2196F3';
    case 'WC3':
      return '#9C27B0';
    default:
      return '#ffffff';
  }
}
