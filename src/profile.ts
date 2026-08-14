import './style.css';
import { auth } from './modules/auth';
import { profile } from './modules/profile';
import { github } from './api/github';
import { GAME_FILES, showToast } from './utils/helpers';
import type { RankEntry } from './types';

const navAvatar = document.getElementById('navAvatar');
const navUserName = document.getElementById('navUserName');
const logoutBtn = document.getElementById('logoutBtn');
const avatarLarge = document.getElementById('avatarLarge');
const profileName = document.getElementById('profileName');
const profileId = document.getElementById('profileId');
const profileBio = document.getElementById('profileBio');
const roleBadge = document.getElementById('roleBadge');
const changeAvatarBtn = document.getElementById('changeAvatarBtn');
const avatarUpload = document.getElementById('avatarUpload') as HTMLInputElement;
const changeNameBtn = document.getElementById('changeNameBtn');
const renameModal = document.getElementById('renameModal');
const newNameInput = document.getElementById('newNameInput') as HTMLInputElement;
const confirmNameBtn = document.getElementById('confirmNameBtn');
const cancelNameBtn = document.getElementById('cancelNameBtn');
const editBioBtn = document.getElementById('editBioBtn');
const refreshBtn = document.getElementById('refreshBtn');
const frameSelector = document.getElementById('frameSelector');
const adminPanel = document.getElementById('adminPanel');
const adminGameList = document.getElementById('adminGameList');
const myGameList = document.getElementById('myGameList');
const chessRankList = document.getElementById('chessRankList');
const goRankList = document.getElementById('goRankList');

let currentUser: any = null;
let initialized = false;

// 检查登录
async function checkAuth() {
  const user = await auth.init();
  if (!user) {
    window.location.href = '/';
    return false;
  }
  currentUser = user;
  return true;
}

// ✅ 加载排行榜
async function loadRankLists() {
  try {
    // 象棋排行榜
    if (chessRankList) {
      const chessData = await auth.getRankList('chess');
      if (chessData.length === 0) {
        chessRankList.innerHTML = '<div style="color:#6b7a8f;font-size:14px;">暂无数据</div>';
      } else {
        chessRankList.innerHTML = chessData.slice(0, 10).map((entry, index) => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1f2836;font-size:13px;">
            <span>${index + 1}. ${entry.playerName}</span>
            <span style="color:#b388ff;">${entry.rank}</span>
            <span style="color:#4caf50;">${entry.elo}分</span>
            <span style="color:#6b7a8f;">${entry.winRate}%</span>
          </div>
        `).join('');
      }
    }

    // 围棋排行榜
    if (goRankList) {
      const goData = await auth.getRankList('go');
      if (goData.length === 0) {
        goRankList.innerHTML = '<div style="color:#6b7a8f;font-size:14px;">暂无数据</div>';
      } else {
        goRankList.innerHTML = goData.slice(0, 10).map((entry, index) => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1f2836;font-size:13px;">
            <span>${index + 1}. ${entry.playerName}</span>
            <span style="color:#b388ff;">${entry.rank}</span>
            <span style="color:#4caf50;">${entry.elo}分</span>
            <span style="color:#6b7a8f;">${entry.winRate}%</span>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    console.error('加载排行榜失败:', e);
  }
}

function updateUI() {
  if (!currentUser) return;
  
  const avatar = currentUser.avatar || '👤';
  const name = currentUser.name || '玩家';
  const bio = currentUser.bio || '这个人很懒，什么都没写。';
  const frame = currentUser.frame || 'default';
  const isAdmin = currentUser.isAdmin || false;
  
  if (navAvatar) navAvatar.textContent = avatar;
  if (navUserName) navUserName.textContent = name;
  if (avatarLarge) {
    avatarLarge.textContent = avatar;
    const colors: Record<string, string> = { 
      default: '#4c6ef5', 
      gold: '#FFD700', 
      diamond: '#b9f2ff', 
      legend: '#ff6b6b' 
    };
    avatarLarge.style.borderColor = colors[frame] || '#4c6ef5';
  }
  if (profileName) profileName.textContent = name;
  if (profileId) profileId.textContent = '#' + currentUser.id;
  if (profileBio) profileBio.textContent = bio;
  if (roleBadge) {
    roleBadge.textContent = isAdmin ? '👑 管理员' : '👤 玩家';
    roleBadge.className = 'role-badge ' + (isAdmin ? 'admin' : '');
  }
  
  // 头像框
  document.querySelectorAll('.frame-item').forEach(el => {
    const f = el.getAttribute('data-frame') || 'default';
    el.classList.toggle('active', f === frame);
    const permissions = profile.getFramePermissions();
    const allowed = permissions[f] || [];
    const hasPermission = allowed.length === 0 || allowed.includes(currentUser.id);
    el.classList.toggle('locked', !hasPermission);
  });
  
  // 管理员面板
  if (adminPanel && isAdmin) {
    adminPanel.classList.remove('hidden');
    renderAdminGames();
  } else if (adminPanel) {
    adminPanel.classList.add('hidden');
  }
  
  // 我的游戏
  updateMyGames();

  // ✅ 加载排行榜
  loadRankLists();
}

function updateMyGames() {
  if (!myGameList || !currentUser) return;
  const games = GAME_FILES;
  if (games.length === 0) {
    myGameList.innerHTML = '<div style="color:#6b7a8f;font-size:14px;">暂无游戏</div>';
    return;
  }
  myGameList.innerHTML = games.map(g => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #1f2836;">
      <span>${g.cover || '🎮'} ${g.name}</span>
      <span style="font-size:12px;color:#6b7a8f;">${g.id}</span>
    </div>
  `).join('');
}

async function renderAdminGames() {
  if (!adminGameList) return;
  const configs = await github.getAllGames();
  const games = GAME_FILES.map(g => ({
    ...g,
    ...configs[g.id],
    enabled: configs[g.id]?.enabled ?? true
  }));

  adminGameList.innerHTML = games.map(g => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #1f2836;flex-wrap:wrap;gap:8px;">
      <div>
        <strong>${g.cover} ${g.name}</strong>
        <span style="font-size:12px;color:${g.enabled ? '#4caf50' : '#f44336'};margin-left:8px;">
          ${g.enabled ? '🟢 开放' : '🔴 关闭'}
        </span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm toggle-admin" data-game="${g.id}">
          ${g.enabled ? '关闭' : '开启'}
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.toggle-admin').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-game');
      if (id) {
        const configs = await github.getAllGames();
        const game = configs[id];
        if (game) {
          await github.updateGame(id, { enabled: !game.enabled });
          renderAdminGames();
          showToast('已更新', 'success');
        }
      }
    });
  });
}

// 改名
changeNameBtn?.addEventListener('click', () => {
  if (renameModal) {
    newNameInput.value = currentUser?.name || '';
    renameModal.classList.remove('hidden');
    setTimeout(() => newNameInput.focus(), 100);
  }
});

confirmNameBtn?.addEventListener('click', async () => {
  const newName = newNameInput.value.trim();
  if (!newName || newName.length < 2 || newName.length > 20) {
    showToast('名字长度需为2-20个字符', 'error');
    return;
  }
  const result = profile.updateName(newName);
  showToast(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    currentUser = auth.currentUser;
    updateUI();
    renameModal?.classList.add('hidden');
  }
});

cancelNameBtn?.addEventListener('click', () => {
  renameModal?.classList.add('hidden');
});

renameModal?.addEventListener('click', (e) => {
  if (e.target === renameModal) {
    renameModal.classList.add('hidden');
  }
});

newNameInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    confirmNameBtn?.click();
  }
});

// 换头像
changeAvatarBtn?.addEventListener('click', () => avatarUpload.click());

avatarUpload?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const emojis = ['😊', '😎', '🤖', '👾', '🎮', '⭐', '🌈', '🔥', '💎', '🦊', '🐱', '🐉'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  profile.updateAvatar(randomEmoji);
  currentUser = auth.currentUser;
  updateUI();
  showToast('头像已更换: ' + randomEmoji);
});

// 修改简介
editBioBtn?.addEventListener('click', () => {
  if (!currentUser) return;
  const newBio = prompt('请输入个人简介:', currentUser.bio || '');
  if (newBio !== null) {
    profile.updateBio(newBio);
    currentUser = auth.currentUser;
    updateUI();
    showToast('简介已更新');
  }
});

// 刷新
refreshBtn?.addEventListener('click', async () => {
  const user = await profile.refreshProfile();
  if (user) {
    currentUser = user;
    updateUI();
    showToast('已刷新', 'success');
  }
});

// 头像框
frameSelector?.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('frame-item')) {
    const frame = target.getAttribute('data-frame') || 'default';
    const result = profile.setFrame(frame);
    showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      currentUser = auth.currentUser;
      updateUI();
    }
  }
});

// 退出
logoutBtn?.addEventListener('click', () => {
  auth.logout();
  window.location.href = '/';
});

// 初始化
async function init() {
  const ok = await checkAuth();
  if (!ok) return;
  updateUI();
  initialized = true;
}

init();