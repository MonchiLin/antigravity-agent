import * as vscode from 'vscode';

/**
 * Simple logger utility for the Antigravity extension.
 * Wraps the VS Code output channel to provide consistent logging.
 */
export class Logger {
    private static outputChannel: vscode.OutputChannel;

    /**
     * Initializes the logger with an output channel.
     * @param context The extension context.
     */
    public static initialize(context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel("Antigravity Agent");
        context.subscriptions.push(this.outputChannel);
    }

    /**
     * Logs a message to the output channel with a timestamp.
     * @param message The message to log.
     * @param data Optional data object to stringify and append.
     */
    public static log(message: string, data?: any) {
        if (!this.outputChannel) {
            console.log(`[Antigravity Pre-Init] ${message}`, data || '');
            return;
        }

        const timestamp = new Date().toLocaleTimeString();
        let logMessage = `[${timestamp}] ${message}`;

        if (data) {
            if (data instanceof Error) {
                logMessage += `\nError: ${data.message}\nStack: ${data.stack}`;
            } else {
                try {
                    logMessage += ` ${JSON.stringify(data, null, 2)}`;
                } catch (e) {
                    logMessage += ` [Circular/Unserializable]`;
                }
            }
        }

        this.outputChannel.appendLine(logMessage);
    }
}
