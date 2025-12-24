import * as vscode from 'vscode';
import { AntigravityPanel } from './AntigravityPanel';
import { Logger } from './logger';
import { StatusBarManager } from './status-bar-manager';

export let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    Logger.initialize(context);
    Logger.log("Antigravity Extension Activated");

    // Register the command to open the panel
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity.openDialog', () => {
            Logger.log("Command: antigravity.openDialog triggered");
            AntigravityPanel.createOrShow(context);
        })
    );

    // 对于 Right 对齐，高 priority = 更靠右
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    statusBarItem.text = "$(coffee) Antigravity Agent";
    statusBarItem.command = "antigravity.openDialog";
    statusBarItem.show();

    // Initialize Manager (Handles Polling & Tooltip)
    StatusBarManager.initialize(statusBarItem, context);

    Logger.log("Status Bar Item created and shown");

    context.subscriptions.push(statusBarItem);
}

export function updateStatusBar(text: string) {
    if (statusBarItem) {
        statusBarItem.text = text;
        statusBarItem.show();
    }
}

export function deactivate() { }
