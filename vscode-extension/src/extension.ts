import * as vscode from 'vscode';
import { AntigravityPanel } from './managers/antigravity-panel';
import { Logger } from './utils/logger';
import { StatusBarManager } from './managers/status-bar-manager';
import { AutoAcceptManager } from './managers/auto-accept-manager';


export let statusBarItem: vscode.StatusBarItem;

/**
 * Activates the Antigravity VS Code Extension.
 * Defines commands, initializes the status bar, and sets up analytics/browser interception.
 */
export async function activate(context: vscode.ExtensionContext) {
    Logger.initialize(context);
    Logger.log("Antigravity Extension Activated");

    // Register the command to open the panel
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity.agent.open_dialog', () => {
            AntigravityPanel.createOrShow(context);
        })
    );
    // Alias for backward compatibility if needed, or just standard command
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity.openDialog', () => {
            AntigravityPanel.createOrShow(context);
        })
    );
    // User requested dashboard command
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity.agent.open_dashboard', () => {
            AntigravityPanel.createOrShow(context);
        })
    );

    // Initialize Status Bar
    // Priority 10000 ensures it's on the far right (or far left depending on layout logic)
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    statusBarItem.text = "$(coffee) Antigravity Agent";
    statusBarItem.command = "antigravity.agent.open_dashboard";
    statusBarItem.show();

    // Initialize Managers
    StatusBarManager.initialize(statusBarItem, context);
    StatusBarManager.registerAnalyticsInterceptor(context);

    AutoAcceptManager.initialize(context);

    context.subscriptions.push(statusBarItem);
}

export function updateStatusBar(text: string) {
    if (statusBarItem) {
        statusBarItem.text = text;
        statusBarItem.show();
    }
}

export function deactivate() { }
