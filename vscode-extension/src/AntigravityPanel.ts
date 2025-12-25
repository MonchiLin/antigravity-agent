import * as vscode from 'vscode';




export class AntigravityPanel {
    public static currentPanel: AntigravityPanel | undefined;
    private static readonly viewType = 'antigravity';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

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
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                try {
                    console.log(`[Antigravity] Received message: ${JSON.stringify(message)}`);
                    switch (message.command) {
                        case 'setAutoAccept':
                            const { AutoAcceptManager } = require('./auto-accept-manager');
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
                    console.error(`[Antigravity] Error handling message: ${err}`);
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
        this._panel.webview.html = __getWebviewHtml__({
            serverUrl: process.env.VITE_DEV_SERVER_URL,
            webview: this._panel.webview,
            context,
        });
    }



    public postMessage(message: any) {
        this._panel.webview.postMessage(message);
    }


}
