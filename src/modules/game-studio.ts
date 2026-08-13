import { github } from '../api/github';
import { auth } from './auth';
import { generateId, getLocalUsers, saveLocalUsers } from '../utils/helpers';
import type { GameConfig } from '../types';

export class GameStudio {
  currentGame: GameConfig | null = null;
  onGameChange: ((game: GameConfig | null) => void) | null = null;

  createGame(): GameConfig {
    const id = 'GAME-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const game: GameConfig = {
      id,
      name: '我的新游戏',
      desc: '一个有趣的沙盒游戏',
      cover: '🎮',
      gallery: ['🖼️1', '🖼️2', '🖼️3'],
      whitelist: [],
      blacklist: [],
      apiConfig: 'https://api.example.com/game',
      code: `// 沙盒环境\nconst playerId = getPlayerId();\nconsole.log("玩家ID:", playerId);\n\n// 游戏逻辑\nfunction init() {\n  console.log("游戏启动!");\n}`,
      authorId: auth.currentUser?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.currentGame = game;
    this.onGameChange?.(game);
    return game;
  }

  loadGame(gameId: string): GameConfig | null {
    const user = auth.currentUser;
    if (!user) return null;
    const game = user.games?.[gameId];
    if (game) {
      this.currentGame = game;
      this.onGameChange?.(game);
      return game;
    }
    return null;
  }

  saveGame(game: GameConfig): boolean {
    const user = auth.currentUser;
    if (!user) return false;

    game.updatedAt = new Date().toISOString();
    if (!user.games) user.games = {};
    user.games[game.id] = game;

    // 保存到本地
    const localUsers = getLocalUsers();
    localUsers[user.id] = user;
    saveLocalUsers(localUsers);

    // 异步同步到GitHub
    auth.saveToGit(user).then(success => {
      if (success) console.log('✅ 游戏已同步到GitHub');
      else console.warn('⚠️ 游戏同步到GitHub失败');
    });

    this.currentGame = game;
    this.onGameChange?.(game);
    return true;
  }

  deleteGame(gameId: string): boolean {
    const user = auth.currentUser;
    if (!user || !user.games) return false;
    delete user.games[gameId];

    const localUsers = getLocalUsers();
    localUsers[user.id] = user;
    saveLocalUsers(localUsers);
    auth.saveToGit(user);

    this.currentGame = null;
    this.onGameChange?.(null);
    return true;
  }

  getGames(): GameConfig[] {
    const user = auth.currentUser;
    if (!user || !user.games) return [];
    return Object.values(user.games);
  }

  async syncFromGit(): Promise<GameConfig[]> {
    const user = await auth.refreshFromGit();
    if (user && user.games) {
      return Object.values(user.games);
    }
    return [];
  }

  getSandboxCode(): string {
    return this.currentGame?.code || '// 没有游戏代码';
  }

  // 沙盒执行器 - 安全的代码执行环境
  executeSandbox(code: string, context: any): any {
    const sandbox = {
      console: {
        log: (...args: any[]) => console.log('[沙盒]', ...args),
        error: (...args: any[]) => console.error('[沙盒]', ...args),
        warn: (...args: any[]) => console.warn('[沙盒]', ...args)
      },
      getPlayerId: () => auth.currentUser?.id || 'GUEST',
      getGameConfig: () => this.currentGame,
      ...context
    };

    try {
      const fn = new Function(...Object.keys(sandbox), `"use strict";\n${code}`);
      return fn(...Object.values(sandbox));
    } catch (error) {
      console.error('沙盒执行错误:', error);
      return { error: (error as Error).message };
    }
  }
}

export const gameStudio = new GameStudio();