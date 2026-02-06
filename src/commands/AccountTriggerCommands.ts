import { universalInvoke } from '@/lib/invoke-adapter';
import type { TriggerResult } from '@/commands/types/account.types.ts';

export class AccountTriggerCommands {
    /**
     * Trigger a quota refresh check for the given account.
     * This will send a minimal query ("Hi") to any model with ~100% quota
     * to start the reset timer.
     * @param email The account email
     */
    static async triggerQuotaRefresh(email: string): Promise<TriggerResult> {
        return universalInvoke('trigger_quota_refresh', { email });
    }
}
