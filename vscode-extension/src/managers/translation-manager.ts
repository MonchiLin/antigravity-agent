import * as vscode from 'vscode';

// Simple dictionary types
type LocaleData = Record<string, string>;
type Resources = Record<string, LocaleData>;

export class TranslationManager {
    private static instance: TranslationManager;
    private currentLocale: string = 'en';
    private resources: Resources = {};

    private constructor() {
        this.currentLocale = vscode.env.language;
        this.initResources();
    }

    public static getInstance(): TranslationManager {
        if (!TranslationManager.instance) {
            TranslationManager.instance = new TranslationManager();
        }
        return TranslationManager.instance;
    }

    private initResources() {
        // Embed minimal resources for Extension Host to avoid complex loading logic
        // We can expand this or load from files if needed. 
        // For now, keeping it simple as per project size.

        const en: LocaleData = {
            'status.noAccount': 'No active Antigravity account',
            'status.none': 'Antigravity: None',
            'status.offline': 'Antigravity: Offline',
            'status.connectError': 'Unable to connect to Antigravity Agent\n(5s to reconnect...)',
            'status.tooltip.user': 'User',
            'status.tooltip.plan': 'Plan',
            'status.tooltip.model': 'Model',
            'status.tooltip.remaining': 'Remaining',
            'status.tooltip.reset': 'Reset',
            'status.tooltip.noQuota': 'No quota info available',
            'msg.opening': 'Opening: {0}',
            'msg.copied': 'Link copied to clipboard'
        };

        const zhCN: LocaleData = {
            'status.noAccount': '无活跃 Antigravity 账户',
            'status.none': 'Antigravity: 无',
            'status.offline': 'Antigravity: 离线',
            'status.connectError': '无法连接至 Antigravity Agent\n(5秒后自动重连...)',
            'status.tooltip.user': '用户',
            'status.tooltip.plan': '计划',
            'status.tooltip.model': '模型',
            'status.tooltip.remaining': '剩余',
            'status.tooltip.reset': '重置',
            'status.tooltip.noQuota': '暂无配额信息',
            'msg.opening': '正在打开: {0}',
            'msg.copied': '链接已复制到剪贴板'
        };

        const zhTW: LocaleData = {
            'status.noAccount': '無活躍 Antigravity 帳戶',
            'status.none': 'Antigravity: 無',
            'status.offline': 'Antigravity: 離線',
            'status.connectError': '無法連線至 Antigravity Agent\n(5秒後自動重連...)',
            'status.tooltip.user': '使用者',
            'status.tooltip.plan': '方案',
            'status.tooltip.model': '模型',
            'status.tooltip.remaining': '剩餘',
            'status.tooltip.reset': '重置',
            'status.tooltip.noQuota': '暫無配額資訊',
            'msg.opening': '正在開啟: {0}',
            'msg.copied': '連結已複製到剪貼簿'
        };

        this.resources = {
            'en': en,
            'zh-cn': zhCN,
            'zh-tw': zhTW
        };
    }

    public t(key: string, ...args: string[]): string {
        // Normalize locale (vscode uses lowercase usually, e.g. en, zh-cn)
        const locale = this.currentLocale.toLowerCase();

        let val = this.resources[locale]?.[key];

        // Fallback to en
        if (!val) {
            val = this.resources['en']?.[key] || key;
        }

        // Simple format replacement {0}, {1}...
        if (args.length > 0) {
            args.forEach((arg, index) => {
                val = val.replace(`{${index}}`, arg);
            });
        }

        return val;
    }
}
