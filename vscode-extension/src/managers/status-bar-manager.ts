import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AccountMetrics } from '@/commands/types/account.types';
import { getQuotaCategory } from '../constants/model-mappings';
import { TranslationManager } from './translation-manager';

interface CurrentAccount {
    context: {
        email: string;
        plan?: {
            slug: string;
        };
    };
}

/**
 * Manages the VS Code Status Bar item for Antigravity.
 * Handles polling for account metrics and displaying real-time usage.
 */
export class StatusBarManager {
    private static interval: NodeJS.Timeout | undefined;
    private static statusBarItem: vscode.StatusBarItem;
    private static readonly API_BASE = 'http://127.0.0.1:18888/api';

    private static currentMetrics: AccountMetrics | null = null;
    private static lastModelName: string = 'Gemini 3 Pro (High)'; // Default Model Name
    private static currentPollDuration: number = 30000;

    /**
     * Initializes the status bar manager.
     * @param item The status bar item to manage.
     * @param context The extension context.
     */
    public static initialize(item: vscode.StatusBarItem, context: vscode.ExtensionContext) {
        this.statusBarItem = item;
        this.startPolling();
        context.subscriptions.push({ dispose: () => this.stopPolling() });
    }

    private static startPolling(intervalMs: number = 30000) {
        this.stopPolling();
        // Initial fetch
        this.update();
        // Poll
        this.interval = setInterval(() => this.update(), intervalMs);
    }

    private static stopPolling() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }

    /**
     * Updates the status bar immediately with new model usage context.
     * Useful for "hijacking" the display when a specific model is used.
     * @param modelName The name of the model being used.
     */
    public static async updateWithModelUsage(modelName: string) {
        this.lastModelName = modelName;

        // If we have cached metrics, update display immediately
        if (this.currentMetrics) {
            this.render(this.currentMetrics);
        } else {
            // Otherwise force a fetch
            await this.update();
        }
    }

    /**
     * Fetches the latest account info and metrics from the local API.
     */
    public static async update() {
        const t = TranslationManager.getInstance().t.bind(TranslationManager.getInstance());
        try {
            // 1. Get Current Account
            const accRes = await fetch(`${this.API_BASE}/get_current_antigravity_account_info`);

            // Connection successful - reset warning visual
            this.statusBarItem.color = undefined;
            this.statusBarItem.backgroundColor = undefined;

            // Switch back to normal polling (30s) if we were in fast recovery mode
            if (this.currentPollDuration !== 30000) {
                this.currentPollDuration = 30000;
                this.startPolling(30000);
                return; // startPolling calls update() immediately
            }

            if (!accRes.ok) throw new Error('Failed to fetch account info');
            const currentAccount = await accRes.json() as CurrentAccount | null;

            if (!currentAccount || !currentAccount.context?.email) {
                this.statusBarItem.tooltip = t('status.noAccount');
                this.statusBarItem.text = `$(account) ${t('status.none')}`;
                return;
            }

            const email = currentAccount.context.email;

            // 2. Get Metrics
            const metricRes = await fetch(`${this.API_BASE}/get_account_metrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!metricRes.ok) {
                this.statusBarItem.tooltip = `Current: ${email}\n(Failed to load metrics)`;
                return;
            }

            this.currentMetrics = await metricRes.json() as AccountMetrics;
            this.render(this.currentMetrics, currentAccount);

        } catch (error) {
            // Connection Error Handling

            this.statusBarItem.text = `$(debug-disconnect) ${t('status.offline')}`;
            this.statusBarItem.tooltip = t('status.connectError');
            this.statusBarItem.color = new vscode.ThemeColor('errorForeground');

            // Switch to fast polling (5s) for quick recovery detection
            if (this.currentPollDuration !== 5000) {
                this.currentPollDuration = 5000;
                this.startPolling(5000);
            }
        }
    }

    private static render(metrics: AccountMetrics, currentAccount?: CurrentAccount) {
        if (!metrics) return;
        const t = TranslationManager.getInstance().t.bind(TranslationManager.getInstance());

        // 3. Build Tooltip
        const md = new vscode.MarkdownString();
        md.isTrusted = true;

        if (currentAccount) {
            const email = currentAccount.context.email;
            const plan = currentAccount.context.plan?.slug || 'UNKNOWN';
            md.appendMarkdown(`**${t('status.tooltip.user')}**: ${email}\n\n`);
            md.appendMarkdown(`**${t('status.tooltip.plan')}**: ${plan}\n\n`);
            md.appendMarkdown(`---\n\n`);
        }

        if (metrics.quotas && metrics.quotas.length > 0) {
            md.appendMarkdown(`| ${t('status.tooltip.model')} | ${t('status.tooltip.remaining')} | ${t('status.tooltip.reset')} |\n`);
            md.appendMarkdown(`|---|---|---|\n`);

            metrics.quotas.forEach(q => {
                const remaining = Math.round(q.percentage * 100);
                const isWarning = q.percentage < 0.2;
                const remainingStr = isWarning ? `**${remaining}%** 🔴` : `${remaining}%`;

                md.appendMarkdown(`| ${q.model_name} | ${remainingStr} | ${q.reset_text || '-'} |\n`);
            });
        } else {
            md.appendMarkdown(`*${t('status.tooltip.noQuota')}*`);
        }

        this.statusBarItem.tooltip = md;

        // 4. Update Status Bar Text
        // Resolve category for quota lookup
        const category = getQuotaCategory(this.lastModelName);

        // Find quota for that category
        const targetQuota = metrics.quotas.find(q => q.model_name.includes(category));

        if (targetQuota) {
            const percentage = Math.round(targetQuota.percentage * 100);
            // Display: $(coffee) [Model Name]: [Quota]%
            this.statusBarItem.text = `$(coffee) ${this.lastModelName}: ${percentage}%`;
        } else {
            // Fallback
            this.statusBarItem.text = `$(coffee) ${this.lastModelName}`;
        }
    }
}
