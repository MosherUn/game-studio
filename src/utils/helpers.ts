import type { RankEntry, RankStats } from '../types';

export function generateId(): string {
  return 'GAME-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function getLocalUsers(): any {
  try { return JSON.parse(localStorage.getItem('gameUsers') || '{}'); }
  catch { return {}; }
}

export function saveLocalUsers(users: any): void {
  localStorage.setItem('gameUsers', JSON.stringify(users));
}

export function getSession(): any {
  try { return JSON.parse(localStorage.getItem('gameSession') || 'null'); }
  catch { return null; }
}

export function saveSession(session: any): void {
  localStorage.setItem('gameSession', JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem('gameSession');
}

export function getPlayerId(): string {
  const session = getSession();
  return session?.id || 'GUEST';
}

// ✅ showToast 函数
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export const GAME_FILES = [
  { id: 'game1', name: '弹球大师', file: 'game1.html', cover: '🎯', description: '经典的弹球游戏' },
  { id: 'game2', name: '点击大师', file: 'game2.html', cover: '🖱️', description: '看看你能点多少下' },
  { id: 'game3', name: '猜数字', file: 'game3.html', cover: '🔢', description: '猜1-100之间的数字' },
  { id: 'game4', name: '围棋·段位赛', file: 'game4.html', cover: '♟️', description: 'AI对战 · 段位系统' },
  { id: 'game5', name: '象棋·段位赛', file: 'game5.html', cover: '🐴', description: 'AI对战 · 段位系统' }
];

// ✅ 段位排行榜工具
export function getRankList(players: Record<string, any>, gameType: 'chess' | 'go'): RankEntry[] {
  const entries: RankEntry[] = [];
  
  for (const [id, player] of Object.entries(players)) {
    const rankData = gameType === 'chess' ? player.chessRank : player.goRank;
    if (rankData && rankData.gamesPlayed > 0) {
      entries.push({
        playerId: id,
        playerName: player.name || id,
        rank: rankData.lastRank || '无',
        elo: rankData.elo || 0,
        games: rankData.gamesPlayed || 0,
        winRate: rankData.gamesPlayed > 0 ? Math.round((rankData.wins / rankData.gamesPlayed) * 100) : 0
      });
    }
  }
  
  entries.sort((a, b) => b.elo - a.elo);
  return entries;
}

// ✅ 赛季计算
export function getSeason(gameType: 'chess' | 'go', startDate: Date = new Date(2026, 7, 14)): { season: number; seasonStart: Date; seasonEnd: Date } {
  const now = new Date();
  const daysPerSeason = gameType === 'chess' ? 60 : 90;
  const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const season = Math.max(1, Math.floor(diffDays / daysPerSeason) + 1);
  const seasonStart = new Date(startDate);
  seasonStart.setDate(seasonStart.getDate() + (season - 1) * daysPerSeason);
  const seasonEnd = new Date(seasonStart);
  seasonEnd.setDate(seasonEnd.getDate() + daysPerSeason);
  return { season, seasonStart, seasonEnd };
}