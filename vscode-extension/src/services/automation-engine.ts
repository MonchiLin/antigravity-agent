import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export interface AutomationResult {
    clicked: string[];
}

/**
 * Service responsible for executing automation actions.
 */
export class AutomationEngine {

    /**
     * Executes a cycle of automation commands.
     * Prioritizes accepting agent suggestions and running terminal commands.
     */
    public static async runCycle(): Promise<AutomationResult> {
        const result: AutomationResult = { clicked: [] };

        // 1. Core Accept Logic (Editor Context)
        try {
            await vscode.commands.executeCommand('antigravity.agent.acceptAgentStep');
            result.clicked.push('Accept');
        } catch (e) { /* Command availability depends on context, ignore failures */ }

        // 2. Terminal Auto-Run Logic
        try {
            await vscode.commands.executeCommand('antigravity.terminal.accept');
            result.clicked.push('Run');
        } catch (e) { /* ignore */ }

        if (result.clicked.length > 0) {
            Logger.log(`🤖 Automation: Triggered [${result.clicked.join(', ')}]`);
        }

        return result;
    }
}
