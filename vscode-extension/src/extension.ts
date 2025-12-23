import * as vscode from 'vscode';
import { AntigravityViewProvider } from './AntigravityViewProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new AntigravityViewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AntigravityViewProvider.viewType, provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity.refresh', () => {
            provider.refresh();
        })
    );
}

export function deactivate() { }
