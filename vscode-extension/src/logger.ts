import * as vscode from 'vscode';

export class Logger {
    private static _outputChannel: vscode.OutputChannel;

    public static initialize(context: vscode.ExtensionContext) {
        this._outputChannel = vscode.window.createOutputChannel('Antigravity Agent');
        context.subscriptions.push(this._outputChannel);
    }

    public static log(message: string, ...args: any[]) {
        const timestamp = new Date().toLocaleTimeString();
        let formattedMessage = `[${timestamp}] ${message}`;

        if (args.length > 0) {
            formattedMessage += ' ' + args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
            ).join(' ');
        }

        this._outputChannel.appendLine(formattedMessage);
        console.log(formattedMessage); // Also log to Debug Console
    }

    public static show() {
        this._outputChannel.show(true); // Preserve focus
    }
}
