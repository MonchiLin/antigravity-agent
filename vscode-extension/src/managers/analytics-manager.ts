
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { StatusBarManager } from './status-bar-manager';

/**
 * Handles analytics-related interceptions, primarily to display
 * model usage information in the Status Bar.
 */
export class AnalyticsManager {
    private static instance: AnalyticsManager;

    private constructor() { }

    public static initialize(context: vscode.ExtensionContext) {
        if (!AnalyticsManager.instance) {
            AnalyticsManager.instance = new AnalyticsManager();
            AnalyticsManager.instance.registerInterceptors(context);
        }
    }

    private registerInterceptors(context: vscode.ExtensionContext) {
        // --- 🎯 TARGETED HIJACK: ANALYTICS ---
        try {
            const disposable = vscode.commands.registerCommand('antigravity.sendAnalyticsAction', (...args: any[]) => {
                // Check for Chat Message events where model info is present
                if (args.length > 1 && args[0] === 'CASCADE_MESSAGE_SENT') {
                    const payload = args[1];
                    if (payload && payload.model_name) {
                        const modelName = payload.model_name;
                        // Update Status Bar with Quota for this model
                        StatusBarManager.updateWithModelUsage(modelName);

                        // Log detected model
                        Logger.log(`🤖 Model Detected: ${modelName}`);
                    }
                }
            });
            context.subscriptions.push(disposable);
            Logger.log('✅ Analytics Interceptor Ready');
        } catch (e) {
            Logger.log('❌ Failed to register Analytics Interceptor', e);
        }
    }
}
