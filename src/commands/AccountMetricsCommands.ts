import { invoke } from '@tauri-apps/api/core';
import { AccountMetrics } from '@/commands/types/account.types.ts';

export class AccountMetricsCommands {
    /**
     * 获取账户配额指标 (Rust Backend Orchestrated - Singular)
     * @param email 账户邮箱
     */
    static async getAccountMetrics(email: string): Promise<AccountMetrics> {
        return invoke('get_account_metrics', { email });
    }
}
