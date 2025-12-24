import * as vscode from 'vscode';
import { Logger } from './logger';
import { AccountMetrics } from '@/commands/types/account.types';

interface CurrentAccount {
    context: {
        email: string;
        plan?: {
            slug: string;
        };
    };
}

export class StatusBarManager {
    private static interval: NodeJS.Timeout | undefined;
    private static statusBarItem: vscode.StatusBarItem;
    private static readonly API_BASE = 'http://127.0.0.1:18888/api';

    public static initialize(item: vscode.StatusBarItem, context: vscode.ExtensionContext) {
        this.statusBarItem = item;
        this.startPolling();
        context.subscriptions.push({ dispose: () => this.stopPolling() });
    }

    private static startPolling() {
        // Initial fetch
        this.update();
        // Poll every 30 seconds
        this.interval = setInterval(() => this.update(), 30 * 1000);
    }

    private static stopPolling() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }

    public static async update() {
        try {
            // 1. Get Current Account
            const accRes = await fetch(`${this.API_BASE}/get_current_antigravity_account_info`);
            if (!accRes.ok) {
                // If 404 or backend down, just keep default or show valid state
                // Logger.log("Backend might be down or no current account");
                return;
            }
            const currentAccount = await accRes.json() as CurrentAccount | null;

            if (!currentAccount || !currentAccount.context?.email) {
                this.statusBarItem.tooltip = "No active Antigravity account";
                this.statusBarItem.text = "$(account) Antigravity: None";
                return;
            }

            const email = currentAccount.context.email;
            const plan = currentAccount.context.plan?.slug || 'UNKNOWN';

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

            const metrics = await metricRes.json() as AccountMetrics;

            // 3. Build Tooltip
            const md = new vscode.MarkdownString();
            md.isTrusted = true;

            md.appendMarkdown(`**User**: ${email}\n\n`);
            md.appendMarkdown(`**Plan**: ${plan}\n\n`);
            md.appendMarkdown(`---\n\n`);

            if (metrics.quotas && metrics.quotas.length > 0) {
                md.appendMarkdown(`| Model | Usage | Reset |\n`);
                md.appendMarkdown(`|---|---|---|\n`);

                metrics.quotas.forEach(q => {
                    const usage = Math.round(q.percentage * 100);
                    // Simple color indicator using markdown bold for high usage?
                    // Verify support: minimal formatting.
                    let usageStr = `${usage}%`;
                    if (q.percentage < 0.2) usageStr = `**${usage}%** 🔴`; // Usage remaining is low

                    // Format reset time similar to frontend if possible, or just raw
                    // Backend returns raw string if not parsed? 
                    // Usually backend passes string. Let's try to format if ISO.
                    let timeStr = q.reset_text || '-';
                    try {
                        if (timeStr.includes('T')) {
                            const d = new Date(timeStr);
                            // User request: Local style, Month + Day, not fixed
                            // Use toLocaleString with options
                            timeStr = d.toLocaleString(undefined, {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            });
                        }
                    } catch { }

                    md.appendMarkdown(`| ${q.model_name} | ${usageStr} | ${timeStr} |\n`);
                });
            } else {
                md.appendMarkdown(`*No quota info available*`);
            }

            // 4. Update Status Bar Text
            // User Request: Show "Gemini Pro" quota instead of email
            // Find Gemini Pro quota
            const proQuota = metrics.quotas.find(q => q.model_name === 'Gemini Pro');
            const percentage = proQuota ? Math.round(proQuota.percentage * 100) : '?';

            // Text format: $(coffee) Gemini Pro: 45%
            this.statusBarItem.text = `$(coffee) Gemini Pro: ${percentage}%`;

            // Update tooltip as before
            this.statusBarItem.tooltip = md;

        } catch (error) {
            Logger.log(`Failed to update status bar: ${error}`);
        }
    }
}
