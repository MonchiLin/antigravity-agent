import { universalInvoke } from '@/lib/invoke-adapter';
import { AntigravityAccount, CommandResult } from "@/commands/types/account.types.ts";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as AnyRecord;
  }
  return null;
}

function normalizeAccount(raw: unknown): AntigravityAccount | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const authRaw = asRecord(record.antigravity_auth_status);
  if (!authRaw) {
    return null;
  }

  const emailValue = authRaw.email;
  if (typeof emailValue !== 'string' || emailValue.trim() === '') {
    return null;
  }

  const apiKey = authRaw.api_key;
  const authStatus: AntigravityAccount['antigravity_auth_status'] = {
    ...authRaw,
    email: emailValue,
  };

  if (typeof apiKey === 'string') {
    authStatus.api_key = apiKey;
  }

  if (typeof authRaw.name === 'string') {
    authStatus.name = authRaw.name;
  }

  return {
    antigravity_auth_status: authStatus,
    oauth_token: (record.oauth_token ?? null) as AntigravityAccount['oauth_token'],
    user_status: (record.user_status ?? null) as AntigravityAccount['user_status'],
  };
}

/**
 * Antigravity 账户管理命令
 */
export class AccountCommands {
  /**
   * 获取当前登录的账户信息
   * @returns 账户认证信息，包含邮箱、数据库路径等
   */
  static async getCurrentAntigravityAccount(): Promise<AntigravityAccount> {
    const raw = await universalInvoke<unknown>('get_current_antigravity_account_info');
    const normalized = normalizeAccount(raw);
    if (!normalized) {
      throw new Error('Invalid account payload from get_current_antigravity_account_info');
    }
    return normalized;
  }

  /**
   * 获取所有已备份的账户列表
   * @returns 账户列表
   */
  static async getAntigravityAccounts(): Promise<AntigravityAccount[]> {
    const raw = await universalInvoke<unknown>('get_antigravity_accounts');
    if (!Array.isArray(raw)) {
      throw new Error('Invalid accounts payload from get_antigravity_accounts');
    }
    return raw
      .map((item) => normalizeAccount(item))
      .filter((item): item is AntigravityAccount => item !== null);
  }

  /**
   * 备份当前登录的账户
   * @returns 备份结果消息
   */
  static async saveAntigravityCurrentAccount(): Promise<CommandResult> {
    return universalInvoke('save_antigravity_current_account');
  }

  /**
   * 切换到指定账户（完整流程：关闭进程 → 恢复数据 → 重启）
   * @param accountName 账户名（邮箱）
   * @returns 切换结果消息
   */
  static async switchToAntigravityAccount(accountName: string): Promise<CommandResult> {
    return universalInvoke('switch_to_antigravity_account', { accountName: accountName });
  }

  /**
   * 清除所有 Antigravity 数据（注销）
   * @returns 清除结果消息
   */
  static async clearAllData(): Promise<CommandResult> {
    return universalInvoke('clear_all_antigravity_data');
  }
}
