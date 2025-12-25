import * as vscode from 'vscode';
import { Logger } from './logger';

export interface AutomationResult {
    clicked: string[];
    timeSaved: number;
}

export class AutomationEngine {
    // Standard multipliers for ROI (in seconds)
    private static readonly ROI_CONFIG = {
        'Accept': 25,
        'Run': 15
    };

    /**
     * Executes a suite of automation commands based on the current context.
     * Prioritizes internal commands but can be extended for more proactive behaviors.
     */
    public static async runCycle(): Promise<AutomationResult> {
        const result: AutomationResult = { clicked: [], timeSaved: 0 };

        // 1. Core Accept Logic
        try {
            // Attempt to accept Agent steps (Context: Editor)
            // This is the most common action
            await vscode.commands.executeCommand('antigravity.agent.acceptAgentStep');
            // If successful (no way to know for sure via standard API, but we track the intent)
            result.clicked.push('Accept');
            result.timeSaved += this.ROI_CONFIG['Accept'];
        } catch (e) { /* ignore */ }

        // 2. Terminal Commands
        try {
            await vscode.commands.executeCommand('antigravity.terminal.accept');
            result.clicked.push('Run');
            result.timeSaved += this.ROI_CONFIG['Run'];
        } catch (e) { /* ignore */ }

        if (result.clicked.length > 0) {
            Logger.log(`🤖 Automation: Triggered [${result.clicked.join(', ')}] - Saved approx ${result.timeSaved}s`);
        }

        return result;
    }
}
