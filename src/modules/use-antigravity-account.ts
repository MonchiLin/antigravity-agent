import {create} from 'zustand';
import {logger} from '../lib/logger.ts';
import {AccountCommands} from '@/commands/AccountCommands.ts';
import type {AntigravityAccount} from '@/commands/types/account.types.ts';
import {AccountManageCommands} from "@/commands/AccountManageCommands.ts";

// 常量定义
const FILE_WRITE_DELAY_MS = 500; // 等待文件写入完成的延迟时间

// Store 状态
export interface AntigravityAccountState {
  accounts: AntigravityAccount[];
  currentAuthInfo: AntigravityAccount | null;
}

// Store Actions
export interface AntigravityAccountActions {
  // 基础操作
  delete: (email: string) => Promise<void>;
  insertOrUpdateCurrentAccount: () => Promise<void>;
  switchToAccount: (email: string) => Promise<void>;

  // 批量操作
  clearAllAccounts: () => Promise<void>;

  // 查询
  getAccounts: () => Promise<AntigravityAccount[]>;
}

// 创建 Store
export const useAntigravityAccount = create<AntigravityAccountState & AntigravityAccountActions>()((set, get) => ({
  // 初始状态
  accounts: [],
  currentAuthInfo: null,

  // ============ 基础操作 ============
  delete: async (email: string): Promise<void> => {
    try {
      await AccountManageCommands.deleteBackup(email);

      // 删除成功后重新获取数据
      const accounts = await AccountCommands.getAntigravityAccounts();
      set({ accounts: accounts });
    } catch (error) {
      logger.error('用户删除失败', {
        module: 'UserManagement',
        email,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },

  insertOrUpdateCurrentAccount: async (): Promise<void> => {
    try {
      // 1. 获取当前 Antigravity 用户信息
      const currentInfo = await AccountCommands.getCurrentAntigravityAccount();
      console.log("insertOrUpdateCurrentAccount", currentInfo)
      // 2. 检查是否有有效的用户信息（通过API Key或用户状态判断）
      if (currentInfo?.auth.access_token) {
        // 3. 执行保存操作
        await AccountCommands.saveAntigravityCurrentAccount();

        // 4. 等待文件写入完成
        await new Promise(resolve => setTimeout(resolve, FILE_WRITE_DELAY_MS));

        // 5. 重新获取用户列表
        const accounts = await AccountCommands.getAntigravityAccounts();
        set({ accounts });

        // 6. 更新当前认证信息
        set({currentAuthInfo: currentInfo});
      } else {
        throw new Error('未检测到有效的账户信息');
      }
    } catch (error) {
      logger.error('备份当前用户失败', {
        module: 'UserManagement',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },

  switchToAccount: async (email: string): Promise<void> => {
    try {
      // 调用后端切换用户命令
      await AccountCommands.switchToAntigravityAccount(email);
    } catch (error) {
      logger.error('切换用户失败', {
        module: 'UserManagement',
        email,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },

  // ============ 批量操作 ============

  clearAllAccounts: async (): Promise<void> => {
    // 调用清空所有备份的命令
    await AccountManageCommands.clearAllBackups();
    // 清空成功后重新获取数据
    const accounts = await AccountCommands.getAntigravityAccounts();
    set({ accounts: accounts });
  },

  // ============ 查询 ============
  getAccounts: async (): Promise<AntigravityAccount[]> => {
    try {
      // 从后端获取账户列表
      const accounts = await AccountCommands.getAntigravityAccounts();

      // 同步更新 store 中的状态
      set({ accounts });
      return accounts;
    } catch (error) {
      logger.error('获取用户列表失败', {
        module: 'UserManagement',
        error: error instanceof Error ? error.message : String(error)
      });
      // 如果读取失败，返回当前 store 中的用户
      return get().accounts;
    }
  },
}));

export const useCurrentAntigravityAccount: () => AntigravityAccount | undefined = () => useAntigravityAccount(state => state.accounts.find(user => user.context.email === state.currentAuthInfo?.context.email));
