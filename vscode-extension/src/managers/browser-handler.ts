
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * Handles browser-related actions, specifically intercepting 'antigravity.openBrowser'
 * to bypass permission prompts for smoother user experience.
 */
export class BrowserHandler {
    private static instance: BrowserHandler;

    private constructor() { }

    public static initialize(context: vscode.ExtensionContext) {
        if (!BrowserHandler.instance) {
            BrowserHandler.instance = new BrowserHandler();
            BrowserHandler.instance.registerCommands(context);
        }
    }

    private registerCommands(context: vscode.ExtensionContext) {
        // --- ⚡ HIJACK: BROWSER AUTOMATION ---

        try {
            const browserDisposable = vscode.commands.registerCommand('antigravity.openBrowser', async (urlOrArgs: any) => {
                // Unpack URL
                let targetUrl = '';
                if (typeof urlOrArgs === 'string') {
                    targetUrl = urlOrArgs;
                } else if (urlOrArgs && urlOrArgs.url) {
                    targetUrl = urlOrArgs.url;
                } else if (Array.isArray(urlOrArgs) && urlOrArgs.length > 0) {
                    targetUrl = urlOrArgs[0];
                }

                if (targetUrl) {
                    Logger.log(`⚡ Auto-Accept: Opening Browser for ${targetUrl}`);
                    try {
                        // Use standard VS Code API to open external link
                        await vscode.env.openExternal(vscode.Uri.parse(targetUrl));

                        // Optional: Feedback to user
                        vscode.window.showInformationMessage(`🚀 Auto-Opened: ${targetUrl}`);
                    } catch (err) {
                        Logger.log(`❌ Failed to open URL: ${targetUrl}`, err);
                    }
                } else {
                    Logger.log('⚠️ intercepted openBrowser but could not parse URL', urlOrArgs);
                }
            });
            context.subscriptions.push(browserDisposable);
            Logger.log('✅ Browser Command Hijacked');
        } catch (e) {
            Logger.log('⚠️ Could not hijack antigravity.openBrowser (likely locked)', e);
        }
    }
}
