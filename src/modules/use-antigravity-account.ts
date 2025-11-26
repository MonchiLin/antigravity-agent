import {create} from 'zustand';
import {invoke} from '@tauri-apps/api/core';
import {logger} from '../utils/logger.ts';
import type {AntigravityCurrentUserInfo, BackupCurrentAccountResult} from '../types/tauri.ts';
import {AccountCommands} from '@/commands/AccountCommands.ts';
import type {AntigravityAccount, AntigravityAuthInfo} from '@/commands/types/account.types.ts';

// 常量定义
const FILE_WRITE_DELAY_MS = 500; // 等待文件写入完成的延迟时间

// Store 状态
export interface UserStoreState {
  users: AntigravityAccount[];
  isLoading: boolean;
}

// Store Actions
export interface UserStoreActions {
  // 基础操作
  delete: (email: string) => Promise<void>;
  insertOrUpdateCurrent: () => Promise<void>;
  switchUser: (email: string) => Promise<void>;
  getCurrentUser: () => Promise<AntigravityAuthInfo | null>;

  // 批量操作
  clearAllUsers: () => Promise<void>;

  // 查询
  getUsers: () => Promise<AntigravityAccount[]>;
  searchUsers: (keyword: string) => AntigravityAccount[];
}

// 创建 Store
export const useAntigravityAccount = create<UserStoreState & UserStoreActions>()((set, get) => ({
  // 初始状态
  users: [],
  isLoading: false,

  // ============ 基础操作 ============
  delete: async (email: string): Promise<void> => {
    logger.info('开始删除用户', { module: 'UserManagement', email });

    try {
      // 调用 Tauri 删除命令，与 ManageSection 保持一致
      await invoke('delete_backup', { name: email });

      // 删除成功后重新获取数据
      const accounts = await AccountCommands.getAccounts();
      set({ users: accounts });

      logger.info('用户删除成功', { module: 'UserManagement', email, remainingUsers: accounts.length });
    } catch (error) {
      logger.error('用户删除失败', {
        module: 'UserManagement',
        email,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },

  insertOrUpdateCurrent: async (): Promise<void> => {
    logger.info('开始备份当前用户', { module: 'UserManagement' });

    try {
      // 1. 获取当前 Antigravity 用户信息
      const currentInfo = await invoke<AntigravityCurrentUserInfo>('get_current_antigravity_info');

      // 2. 检查是否有有效的用户信息（通过API Key或用户状态判断）
      if (currentInfo && (currentInfo.apiKey || currentInfo.userStatusProtoBinaryBase64)) {
        // 3. 从认证信息中提取邮箱
        const userEmail = currentInfo.email;

        logger.info('检测到已登录用户，开始备份', {
          module: 'UserManagement',
          email: userEmail,
          hasApiKey: !!currentInfo.apiKey,
          hasUserStatus: !!currentInfo.userStatusProtoBinaryBase64
        });

        // 4. 执行备份操作
        const result = await invoke<BackupCurrentAccountResult>('backup_antigravity_current_account', {
          email: userEmail
        });

        // 5. 等待文件写入完成
        await new Promise(resolve => setTimeout(resolve, FILE_WRITE_DELAY_MS));

        // 6. 重新获取用户列表
        const accounts = await AccountCommands.getAccounts();
        set({ users: accounts });

        logger.info('当前用户备份成功', {
          module: 'UserManagement',
          email: userEmail,
          result,
          totalUsers: accounts.length
        });
      } else {
        logger.warn('未检测到已登录的用户', {
          module: 'UserManagement',
          hasApiKey: !!currentInfo.apiKey,
          hasUserStatus: !!currentInfo.userStatusProtoBinaryBase64
        });
        throw new Error('未检测到已登录的用户');
      }
    } catch (error) {
      logger.error('备份当前用户失败', {
        module: 'UserManagement',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },

  switchUser: async (email: string): Promise<void> => {
    logger.info('开始切换用户', { module: 'UserManagement', email });

    try {
      // 调用后端切换用户命令
      const result = await invoke<string>('switch_to_antigravity_account', {
        accountName: email
      });

      logger.info('切换用户成功', { module: 'UserManagement', email, result });
    } catch (error) {
      logger.error('切换用户失败', {
        module: 'UserManagement',
        email,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },

  getCurrentUser: async (): Promise<AntigravityAuthInfo> => {
    logger.info('开始获取当前用户', { module: 'UserManagement' });

    try {
      // 复用已封装的 AccountCommands
      const currentInfo = await AccountCommands.getCurrentInfo();

      // 直接检查 email 字段
      if (currentInfo) {
        logger.info('成功获取当前用户', {
          module: 'UserManagement',
          email: currentInfo.email
        });
        return currentInfo;
      }

      logger.warn('未找到当前登录用户', { module: 'UserManagement' });
      return null;
    } catch (error) {
      logger.error('获取当前用户失败', {
        module: 'UserManagement',
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  },

  // ============ 批量操作 ============

  clearAllUsers: async (): Promise<void> => {
    logger.info('开始清空所有用户', { module: 'UserManagement' });

    try {
      // 调用清空所有备份的命令
      await invoke<string>('clear_all_backups');

      // 清空成功后重新获取数据
      const accounts = await AccountCommands.getAccounts();
      set({ users: accounts });

      logger.info('清空所有用户成功', { module: 'UserManagement', clearedCount: accounts.length });
    } catch (error) {
      logger.error('清空所有用户失败', {
        module: 'UserManagement',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },

  // ============ 查询 ============
  getUsers: async (): Promise<AntigravityAccount[]> => {
    logger.info('获取用户列表', { module: 'UserManagement' });

    try {
      // 从后端获取账户列表
      const accounts = await AccountCommands.getAccounts();

      // 同步更新 store 中的状态
      set({ users: accounts });

      logger.info('获取用户列表成功', { module: 'UserManagement', userCount: accounts.length });
      return accounts;
    } catch (error) {
      logger.error('获取用户列表失败', {
        module: 'UserManagement',
        error: error instanceof Error ? error.message : String(error)
      });
      // 如果读取失败，返回当前 store 中的用户
      return get().users;
    }
  },

  searchUsers: (keyword: string): AntigravityAccount[] => {
    if (!keyword.trim()) return get().users;

    const lowerKeyword = keyword.toLowerCase();
    return get().users.filter(user =>
      user.email.toLowerCase().includes(lowerKeyword)
    );
  },
}));
