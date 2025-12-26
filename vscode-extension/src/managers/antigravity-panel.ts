import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AutoAcceptManager } from './auto-accept-manager';

// Declare global function injected by Vite build or shim
declare const __getWebviewHtml__: (options: any) => string;

/**
 * Manages the Antigravity Webview Panel.
 * Handles creation, updates, and message passing between the extension and the webview.
 */
export class AntigravityPanel {
    public static currentPanel: AntigravityPanel | undefined;
    private static readonly viewType = 'antigravity';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
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

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = context.extensionUri;

        // Set the webview's initial html content
        this._update(context);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                try {
                    Logger.log(`Received message: ${message.command}`, message);
                    switch (message.command) {
                        case 'setAutoAccept':
                            AutoAcceptManager.toggle(message.enabled);
                            break;
                        case 'openExternal':
                            if (message.url) {
                                vscode.window.showInformationMessage(`正在打开: ${message.url}`);
                                vscode.env.openExternal(vscode.Uri.parse(message.url));
                            }
                            break;
                        case 'copyToClipboard':
                            if (message.text) {
                                vscode.env.clipboard.writeText(message.text);
                                vscode.window.showInformationMessage('链接已复制到剪贴板');
                            }
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

    private _update(context: vscode.ExtensionContext) {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, context);
    }

    private _getHtmlForWebview(webview: vscode.Webview, context: vscode.ExtensionContext): string {
        const isProduction = context.extensionMode === vscode.ExtensionMode.Production;
        const devServerUrl = 'http://127.0.0.1:5199'; // Matches vite.config.ts

        if (!isProduction) {
            // Development: Use the Vite Dev Server directly
            // Using an iframe approach or directly loading the script
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Antigravity Agent</title>
                <script type="module" src="${devServerUrl}/@vite/client"></script>
                <script type="module">
                    import RefreshRuntime from "${devServerUrl}/@react-refresh";
                    RefreshRuntime.injectIntoGlobalHook(window);
                    window.$RefreshReg$ = () => {};
                    window.$RefreshSig$ = () => (type) => type;
                    window.__vite_plugin_react_preamble_installed__ = true;
                </script>
                <script type="module" src="${devServerUrl}/src/webview/index.tsx"></script>
                <style>
                    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                </style>
            </head>
            <body>
                <div id="root"></div>
            </body>
            </html>`;
        } else {
            // Production: Load from dist/webview/index.html
            const indexHtmlPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview', 'index.html');
            // We can't synchronously read file in VSCode Ext Host efficiently without fs? 
            // Actually 'fs' is Node.js, valid here.
            const fs = require('fs');
            const htmlPath = indexHtmlPath.fsPath;

            try {
                let html = fs.readFileSync(htmlPath, 'utf-8');

                // Replace base path / assets with webview URIs
                const onDiskPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview');
                const webviewUri = webview.asWebviewUri(onDiskPath);

                // Replace ./assets with webviewUri/assets
                html = html.replace(/(src|href)="(?:\.\/)?assets\//g, `$1="${webviewUri}/assets/`);

                return html;
            } catch (e) {
                Logger.log(`Failed to load index.html: ${e}`);
                return `Failed to load UI: ${e}`;
            }
        }
    }

    public postMessage(message: any) {
        this._panel.webview.postMessage(message);
    }
}
