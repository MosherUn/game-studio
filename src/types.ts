export interface Player {
  id: string;
  password: string;
  name: string;
  avatar: string;
  bio: string;
  frame: 'default' | 'gold' | 'diamond' | 'legend';
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  file: string;
  cover: string;
  enabled: boolean;
  whitelist: string[];
  blacklist: string[];
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerData {
  [id: string]: Player;
}

export interface GameData {
  [gameId: string]: GameConfig;
}