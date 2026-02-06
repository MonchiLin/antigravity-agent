import * as vscode from 'vscode';
import dayjs from 'dayjs';
import { Logger } from '../utils/logger';
import { AccountMetrics, AntigravityAccount } from '@/commands/types/account.types';
import { getQuotaCategory } from '../constants/model-mappings';
import { TranslationManager } from './translation-manager';
import { API_CONFIG } from '../constants/api';
// Dynamic import or require is used inside render to avoid top-level issues if needed, 
// but standard import is better if file exists. 
// However, since we just added the file, let's use standard import.
import { maskEmail } from '../utils/string-masking';

/**
 * Manages the VS Code Status Bar item for Antigravity.
 * Handles polling for account metrics and displaying real-time usage.
 */
export class StatusBarManager {
    private static interval: NodeJS.Timeout | undefined;
    private static metricsItem: vscode.StatusBarItem; // Display Model & Quota
    private static userItem: vscode.StatusBarItem;    // Display User Email
    private static readonly API_BASE = API_CONFIG.BASE_URL;

    private static currentMetrics: AccountMetrics | null = null;
    private static currentAccount: AntigravityAccount | null = null;
    private static lastModelName: string = 'Gemini 3 Pro (High)'; // Default Model Name
    private static currentPollDuration: number = 30000;
    private static isMaskingEnabled: boolean = false;
    private static isShowAccountEnabled: boolean = true;

    /**
     * Initializes the status bar manager.
     * @param metricsItem The status bar item for metrics (Left).
     * @param userItem The status bar item for user info (Right).
     * @param context The extension context.
     */
    public static initialize(metricsItem: vscode.StatusBarItem, userItem: vscode.StatusBarItem, context: vscode.ExtensionContext) {
        this.metricsItem = metricsItem;
        this.userItem = userItem;

        // Read initial config
        const config = vscode.workspace.getConfiguration('antigravity-agent');
        this.isMaskingEnabled = config.get<boolean>('privacy', false);
        this.isShowAccountEnabled = config.get<boolean>('showAccount', true);

        Logger.log(`[StatusBar] Initial Privacy Mode: ${this.isMaskingEnabled}, Show Account: ${this.isShowAccountEnabled}`);

        this.startPolling();
        context.subscriptions.push({ dispose: () => this.stopPolling() });

        // Listen for configuration changes
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            const config = vscode.workspace.getConfiguration('antigravity-agent');

            if (e.affectsConfiguration('antigravity-agent.privacy')) {
                const newPrivacy = config.get<boolean>('privacy', false);
                Logger.log(`[StatusBar] Privacy Mode Changed to: ${newPrivacy}`);
                this.setMasking(newPrivacy);
            }

            if (e.affectsConfiguration('antigravity-agent.showAccount')) {
                const newShowAccount = config.get<boolean>('showAccount', true);
                Logger.log(`[StatusBar] Show Account Changed to: ${newShowAccount}`);
                this.setShowAccount(newShowAccount);
            }
        }));
    }

    public static setMasking(enabled: boolean) {
        this.isMaskingEnabled = enabled;
        this.refreshDisplay();
    }

    public static setShowAccount(enabled: boolean) {
        this.isShowAccountEnabled = enabled;
        this.refreshDisplay();
    }

    private static refreshDisplay() {
        if (this.currentMetrics && this.currentAccount) {
            this.render(this.currentMetrics, this.currentAccount);
        } else {
            this.update();
        }
    }

    /**
     * Registers the analytics interceptor to capture model usage events.
     * When the IDE broadcasts CASCADE_MESSAGE_SENT, update the status bar.
     * @param context The extension context.
     */
    public static registerAnalyticsInterceptor(context: vscode.ExtensionContext) {
        try {
            const disposable = vscode.commands.registerCommand(
                'antigravity.sendAnalyticsAction',
                (...args: any[]) => {
                    // Check for Chat Message events where model info is present
                    if (args.length > 1 && args[0] === 'CASCADE_MESSAGE_SENT') {
                        const payload = args[1];
                        if (payload?.model_name) {
                            this.updateWithModelUsage(payload.model_name);
                            Logger.log(`🤖 Model Detected: ${payload.model_name}`);
                        }
                    }
                }
            );
            context.subscriptions.push(disposable);
            Logger.log('✅ Analytics Interceptor Ready');
        } catch (e) {
            Logger.log('❌ Failed to register Analytics Interceptor', e);
        }
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
            const accRes = await fetch(`${this.API_BASE}/${API_CONFIG.ENDPOINTS.GET_CURRENT_ACCOUNT}`);

            // Connection successful - reset warning visual
            this.metricsItem.color = undefined;
            this.metricsItem.backgroundColor = undefined;
            this.metricsItem.tooltip = undefined; // clear previous error tooltip
            this.userItem.color = undefined;

            // Switch back to normal polling (30s) if we were in fast recovery mode
            if (this.currentPollDuration !== 30000) {
                this.currentPollDuration = 30000;
                this.startPolling(30000);
                return; // startPolling calls update() immediately
            }

            if (!accRes.ok) throw new Error('Failed to fetch account info');
            const currentAccount = await accRes.json() as AntigravityAccount | null;
            this.currentAccount = currentAccount;

            if (!currentAccount || !currentAccount.antigravityAuthStatus?.email) {
                this.metricsItem.text = `$(antigravity-logo) ${t('status.none')}`;
                this.metricsItem.tooltip = t('status.noAccount');

                this.userItem.text = `$(account) ${t('status.notLoggedIn')}`;
                this.userItem.tooltip = t('status.noAccount');
                return;
            }

            const email = currentAccount.antigravityAuthStatus.email;

            // 2. Get Metrics
            const metricRes = await fetch(`${this.API_BASE}/${API_CONFIG.ENDPOINTS.GET_METRICS}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!metricRes.ok) {
                this.metricsItem.tooltip = `Current: ${email}\n${t('status.failedMetrics')}`;
                this.userItem.text = `$(account) ${email}`;
                return;
            }

            this.currentMetrics = await metricRes.json() as AccountMetrics;
            this.render(this.currentMetrics, currentAccount);

        } catch (error) {
            // Connection Error Handling
            const errMsg = t('status.offline');
            const bgError = new vscode.ThemeColor('errorForeground');

            this.metricsItem.text = `$(debug-disconnect) ${errMsg}`;
            this.metricsItem.tooltip = t('status.connectError');
            this.metricsItem.color = bgError;

            this.userItem.text = `$(account) ${t('status.offline').replace('Antigravity: ', '')}`;
            this.userItem.color = bgError;

            // Switch to fast polling (5s) for quick recovery detection
            if (this.currentPollDuration !== 5000) {
                this.currentPollDuration = 5000;
                this.startPolling(5000);
            }
        }
    }

    // ... inside render method ...
    private static render(metrics: AccountMetrics, currentAccount?: AntigravityAccount) {
        if (!metrics) return;

        // --- Render User Item ---
        let email = currentAccount?.antigravityAuthStatus.email || '';
        if (this.isMaskingEnabled && email) {
            try {
                email = maskEmail(email);
            } catch (e) {
                Logger.log('Failed to mask email', e);
            }
        }

        if (currentAccount && this.isShowAccountEnabled) {
            this.userItem.text = `$(account) ${email}`;
            this.userItem.show();
        } else {
            this.userItem.hide();
        }

        // --- Render Metrics Item ---
        this.metricsItem.tooltip = this.renderTooltip(metrics, currentAccount, email);

        // Update Status Bar Text
        const category = getQuotaCategory(this.lastModelName);
        const targetQuota = metrics.quotas.find(q => q.model_name.includes(category));

        if (targetQuota) {
            const percentage = Math.round(targetQuota.percentage * 100);
            this.metricsItem.text = `$(antigravity-logo) ${this.lastModelName}: ${percentage}%`;
        } else {
            this.metricsItem.text = `$(antigravity-logo) ${this.lastModelName}`;
        }
        this.metricsItem.show();
    }

    /**
     * Generates a rich Markdown tooltip for the metrics item.
     * Table Layout: Value precision and standard overview.
     */
    private static renderTooltip(metrics: AccountMetrics, currentAccount: AntigravityAccount | undefined, displayEmail: string): vscode.MarkdownString {
        const t = TranslationManager.getInstance().t.bind(TranslationManager.getInstance());
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;

        if (!currentAccount) {
            md.appendMarkdown(`${t('status.tooltip.notLoggedIn')}`);
            return md;
        }

        // 1. Header: User & Plan
        // Use tier_id as the definitive plan identifier
        // userStatus -> rawData -> plan -> tier_id
        let plan = currentAccount.userStatus?.rawData?.plan?.tier_id || 'UNKNOWN';

        // Prettify if it looks like a slug (contains underscores or dashes)
        if (plan.includes('_') || plan.includes('-')) {
            plan = plan.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        // userStatus -> rawData -> plan_name (Nickname)
        const nickname = currentAccount.userStatus?.rawData?.plan_name;
        const userDisplay = nickname ? `${nickname} (${displayEmail})` : displayEmail;

        md.appendMarkdown(`**${t('status.tooltip.account')}**: ${userDisplay} &nbsp;|&nbsp; **${t('status.tooltip.plan')}**: ${plan}\n\n`);

        // 2. Table of Models
        if (metrics.quotas.length > 0) {
            md.appendMarkdown(`${t('status.tooltip.tableHeader')}\n`);
            md.appendMarkdown(`|:---|:---|:---|\n`);

            metrics.quotas.forEach(q => {
                const per = Math.round(q.percentage * 100);
                const bar = this.generateProgressBar(q.percentage, 10);

                // Icon Logic
                let icon = ''; // Icons inside table can be noisy, but let's try minimal or just bold text
                // Actually user screenshot didn't show icons in the table text, just bold names.
                // But let's keep icons if they fit, or just name. The screenshot showed "Gemini Pro"

                // Clean Name
                const name = q.model_name.replace('Quota', '').trim();

                // Reset Time
                let resetTime = '-';
                if (q.reset_text && dayjs(q.reset_text).isValid()) {
                    // Short format: 14h 30m? Or just HH:mm
                    // To keep it compact let's try a simple format or 'in Xh'
                    // For now, full date or standard time is safer unless we implement 'fromNow'
                    resetTime = dayjs(q.reset_text).format('HH:mm');

                    // Calculate hours left roughly if date is future
                    const diffH = dayjs(q.reset_text).diff(dayjs(), 'hour');
                    if (diffH > 0 && diffH < 24) {
                        resetTime = t('status.timeLeft', diffH.toString());
                    } else if (diffH <= 0) {
                        // Do nothing, maybe 'Now'
                    }
                }

                // Table Row
                // Note: Using `code` block for bar ensures monospace alignment
                md.appendMarkdown(`| **${name}** | \`${bar}\` ${per}% | ${resetTime} |\n`);
            });
        }

        return md;
    }

    /**
     * Generates a Unicode block progress bar.
     * @param percentage 0.0 to 1.0
     * @param length Number of blocks
     */
    private static generateProgressBar(percentage: number, length: number = 10): string {
        const fillCount = Math.round(percentage * length);
        const emptyCount = length - fillCount;

        // Full Block: █, Light Shade: ░
        const filled = '█'.repeat(Math.max(0, fillCount));
        const empty = '░'.repeat(Math.max(0, emptyCount));

        return `${filled}${empty}`;
    }
}
