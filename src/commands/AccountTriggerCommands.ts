import { invoke } from '@tauri-apps/api/core';

export interface TriggerResult {
    email: string;
    triggered_models: string[];
    failed_models: string[];
    skipped_models: string[];
    skipped_details: string[];
    success: boolean;
    message: string;
}

export class AccountTriggerCommands {
    /**
     * Trigger a quota refresh check for the given account.
     * This will send a minimal query ("Hi") to any model with ~100% quota
     * to start the reset timer.
     * @param email The account email
     */
    static async triggerQuotaRefresh(email: string): Promise<TriggerResult> {
        return invoke('trigger_quota_refresh', { email });
    }
}
