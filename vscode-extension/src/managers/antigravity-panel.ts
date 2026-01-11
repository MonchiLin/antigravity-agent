import * as vscode from 'vscode';
import * as fs from 'fs';
import { Logger } from '../utils/logger';
import { AutoAcceptManager } from './auto-accept-manager';
import { TranslationManager } from './translation-manager';
import { StatusBarManager } from './status-bar-manager';

// Declare global function injected by Vite build or shim
// declare const __getWebviewHtml__: (options: any) => string;

/**
 * Manages the Antigravity Webview Panel.
 * Handles creation, updates, and message passing between the extension and the webview.
 */
export class AntigravityPanel {
    public static currentPanel: AntigravityPanel | undefined;
    private static readonly viewType = 'antigravity';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];

    /**
     * Creates or shows the existing panel.
     * @param context The extension context.
     */
    public static createOrShow(context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (AntigravityPanel.currentPanel) {
            AntigravityPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            AntigravityPanel.viewType,
            'Antigravity Agent',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                enableCommandUris: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'dist'),
                    vscode.Uri.joinPath(context.extensionUri, 'images')
                ]
            }
        );

        // Set the icon path
        panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');

        AntigravityPanel.currentPanel = new AntigravityPanel(panel, context);
    }

    public constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._context = context;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view state changes
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Listen for configuration changes to sync Webview UI
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('antigravity-agent')) {
                const config = vscode.workspace.getConfiguration('antigravity-agent');

                // Sync Auto Pilot
                if (e.affectsConfiguration('antigravity-agent.autoPilot')) {
                    this._panel.webview.postMessage({
                        command: 'autoPilotState',
                        enabled: config.get<boolean>('autoPilot', false)
                    });
                }

                // Sync Privacy Mode
                if (e.affectsConfiguration('antigravity-agent.privacy')) {
                    this._panel.webview.postMessage({
                        command: 'privacyModeState',
                        enabled: config.get<boolean>('privacy', false)
                    });
                }

                // Sync Show Account
                if (e.affectsConfiguration('antigravity-agent.showAccount')) {
                    this._panel.webview.postMessage({
                        command: 'showAccountState',
                        enabled: config.get<boolean>('showAccount', true)
                    });
                }
            }
        }, null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                try {
                    switch (message.command) {
                        case 'alert':
                            vscode.window.showErrorMessage(message.text);
                            break;
                        case 'setAutoAccept':
                            vscode.workspace.getConfiguration('antigravity-agent').update('autoPilot', message.enabled, vscode.ConfigurationTarget.Global);
                            AutoAcceptManager.toggle(message.enabled);
                            break;
                        case 'getAutoPilotState':
                            this._panel.webview.postMessage({
                                command: 'autoPilotState',
                                enabled: AutoAcceptManager.isEnabled()
                            });
                            break;
                        case 'openExternal':
                            if (message.url) {
                                vscode.env.openExternal(vscode.Uri.parse(message.url));
                            }
                            break;
                        case 'copyToClipboard':
                            if (message.text) {
                                vscode.env.clipboard.writeText(message.text);
                                vscode.window.showInformationMessage(TranslationManager.getInstance().t('common:status.copied'));
                            }
                            break;
                        case 'reloadWindow':
                            vscode.commands.executeCommand('workbench.action.reloadWindow');
                            break;
                        case 'setPrivacyMode':
                            vscode.workspace.getConfiguration('antigravity-agent').update('privacy', message.enabled, vscode.ConfigurationTarget.Global);
                            break;
                        case 'setShowAccount':
                            vscode.workspace.getConfiguration('antigravity-agent').update('showAccount', message.enabled, vscode.ConfigurationTarget.Global);
                            break;
                    }
                } catch (err) {
                    Logger.log(`Error handling message: ${err}`);
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        AntigravityPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        // Send initial states after a short delay
        setTimeout(() => {
            const config = vscode.workspace.getConfiguration('antigravity-agent');
            this._panel.webview.postMessage({
                command: 'autoPilotState',
                enabled: config.get<boolean>('autoPilot', false)
            });
            this._panel.webview.postMessage({
                command: 'privacyModeState',
                enabled: config.get<boolean>('privacy', false)
            });
            this._panel.webview.postMessage({
                command: 'showAccountState',
                enabled: config.get<boolean>('showAccount', true)
            });
        }, 100);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        // Always load from dist (Static Loading) to avoid HMR connection issues
        // This ensures consistent behavior between Debugging (F5) and Production (VSIX)
        try {
            const distPath = vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview');
            const indexHtml = vscode.Uri.joinPath(distPath, 'index.html');

            let html = fs.readFileSync(indexHtml.fsPath, 'utf-8');

            // Replace Placeholders using strict CSP logic
            html = html.replace(/{{cspSource}}/g, webview.cspSource);
            html = html.replace(/{{nonce}}/g, nonce);

            // Fix absolute asset paths to webview URIs
            const rootUri = webview.asWebviewUri(distPath);
            html = html.replace(/(href|src)="(\.?\/)?assets\//g, `$1="${rootUri}/assets/`);

            // Inject Language
            const languageScript = `<script nonce="${nonce}">window.VSCODE_LANGUAGE = "${vscode.env.language}";</script>`;
            html = html.replace('</head>', `${languageScript}</head>`);

            return html;
        } catch (e) {
            Logger.log(`Failed to load index.html: ${e}`);
            return `Failed to load UI: ${e}`;
        }
    }

    public postMessage(message: any) {
        this._panel.webview.postMessage(message);
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
