import { auth } from './auth';
import { getLocalUsers, saveLocalUsers } from '../utils/helpers';
import type { Player } from '../types';

export class ProfileModule {
  private framePermissions: Record<string, string[]> = {
    gold: [],
    diamond: ['UID-ADMIN'],
    legend: ['UID-ADMIN']
  };

  updateName(name: string): { success: boolean; message: string } {
    const user = auth.currentUser;
    if (!user) return { success: false, message: '请先登录' };
    if (!name || name.trim().length < 2 || name.trim().length > 20) {
      return { success: false, message: '名字长度需为2-20个字符' };
    }
    user.name = name.trim();
    return this.saveUser(user) ? { success: true, message: '名字已更新' } : { success: false, message: '保存失败' };
  }

  updateAvatar(emoji: string): boolean {
    const user = auth.currentUser;
    if (!user) return false;
    user.avatar = emoji;
    return this.saveUser(user);
  }

  updateBio(bio: string): boolean {
    const user = auth.currentUser;
    if (!user) return false;
    user.bio = bio || '这个人很懒，什么都没写。';
    return this.saveUser(user);
  }

  setFrame(frame: string): { success: boolean; message: string } {
    const user = auth.currentUser;
    if (!user) return { success: false, message: '请先登录' };

    const allowed = this.framePermissions[frame] || [];
    if (allowed.length > 0 && !allowed.includes(user.id)) {
      return { success: false, message: '您没有权限佩戴该头像框' };
    }

    user.frame = frame as any;
    this.saveUser(user);
    return { success: true, message: '头像框已更换' };
  }

  getFramePermissions(): Record<string, string[]> {
    return this.framePermissions;
  }

  private saveUser(user: Player): boolean {
    const localUsers = getLocalUsers();
    localUsers[user.id] = user;
    saveLocalUsers(localUsers);
    auth.currentUser = user;
    auth.saveToGit(user);
    return true;
  }

  async refreshProfile(): Promise<Player | null> {
    return await auth.refreshFromGit();
  }
}

export const profile = new ProfileModule();