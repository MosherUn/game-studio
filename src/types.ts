export interface Player {
  id: string;
  password: string;
  name: string;
  avatar: string;
  bio: string;
  frame: 'default' | 'gold' | 'diamond' | 'legend';
  isAdmin: boolean;
  games?: Record<string, GameConfig>;
  chessRank?: RankStats;  // 象棋段位数据
  goRank?: RankStats;     // 围棋段位数据
  createdAt: string;
  updatedAt: string;
}

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  cover: string;
  gallery: string[];
  whitelist: string[];
  blacklist: string[];
  apiConfig: string;
  code: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankStats {
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  season: number;
  seasonStart: string;
  lastRank: string;
  promotionHistory: PromotionRecord[];
}

export interface PromotionRecord {
  from: string;
  to: string;
  date: string;
  type: '晋升' | '降级' | '赛季降段' | '定段赛晋升';
}

export interface RankEntry {
  playerId: string;
  playerName: string;
  rank: string;
  elo: number;
  games: number;
  winRate: number;
}