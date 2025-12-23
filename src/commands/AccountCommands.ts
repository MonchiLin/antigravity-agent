import { universalInvoke } from '@/lib/invoke-adapter';
import { AntigravityAccount } from "@/commands/types/account.types.ts";

/**
 * Antigravity 账户管理命令
 */
export class AccountCommands {
  /**
   * 获取当前登录的账户信息
   * @returns 账户认证信息，包含邮箱、数据库路径等
   */
  static async getCurrentAntigravityAccount(): Promise<AntigravityAccount> {
    return universalInvoke('get_current_antigravity_account_info');
  }

  /**
   * 获取所有已备份的账户列表
   * @returns 账户列表
   */
  static async getAntigravityAccounts(): Promise<AntigravityAccount[]> {
    return universalInvoke('get_antigravity_accounts');
  }

  /**
   * 备份当前登录的账户
   * @returns 备份结果消息
   */
  static async saveAntigravityCurrentAccount(): Promise<string> {
    return universalInvoke('save_antigravity_current_account');
  }

  /**
   * 切换到指定账户（完整流程：关闭进程 → 恢复数据 → 重启）
   * @param accountName 账户名（邮箱）
   * @returns 切换结果消息
   */
  static async switchToAntigravityAccount(accountName: string): Promise<string> {
    return universalInvoke('switch_to_antigravity_account', { accountName: accountName });
  }

  /**
   * 清除所有 Antigravity 数据（注销）
   * @returns 清除结果消息
   */
  static async clearAllData(): Promise<string> {
    return universalInvoke('clear_all_antigravity_data');
  }
}
