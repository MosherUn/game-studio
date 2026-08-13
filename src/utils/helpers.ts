export const GAME_FILES = [
  { id: 'game1', name: '弹球大师', file: 'game1.html', cover: '🎯', description: '经典的弹球游戏' },
  { id: 'game2', name: '点击大师', file: 'game2.html', cover: '🖱️', description: '看看你能点多少下' },
  { id: 'game3', name: '猜数字', file: 'game3.html', cover: '🔢', description: '猜1-100之间的数字' },
  { id: 'game4', name: '围棋·段位赛', file: 'game4.html', cover: '♟️', description: 'AI对战 · 段位系统' },
  { id: 'game5', name: '象棋·段位赛', file: 'game5.html', cover: '♟️', description: 'AI对战 · 段位系统' }
];

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

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}