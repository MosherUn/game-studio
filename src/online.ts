// ============================================================
// 联机模块 - 使用 BroadcastChannel
// ============================================================

export interface OnlinePlayer {
  id: string;
  name: string;
  isReady: boolean;
}

export interface OnlineRoom {
  id: string;
  hostId: string;
  players: OnlinePlayer[];
  gameType: 'chess' | 'go' | null;
  gameState: any;
}

class OnlineManager {
  private channel: BroadcastChannel | null = null;
  private roomId: string | null = null;
  private isHost: boolean = false;
  private isConnected: boolean = false;
  private players: OnlinePlayer[] = [];
  private localId: string;
  private localName: string = '玩家';
  private gameType: 'chess' | 'go' | null = null;
  
  // 回调
  public onRoomUpdate: ((room: OnlineRoom | null) => void) | null = null;
  public onPlayerJoin: ((player: OnlinePlayer) => void) | null = null;
  public onPlayerLeave: ((playerId: string) => void) | null = null;
  public onGameMove: ((move: any) => void) | null = null;
  public onGameStart: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  constructor() {
    this.localId = 'P' + Math.random().toString(36).substring(2, 6).toUpperCase();
    try {
      // 从 localStorage 获取玩家名
      const session = localStorage.getItem('gameSession');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed && parsed.id) {
          this.localName = parsed.id;
        }
      }
    } catch (e) {}
  }

  // 初始化频道
  private initChannel(roomId: string) {
    if (this.channel) {
      this.channel.close();
    }
    this.channel = new BroadcastChannel(`game-room-${roomId}`);
    this.channel.onmessage = this.handleMessage.bind(this);
  }

  // 处理消息
  private handleMessage(event: MessageEvent) {
    const data = event.data;
    console.log('📨 收到消息:', data);

    switch (data.type) {
      case 'player_join':
        this.handlePlayerJoin(data.player);
        break;
      case 'player_leave':
        this.handlePlayerLeave(data.playerId);
        break;
      case 'game_move':
        if (this.onGameMove) this.onGameMove(data.move);
        break;
      case 'game_start':
        if (this.onGameStart) this.onGameStart();
        break;
      case 'host_change':
        this.isHost = data.newHostId === this.localId;
        break;
      case 'room_update':
        if (this.onRoomUpdate) {
          this.onRoomUpdate({
            id: this.roomId!,
            hostId: data.hostId,
            players: this.players,
            gameType: this.gameType,
            gameState: data.gameState
          });
        }
        break;
    }
  }

  // 处理玩家加入
  private handlePlayerJoin(player: OnlinePlayer) {
    // 检查是否已存在
    const exists = this.players.find(p => p.id === player.id);
    if (!exists) {
      this.players.push(player);
      console.log(`👤 玩家加入: ${player.name} (${player.id})`);
      if (this.onPlayerJoin) this.onPlayerJoin(player);
      this.broadcastRoomUpdate();
    }
  }

  // 处理玩家离开
  private handlePlayerLeave(playerId: string) {
    this.players = this.players.filter(p => p.id !== playerId);
    console.log(`👋 玩家离开: ${playerId}`);
    if (this.onPlayerLeave) this.onPlayerLeave(playerId);
    this.broadcastRoomUpdate();
  }

  // 广播房间更新
  private broadcastRoomUpdate() {
    if (this.channel && this.isHost) {
      this.channel.postMessage({
        type: 'room_update',
        hostId: this.isHost ? this.localId : null,
        players: this.players,
        gameState: null
      });
    }
    if (this.onRoomUpdate) {
      this.onRoomUpdate({
        id: this.roomId!,
        hostId: this.isHost ? this.localId : this.players[0]?.id || '',
        players: this.players,
        gameType: this.gameType,
        gameState: null
      });
    }
  }

  // ✅ 创建房间
  createRoom(gameType: 'chess' | 'go' = 'chess'): { success: boolean; roomId: string; message?: string } {
    if (this.isConnected) {
      return { success: false, roomId: '', message: '已在房间中' };
    }

    this.roomId = 'ROOM-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    this.isHost = true;
    this.isConnected = true;
    this.gameType = gameType;
    this.players = [
      { id: this.localId, name: this.localName, isReady: true }
    ];

    this.initChannel(this.roomId);

    // 广播房间创建
    this.channel!.postMessage({
      type: 'room_update',
      hostId: this.localId,
      players: this.players,
      gameState: null
    });

    console.log(`🏠 房间已创建: ${this.roomId}`);
    if (this.onRoomUpdate) {
      this.onRoomUpdate({
        id: this.roomId,
        hostId: this.localId,
        players: this.players,
        gameType: this.gameType,
        gameState: null
      });
    }

    return { success: true, roomId: this.roomId };
  }

  // ✅ 加入房间 - 带检测
  joinRoom(roomId: string): { success: boolean; message: string } {
    if (this.isConnected) {
      return { success: false, message: '已在房间中' };
    }

    // 检查房间是否存在（尝试连接）
    try {
      const testChannel = new BroadcastChannel(`game-room-${roomId}`);
      // 发送检查请求
      testChannel.postMessage({
        type: 'check_room',
        from: this.localId
      });

      // 设置超时检测
      let responded = false;
      const timeout = setTimeout(() => {
        if (!responded) {
          testChannel.close();
          if (this.onError) this.onError('房间不存在或已关闭');
        }
      }, 3000);

      // 监听响应
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'room_exists') {
          responded = true;
          clearTimeout(timeout);
          testChannel.close();
          
          // 真正加入房间
          this.roomId = roomId;
          this.isHost = false;
          this.isConnected = true;
          this.initChannel(roomId);
          
          // 发送加入请求
          this.channel!.postMessage({
            type: 'player_join',
            player: { id: this.localId, name: this.localName, isReady: false }
          });

          // 获取当前房间状态
          setTimeout(() => {
            this.channel!.postMessage({
              type: 'get_room_state',
              from: this.localId
            });
          }, 100);

          console.log(`🔗 已加入房间: ${roomId}`);
          if (this.onRoomUpdate) {
            this.onRoomUpdate({
              id: this.roomId,
              hostId: '',
              players: this.players,
              gameType: this.gameType,
              gameState: null
            });
          }
        }
      };

      testChannel.onmessage = handler;

      // 发送检查请求
      testChannel.postMessage({
        type: 'check_room',
        from: this.localId
      });

      return { success: true, message: '正在加入房间...' };
    } catch (e) {
      return { success: false, message: '房间不存在' };
    }
  }

  // 离开房间
  leaveRoom() {
    if (this.channel) {
      // 通知其他玩家
      this.channel.postMessage({
        type: 'player_leave',
        playerId: this.localId
      });
      this.channel.close();
      this.channel = null;
    }

    this.roomId = null;
    this.isHost = false;
    this.isConnected = false;
    this.players = [];
    this.gameType = null;

    console.log('🚪 已离开房间');
    if (this.onRoomUpdate) this.onRoomUpdate(null);
  }

  // 发送走棋
  sendMove(move: any) {
    if (!this.isConnected || !this.channel) {
      if (this.onError) this.onError('未连接到房间');
      return false;
    }

    this.channel.postMessage({
      type: 'game_move',
      move: move
    });
    return true;
  }

  // 开始游戏
  startGame() {
    if (!this.isHost) {
      if (this.onError) this.onError('只有房主可以开始游戏');
      return false;
    }

    if (this.channel) {
      this.channel.postMessage({
        type: 'game_start'
      });
    }
    if (this.onGameStart) this.onGameStart();
    return true;
  }

  // 获取状态
  getStatus() {
    return {
      isConnected: this.isConnected,
      isHost: this.isHost,
      roomId: this.roomId,
      playerCount: this.players.length,
      players: this.players,
      gameType: this.gameType
    };
  }

  // 设置玩家准备状态
  setReady(ready: boolean) {
    const player = this.players.find(p => p.id === this.localId);
    if (player) {
      player.isReady = ready;
      this.broadcastRoomUpdate();
    }
  }
}

// 导出单例
export const online = new OnlineManager();

// 在页面加载时清理旧连接
window.addEventListener('beforeunload', () => {
  online.leaveRoom();
});