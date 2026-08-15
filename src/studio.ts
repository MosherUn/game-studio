import './style.css';
import { auth } from './modules/auth';
import { github } from './api/github';
import { GAME_FILES, showToast } from './utils/helpers';
import type { GameData } from './types';

const navAvatar = document.getElementById('navAvatar');
const navUserName = document.getElementById('navUserName');
const logoutBtn = document.getElementById('logoutBtn');
const menuAll = document.getElementById('menuAll');
const menuMy = document.getElementById('menuMy');
const menuAdmin = document.getElementById('menuAdmin');
const gameList = document.getElementById('gameList');
const gameCount = document.getElementById('gameCount');
const panelTitle = document.getElementById('panelTitle');
const panelCount = document.getElementById('panelCount');
const refreshBtn = document.getElementById('refreshBtn');

const modal = document.getElementById('gameModal');
const modalTitle = document.getElementById('modalTitle');
const gameFrame = document.getElementById('gameFrame') as HTMLIFrameElement;
const modalClose = document.getElementById('modalClose');

let currentFilter: 'all' | 'my' | 'admin' = 'all';
let gameConfigs: GameData = {};
let currentUser: any = null;
let initialized = false;

async function checkAuth() {
  const user = await auth.init();
  if (!user) {
    window.location.href = 'index.html';
    return false;
  }
  currentUser = user;
  return true;
}

function updateUserInfo() {
  if (navAvatar) navAvatar.textContent = currentUser?.avatar || '👤';
  if (navUserName) navUserName.textContent = currentUser?.name || '玩家';
}

async function loadGameConfigs() {
  gameConfigs = await github.getAllGames() || {};
}

function getGameList(filter: 'all' | 'my' | 'admin') {
  if (!currentUser) return [];

  const games = GAME_FILES.map(g => {
    const config = gameConfigs[g.id];
    return {
      ...g,
      enabled: config?.enabled ?? true,
      whitelist: config?.whitelist ?? [],
      blacklist: config?.blacklist ?? []
    };
  });

  if (filter === 'all') return games;
  if (filter === 'my') {
    return games.filter(g => {
      if (!g.enabled) return false;
      if (g.blacklist.includes(currentUser.id)) return false;
      if (g.whitelist.length > 0 && !g.whitelist.includes(currentUser.id)) return false;
      return true;
    });
  }
  if (filter === 'admin') return games;
  return [];
}

function renderGameList(filter: 'all' | 'my' | 'admin' = 'all') {
  const games = getGameList(filter);
  const isAdmin = currentUser?.isAdmin || false;
  
  if (gameCount) gameCount.textContent = `${games.length} 个游戏`;
  if (panelCount) panelCount.textContent = `${games.length} 个`;
  
  const titles = { all: '🎯 全部游戏', my: '📌 可游玩', admin: '⚙️ 管理游戏' };
  if (panelTitle) panelTitle.textContent = titles[filter] || '游戏';

  if (!gameList) return;

  if (games.length === 0) {
    gameList.innerHTML = `<div style="text-align:center;color:#6b7a8f;padding:40px 0;">暂无游戏</div>`;
    return;
  }

  gameList.innerHTML = games.map(g => {
    const status = g.enabled ? '🟢 开放' : '🔴 关闭';
    const showAdmin = filter === 'admin' && isAdmin;
    
    return `
      <div class="game-item" data-game-id="${g.id}">
        <div class="game-info">
          <h4>${g.cover || '🎮'} ${g.name}</h4>
          <p>${g.description || '无简介'} · ${status}</p>
        </div>
        <div class="game-actions">
          ${showAdmin ? `
            <button class="btn btn-outline btn-sm toggle-btn" data-game="${g.id}">${g.enabled ? '🔴 关闭' : '🟢 开启'}</button>
            <button class="btn btn-outline btn-sm whitelist-btn" data-game="${g.id}">📋 白名单</button>
            <button class="btn btn-outline btn-sm blacklist-btn" data-game="${g.id}">🚫 黑名单</button>
          ` : ''}
          ${g.enabled ? `<button class="btn btn-primary btn-sm play-btn" data-game="${g.id}">▶️ 游玩</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-game');
      if (id) openGame(id);
    });
  });

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-game');
      if (id && gameConfigs[id]) {
        const newEnabled = !gameConfigs[id].enabled;
        await github.updateGame(id, { enabled: newEnabled });
        gameConfigs[id].enabled = newEnabled;
        renderGameList(currentFilter);
      }
    });
  });

  document.querySelectorAll('.whitelist-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-game');
      if (id && gameConfigs[id]) {
        const current = gameConfigs[id].whitelist?.join(', ') || '';
        const input = prompt('白名单 (玩家ID用逗号分隔):', current);
        if (input !== null) {
          const whitelist = input.split(',').map(s => s.trim()).filter(Boolean);
          await github.updateGame(id, { whitelist });
          gameConfigs[id].whitelist = whitelist;
          renderGameList(currentFilter);
        }
      }
    });
  });

  document.querySelectorAll('.blacklist-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-game');
      if (id && gameConfigs[id]) {
        const current = gameConfigs[id].blacklist?.join(', ') || '';
        const input = prompt('黑名单 (玩家ID用逗号分隔):', current);
        if (input !== null) {
          const blacklist = input.split(',').map(s => s.trim()).filter(Boolean);
          await github.updateGame(id, { blacklist });
          gameConfigs[id].blacklist = blacklist;
          renderGameList(currentFilter);
        }
      }
    });
  });
}

// ✅ 修复：游戏打开链接
function openGame(gameId: string) {
  const game = GAME_FILES.find(g => g.id === gameId);
  if (!game) { showToast('游戏不存在', 'error'); return; }

  const config = gameConfigs[gameId];
  if (config) {
    if (!config.enabled) { showToast('该游戏已关闭', 'error'); return; }
    if (config.blacklist?.includes(currentUser.id)) { showToast('你已被加入黑名单', 'error'); return; }
    if (config.whitelist?.length > 0 && !config.whitelist.includes(currentUser.id)) {
      showToast('你没有权限游玩该游戏', 'error');
      return;
    }
  }

  if (modalTitle) modalTitle.textContent = game.name;
  // ✅ 修复：使用完整的子路径
  if (gameFrame) gameFrame.src = `/game-studio/gameList/${game.file}`;
  if (modal) modal.classList.remove('hidden');
}

modalClose?.addEventListener('click', () => {
  if (modal) modal.classList.add('hidden');
  if (gameFrame) gameFrame.src = 'about:blank';
});

if (menuAll) {
  menuAll.addEventListener('click', () => {
    menuAll.classList.add('active');
    if (menuMy) menuMy.classList.remove('active');
    if (menuAdmin) menuAdmin.classList.remove('active');
    currentFilter = 'all';
    renderGameList('all');
  });
}

if (menuMy) {
  menuMy.addEventListener('click', () => {
    menuMy.classList.add('active');
    if (menuAll) menuAll.classList.remove('active');
    if (menuAdmin) menuAdmin.classList.remove('active');
    currentFilter = 'my';
    renderGameList('my');
  });
}

if (menuAdmin) {
  menuAdmin.addEventListener('click', () => {
    if (!currentUser?.isAdmin) {
      showToast('只有管理员可以访问管理功能', 'error');
      return;
    }
    menuAdmin.classList.add('active');
    if (menuAll) menuAll.classList.remove('active');
    if (menuMy) menuMy.classList.remove('active');
    currentFilter = 'admin';
    renderGameList('admin');
  });
}

refreshBtn?.addEventListener('click', async () => {
  await loadGameConfigs();
  renderGameList(currentFilter);
  showToast('已刷新', 'success');
});

logoutBtn?.addEventListener('click', () => {
  auth.logout();
  window.location.href = 'index.html';
});

async function init() {
  const ok = await checkAuth();
  if (!ok) return;
  
  updateUserInfo();
  await loadGameConfigs();
  renderGameList('all');
  initialized = true;
}

init();