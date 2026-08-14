import './style.css';
import { auth } from './modules/auth';
import { gameStudio } from './modules/game-studio';
import { profile } from './modules/profile';
import { github } from './api/github';
import { getSession, getPlayerId, GAME_FILES, showToast } from './utils/helpers';
import type { Player, GameConfig, GameData } from './types';

// ===== DOM 引用（使用非空断言） =====
const topNav = document.getElementById('topNav')!;
const pageLogin = document.getElementById('pageLogin')!;
const pageStudio = document.getElementById('pageStudio')!;
const pageProfile = document.getElementById('pageProfile')!;

const loginId = document.getElementById('loginId') as HTMLInputElement;
const loginPwd = document.getElementById('loginPwd') as HTMLInputElement;
const loginBtn = document.getElementById('loginBtn')!;
const registerBtn = document.getElementById('registerBtn')!;
const loginMessage = document.getElementById('loginMessage')!;
const logoutBtn = document.getElementById('logoutBtn')!;

const navAvatar = document.getElementById('navAvatar')!;
const navUserName = document.getElementById('navUserName')!;
const showProfileBtn = document.getElementById('showProfileBtn')!;
const backToStudioBtn = document.getElementById('backToStudioBtn')!;

const menuAll = document.getElementById('menuAll')!;
const menuMy = document.getElementById('menuMy')!;
const menuAdmin = document.getElementById('menuAdmin')!;
const gameList = document.getElementById('gameList')!;
const gameCount = document.getElementById('gameCount')!;
const panelTitle = document.getElementById('panelTitle')!;
const panelCount = document.getElementById('panelCount')!;
const refreshBtn = document.getElementById('refreshBtn')!;

const modal = document.getElementById('gameModal')!;
const modalTitle = document.getElementById('modalTitle')!;
const gameFrame = document.getElementById('gameFrame') as HTMLIFrameElement;
const modalClose = document.getElementById('modalClose')!;

const avatarLarge = document.getElementById('avatarLarge')!;
const profileName = document.getElementById('profileName')!;
const profileId = document.getElementById('profileId')!;
const profileBio = document.getElementById('profileBio')!;
const roleBadge = document.getElementById('roleBadge')!;
const changeAvatarBtn = document.getElementById('changeAvatarBtn')!;
const avatarUpload = document.getElementById('avatarUpload') as HTMLInputElement;
const editBioBtn = document.getElementById('editBioBtn')!;
const refreshProfileBtn = document.getElementById('refreshProfileBtn')!;
const frameSelector = document.getElementById('frameSelector')!;
const adminPanel = document.getElementById('adminPanel')!;
const adminGameList = document.getElementById('adminGameList')!;

// ===== 状态 =====
let currentFilter: 'all' | 'my' | 'admin' = 'all';
let gameConfigs: GameData = {};
let currentUser: Player | null = null;
let isReady = false;

// ===== 页面切换 =====
function showPage(page: 'login' | 'studio' | 'profile') {
    pageLogin.style.display = page === 'login' ? 'block' : 'none';
    pageStudio.style.display = page === 'studio' ? 'block' : 'none';
    pageProfile.style.display = page === 'profile' ? 'block' : 'none';
    topNav.style.display = page === 'login' ? 'none' : 'flex';
}

// ===== 认证 =====
function showMessage(msg: string, type: 'success' | 'error' = 'success') {
    loginMessage.textContent = msg;
    loginMessage.className = 'login-message ' + type;
    loginMessage.style.display = 'block';
    setTimeout(() => {
        loginMessage.style.display = 'none';
    }, 3000);
}

// 登录
loginBtn.addEventListener('click', async () => {
    const id = loginId.value.trim();
    const pwd = loginPwd.value.trim();
    if (!id || !pwd) {
        showMessage('请输入ID和密码', 'error');
        return;
    }
    const result = await auth.login(id, pwd);
    showMessage(result.message, result.success ? 'success' : 'error');
    if (result.success) {
        currentUser = result.user || null;
        isReady = true;
        updateUI();
        showPage('studio');
        await loadGameConfigs();
        renderGameList('all');
    }
});

// 注册
registerBtn.addEventListener('click', async () => {
    const id = loginId.value.trim();
    const pwd = loginPwd.value.trim();
    if (!id || !pwd) {
        showMessage('请输入ID和密码', 'error');
        return;
    }
    const result = await auth.register(id, pwd);
    showMessage(result.message, result.success ? 'success' : 'error');
    if (result.success) {
        currentUser = result.user || null;
        isReady = true;
        updateUI();
        showPage('studio');
        await loadGameConfigs();
        renderGameList('all');
    }
});

// 退出
logoutBtn.addEventListener('click', () => {
    auth.logout();
    currentUser = null;
    isReady = false;
    showPage('login');
    loginId.value = '';
    loginPwd.value = '';
});

// 切换页面
showProfileBtn.addEventListener('click', () => {
    showPage('profile');
    updateProfileUI();
});

backToStudioBtn.addEventListener('click', () => {
    showPage('studio');
    renderGameList(currentFilter);
});

// ===== 游戏工坊 =====
async function loadGameConfigs() {
    gameConfigs = await github.getAllGames() || {};
    return gameConfigs;
}

function getGameList(filter: 'all' | 'my' | 'admin') {
    const user = currentUser;
    if (!user) return [];

    const games = GAME_FILES.map(g => {
        const config = gameConfigs[g.id];
        return {
            ...g,
            enabled: config?.enabled ?? true,
            whitelist: config?.whitelist ?? [],
            blacklist: config?.blacklist ?? [],
            authorId: config?.authorId ?? 'system'
        };
    });

    if (filter === 'all') return games;
    if (filter === 'my') {
        return games.filter(g => {
            if (!g.enabled) return false;
            if (g.blacklist.includes(user.id)) return false;
            if (g.whitelist.length > 0 && !g.whitelist.includes(user.id)) return false;
            return true;
        });
    }
    if (filter === 'admin') return games;
    return [];
}

function renderGameList(filter: 'all' | 'my' | 'admin' = 'all') {
    const games = getGameList(filter);
    const user = currentUser;
    
    gameCount.textContent = `${games.length} 个游戏`;
    panelCount.textContent = `${games.length} 个`;
    
    const titles = { all: '🎯 全部游戏', my: '📌 可游玩', admin: '⚙️ 管理游戏' };
    panelTitle.textContent = titles[filter] || '游戏';

    if (games.length === 0) {
        gameList.innerHTML = `<div style="text-align:center;color:#6b7a8f;padding:40px 0;">${filter === 'my' ? '暂无可游玩的游戏' : '暂无游戏'}</div>`;
        return;
    }

    gameList.innerHTML = games.map(g => {
        const isAdmin = user?.isAdmin || false;
        const status = g.enabled ? '🟢 开放' : '🔴 关闭';
        
        return `
            <div class="game-item" data-game-id="${g.id}">
                <div class="game-info">
                    <h4>${g.cover || '🎮'} ${g.name}</h4>
                    <p>${g.description || '无简介'} · ${status}</p>
                </div>
                <div class="game-actions">
                    ${filter === 'admin' && isAdmin ? `
                        <button class="btn btn-outline btn-sm toggle-btn" data-game="${g.id}">${g.enabled ? '🔴 关闭' : '🟢 开启'}</button>
                        <button class="btn btn-outline btn-sm whitelist-btn" data-game="${g.id}">📋 白名单</button>
                        <button class="btn btn-outline btn-sm blacklist-btn" data-game="${g.id}">🚫 黑名单</button>
                    ` : ''}
                    ${g.enabled ? `<button class="btn btn-primary btn-sm play-btn" data-game="${g.id}">▶️ 游玩</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // 事件绑定 - 游玩
    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.target as HTMLElement).getAttribute('data-game');
            if (id) openGame(id);
        });
    });

    // 事件绑定 - 切换开关 (管理员)
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.target as HTMLElement).getAttribute('data-game');
            if (id) {
                const game = gameConfigs[id];
                if (game) {
                    const newEnabled = !game.enabled;
                    const success = await github.updateGame(id, { enabled: newEnabled });
                    if (success) {
                        gameConfigs[id].enabled = newEnabled;
                        renderGameList(currentFilter);
                    }
                }
            }
        });
    });

    // 事件绑定 - 白名单管理 (管理员)
    document.querySelectorAll('.whitelist-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.target as HTMLElement).getAttribute('data-game');
            if (id && currentUser?.isAdmin) {
                const game = gameConfigs[id];
                if (game) {
                    const current = game.whitelist?.join(', ') || '';
                    const input = prompt('白名单 (玩家ID用逗号分隔):', current);
                    if (input !== null) {
                        const whitelist = input.split(',').map(s => s.trim()).filter(Boolean);
                        const success = await github.updateGame(id, { whitelist });
                        if (success) {
                            gameConfigs[id].whitelist = whitelist;
                            renderGameList(currentFilter);
                        }
                    }
                }
            }
        });
    });

    // 事件绑定 - 黑名单管理 (管理员)
    document.querySelectorAll('.blacklist-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.target as HTMLElement).getAttribute('data-game');
            if (id && currentUser?.isAdmin) {
                const game = gameConfigs[id];
                if (game) {
                    const current = game.blacklist?.join(', ') || '';
                    const input = prompt('黑名单 (玩家ID用逗号分隔):', current);
                    if (input !== null) {
                        const blacklist = input.split(',').map(s => s.trim()).filter(Boolean);
                        const success = await github.updateGame(id, { blacklist });
                        if (success) {
                            gameConfigs[id].blacklist = blacklist;
                            renderGameList(currentFilter);
                        }
                    }
                }
            }
        });
    });
}

function openGame(gameId: string) {
    const game = GAME_FILES.find(g => g.id === gameId);
    if (!game) { showToast('游戏不存在', 'error'); return; }

    const config = gameConfigs[gameId];
    if (config) {
        const user = currentUser;
        if (!user) return;
        if (!config.enabled) { showToast('该游戏已关闭', 'error'); return; }
        if (config.blacklist?.includes(user.id)) { showToast('你已被加入该游戏的黑名单', 'error'); return; }
        if (config.whitelist?.length > 0 && !config.whitelist.includes(user.id)) {
            showToast('你没有权限游玩该游戏', 'error');
            return;
        }
    }

    modalTitle.textContent = game.name;
    if (gameFrame) gameFrame.src = `/gameList/${game.file}`;
    modal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => {
    modal.classList.add('hidden');
    if (gameFrame) gameFrame.src = 'about:blank';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
        if (gameFrame) gameFrame.src = 'about:blank';
    }
});

// ===== 菜单事件 =====
menuAll.addEventListener('click', () => {
    menuAll.classList.add('active');
    menuMy.classList.remove('active');
    menuAdmin.classList.remove('active');
    currentFilter = 'all';
    renderGameList('all');
});

menuMy.addEventListener('click', () => {
    menuMy.classList.add('active');
    menuAll.classList.remove('active');
    menuAdmin.classList.remove('active');
    currentFilter = 'my';
    renderGameList('my');
});

menuAdmin.addEventListener('click', () => {
    if (!currentUser?.isAdmin) {
        showToast('只有管理员可以访问管理功能', 'error');
        return;
    }
    menuAdmin.classList.add('active');
    menuAll.classList.remove('active');
    menuMy.classList.remove('active');
    currentFilter = 'admin';
    renderGameList('admin');
});

refreshBtn.addEventListener('click', async () => {
    await loadGameConfigs();
    renderGameList(currentFilter);
    showToast('已刷新', 'success');
});

// ===== 个人资料 =====
function updateUI() {
    const user = currentUser;
    if (!user) return;
    navAvatar.textContent = user.avatar || '👤';
    navUserName.textContent = user.name || '玩家';
    updateProfileUI();
}

function updateProfileUI() {
    const user = currentUser;
    if (!user) return;
    
    const avatar = user.avatar || '👤';
    const name = user.name || '玩家';
    const bio = user.bio || '这个人很懒，什么都没写。';
    const frame = user.frame || 'default';
    
    avatarLarge.textContent = avatar;
    const colors: Record<string, string> = { default: '#4c6ef5', gold: '#FFD700', diamond: '#b9f2ff', legend: '#ff6b6b' };
    avatarLarge.style.borderColor = colors[frame] || '#4c6ef5';
    
    profileName.textContent = name;
    profileId.textContent = '#' + user.id;
    profileBio.textContent = bio;
    roleBadge.textContent = user.isAdmin ? '👑 管理员' : '👤 玩家';
    roleBadge.className = 'role-badge ' + (user.isAdmin ? 'admin' : '');
    
    // 头像框
    document.querySelectorAll('.frame-item').forEach(el => {
        const f = el.getAttribute('data-frame') || 'default';
        el.classList.toggle('active', f === frame);
        const hasPermission = f === 'default' || f === 'gold' || user.id === 'UID-ADMIN' || user.isAdmin;
        el.classList.toggle('locked', !hasPermission);
    });
    
    // 管理员面板
    if (user.isAdmin) {
        adminPanel.classList.remove('hidden');
        renderAdminGames();
    } else {
        adminPanel.classList.add('hidden');
    }
}

async function renderAdminGames() {
    const configs = await github.getAllGames();
    const games = GAME_FILES.map(g => ({
        ...g,
        ...configs[g.id],
        enabled: configs[g.id]?.enabled ?? true,
        whitelist: configs[g.id]?.whitelist ?? [],
        blacklist: configs[g.id]?.blacklist ?? []
    }));

    adminGameList.innerHTML = games.map(g => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #1f2836;flex-wrap:wrap;gap:8px;">
            <div>
                <strong>${g.cover} ${g.name}</strong>
                <span style="font-size:12px;color:${g.enabled ? '#4caf50' : '#f44336'};margin-left:8px;">${g.enabled ? '🟢 开放' : '🔴 关闭'}</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm toggle-admin" data-game="${g.id}">${g.enabled ? '关闭' : '开启'}</button>
                <button class="btn btn-outline btn-sm whitelist-admin" data-game="${g.id}">📋 白名单</button>
                <button class="btn btn-outline btn-sm blacklist-admin" data-game="${g.id}">🚫 黑名单</button>
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
                    const newEnabled = !game.enabled;
                    await github.updateGame(id, { enabled: newEnabled });
                    renderAdminGames();
                }
            }
        });
    });

    document.querySelectorAll('.whitelist-admin').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.target as HTMLElement).getAttribute('data-game');
            if (id) {
                const configs = await github.getAllGames();
                const game = configs[id];
                if (game) {
                    const current = game.whitelist?.join(', ') || '';
                    const input = prompt('白名单 (玩家ID用逗号分隔):', current);
                    if (input !== null) {
                        const whitelist = input.split(',').map(s => s.trim()).filter(Boolean);
                        await github.updateGame(id, { whitelist });
                        renderAdminGames();
                    }
                }
            }
        });
    });

    document.querySelectorAll('.blacklist-admin').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.target as HTMLElement).getAttribute('data-game');
            if (id) {
                const configs = await github.getAllGames();
                const game = configs[id];
                if (game) {
                    const current = game.blacklist?.join(', ') || '';
                    const input = prompt('黑名单 (玩家ID用逗号分隔):', current);
                    if (input !== null) {
                        const blacklist = input.split(',').map(s => s.trim()).filter(Boolean);
                        await github.updateGame(id, { blacklist });
                        renderAdminGames();
                    }
                }
            }
        });
    });
}

// ===== 个人资料事件 =====
changeAvatarBtn.addEventListener('click', () => avatarUpload.click());

avatarUpload.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const emojis = ['😊', '😎', '🤖', '👾', '🎮', '⭐', '🌈', '🔥', '💎', '🦊', '🐱', '🐉'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    if (currentUser) {
        currentUser.avatar = randomEmoji;
        await auth.saveToGit(currentUser);
        updateUI();
        showToast('头像已更换: ' + randomEmoji, 'success');
    }
});

editBioBtn.addEventListener('click', () => {
    if (!currentUser) return;
    const newBio = prompt('请输入个人简介:', currentUser.bio || '');
    if (newBio !== null) {
        currentUser.bio = newBio;
        auth.saveToGit(currentUser);
        updateUI();
        showToast('简介已更新', 'success');
    }
});

refreshProfileBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const user = await auth.refreshFromGit();
    if (user) {
        currentUser = user;
        updateUI();
        showToast('已刷新', 'success');
    }
});

frameSelector.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('frame-item')) {
        const frame = target.getAttribute('data-frame') || 'default';
        if (currentUser) {
            const hasPermission = frame === 'default' || frame === 'gold' || currentUser.id === 'UID-ADMIN' || currentUser.isAdmin;
            if (!hasPermission) {
                showToast('您没有权限佩戴该头像框', 'error');
                return;
            }
            currentUser.frame = frame as any;
            auth.saveToGit(currentUser);
            updateUI();
            showToast('头像框已更换', 'success');
        }
    }
});

// ===== 初始化 =====
async function init() {
    console.log('🚀 应用初始化...');
    
    // 检查GitHub连接
    if (!github.isConfigured()) {
        console.warn('⚠️ GitHub未配置，请检查 .env 文件');
        showPage('login');
        return;
    }
    
    const connected = await github.testConnection();
    console.log(connected ? '✅ GitHub已连接' : '❌ GitHub连接失败');
    
    // 检查是否有保存的会话
    const session = getSession();
    if (session) {
        try {
            const { id, password } = session;
            if (id && password) {
                const user = await github.getPlayer(id);
                if (user && user.password === password) {
                    currentUser = user;
                    isReady = true;
                    updateUI();
                    showPage('studio');
                    await loadGameConfigs();
                    renderGameList('all');
                    console.log('✅ 会话恢复成功');
                    return;
                }
            }
        } catch (e) {
            console.warn('会话恢复失败:', e);
        }
        // 清除无效会话
        localStorage.removeItem('gameSession');
    }
    
    // 未登录，显示登录页面
    showPage('login');
    console.log('📱 显示登录页面');
}

// 启动应用
init();