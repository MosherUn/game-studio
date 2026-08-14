import { github } from '../api/github';
import { getLocalUsers, saveLocalUsers, getSession, saveSession, clearSession } from '../utils/helpers';
import type { Player, RankStats } from '../types';

export class AuthModule {
  currentUser: Player | null = null;

  async init(): Promise<Player | null> {
    const session = getSession();
    if (session?.id) {
      const localUsers = getLocalUsers();
      let user = localUsers[session.id];
      if (!user) {
        user = await github.getPlayer(session.id);
        if (user) {
          localUsers[session.id] = user;
          saveLocalUsers(localUsers);
        }
      }
      if (user && user.password === session.password) {
        this.currentUser = user;
        return user;
      }
      clearSession();
    }
    this.currentUser = null;
    return null;
  }

  async register(id: string, password: string): Promise<{ success: boolean; message: string; user?: Player }> {
    if (!id || !password) return { success: false, message: '请输入ID和密码' };
    if (id.length < 3) return { success: false, message: 'ID至少3个字符' };
    if (password.length < 4) return { success: false, message: '密码至少4个字符' };

    const localUsers = getLocalUsers();
    if (localUsers[id]) return { success: false, message: 'ID已存在' };

    const gitUser = await github.getPlayer(id);
    if (gitUser) return { success: false, message: 'ID在GitHub中已存在' };

    const allPlayers = await github.getAllPlayers();
    const isFirst = Object.keys(allPlayers).length === 0;

    const initRankStats = (): RankStats => ({
      elo: 1000,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      season: 1,
      seasonStart: new Date(2026, 7, 14).toISOString(),
      lastRank: '无',
      promotionHistory: []
    });

    const user: Player = {
      id,
      password,
      name: '玩家' + id.slice(-4),
      avatar: '👤',
      bio: '欢迎来到游戏工坊！',
      frame: 'default',
      isAdmin: isFirst,
      chessRank: initRankStats(),
      goRank: initRankStats(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localUsers[id] = user;
    saveLocalUsers(localUsers);
    saveSession({ id, password });

    await github.savePlayer(user);

    this.currentUser = user;
    return { success: true, message: isFirst ? '注册成功！你是管理员 🎉' : '注册成功！', user };
  }

  async login(id: string, password: string): Promise<{ success: boolean; message: string; user?: Player }> {
    if (!id || !password) return { success: false, message: '请输入ID和密码' };

    const localUsers = getLocalUsers();
    let user = localUsers[id];

    if (!user) {
      user = await github.getPlayer(id);
      if (user) {
        localUsers[id] = user;
        saveLocalUsers(localUsers);
      }
    }

    if (!user) return { success: false, message: '用户不存在，请先注册' };
    if (user.password !== password) return { success: false, message: '密码错误' };

    saveSession({ id, password });
    this.currentUser = user;
    return { success: true, message: '登录成功！', user };
  }

  logout(): void {
    clearSession();
    this.currentUser = null;
  }

  async refreshFromGit(): Promise<Player | null> {
    if (!this.currentUser) return null;
    const user = await github.getPlayer(this.currentUser.id);
    if (user) {
      const localUsers = getLocalUsers();
      localUsers[user.id] = user;
      saveLocalUsers(localUsers);
      this.currentUser = user;
      return user;
    }
    return null;
  }

  async saveToGit(user: Player): Promise<boolean> {
    return await github.savePlayer(user);
  }

  // ✅ 获取段位排行榜 - 修复类型问题
  async getRankList(gameType: 'chess' | 'go'): Promise<any[]> {
    const allPlayers = await github.getAllPlayers();
    const entries: any[] = [];
    for (const [id, player] of Object.entries(allPlayers)) {
      const typedPlayer = player as Player;
      const rankData = gameType === 'chess' ? typedPlayer.chessRank : typedPlayer.goRank;
      if (rankData && rankData.gamesPlayed > 0) {
        entries.push({
          playerId: id,
          playerName: typedPlayer.name || id,
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
}

export const auth = new AuthModule();