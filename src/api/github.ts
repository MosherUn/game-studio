/// <reference types="vite/client" />

import type { PlayerData, GameData, Player, GameConfig } from '../types';

export class GitHubAPI {
  private token: string;
  private owner: string;
  private repo: string;
  private playerFile: string = 'playerData.json';
  private gameFile: string = 'gameConfig.json';
  private branch: string = 'main';

  constructor() {
    this.token = (import.meta as any).env?.VITE_GITHUB_TOKEN || '';
    this.owner = (import.meta as any).env?.VITE_REPO_OWNER || '';
    this.repo = (import.meta as any).env?.VITE_DATA_REPO || 'game-data';
  }

  isConfigured(): boolean {
    return !!(this.token && this.owner);
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${this.token}` }
      });
      return res.ok;
    } catch { return false; }
  }

  private async getFileSha(path: string): Promise<string | null> {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`,
        { headers: { Authorization: `token ${this.token}` } }
      );
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const data = await res.json();
      return data.sha;
    } catch { return null; }
  }

  async readData<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`,
        { headers: { Authorization: `token ${this.token}` } }
      );
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const data = await res.json();
      const content = atob(data.content);
      return JSON.parse(content);
    } catch { return null; }
  }

  async writeData(path: string, data: any): Promise<boolean> {
    try {
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      const sha = await this.getFileSha(path);
      const body: any = {
        message: `更新数据 ${new Date().toISOString()}`,
        content,
        branch: this.branch
      };
      if (sha) body.sha = sha;

      const res = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `token ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );
      return res.ok;
    } catch { return false; }
  }

  async getPlayer(id: string): Promise<Player | null> {
    const data = await this.readData<PlayerData>(this.playerFile);
    return data?.[id] || null;
  }

  async savePlayer(player: Player): Promise<boolean> {
    const data = await this.readData<PlayerData>(this.playerFile) || {};
    data[player.id] = player;
    return this.writeData(this.playerFile, data);
  }

  async getAllPlayers(): Promise<PlayerData> {
    return await this.readData<PlayerData>(this.playerFile) || {};
  }

  async getGameConfig(id: string): Promise<GameConfig | null> {
    const data = await this.readData<GameData>(this.gameFile);
    return data?.[id] || null;
  }

  async getAllGames(): Promise<GameData> {
    return await this.readData<GameData>(this.gameFile) || {};
  }

  async saveGame(game: GameConfig): Promise<boolean> {
    const data = await this.readData<GameData>(this.gameFile) || {};
    data[game.id] = game;
    return this.writeData(this.gameFile, data);
  }

  async deleteGame(gameId: string): Promise<boolean> {
    const data = await this.readData<GameData>(this.gameFile) || {};
    delete data[gameId];
    return this.writeData(this.gameFile, data);
  }

  async updateGame(gameId: string, updates: Partial<GameConfig>): Promise<boolean> {
    const data = await this.readData<GameData>(this.gameFile) || {};
    if (!data[gameId]) return false;
    data[gameId] = { ...data[gameId], ...updates, updatedAt: new Date().toISOString() };
    return this.writeData(this.gameFile, data);
  }
}

export const github = new GitHubAPI();