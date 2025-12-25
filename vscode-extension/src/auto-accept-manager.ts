import { Logger } from './logger';
import { AutomationEngine } from './automation-engine';
import { AntigravityPanel } from './AntigravityPanel';

export class AutoAcceptManager {
    private static enabled = false;
    private static timer: NodeJS.Timeout | undefined;

    /**
     * Toggles the Smart Pilot mode (Auto-Accept)
     */
    public static toggle(enabled: boolean) {
        this.enabled = enabled;
        if (this.enabled) {
            Logger.log('🚁 Smart Pilot: Engaged');
            this.scheduleNextRun();
        } else {
            Logger.log('🚁 Smart Pilot: Disengaged');
            this.stop();
        }
    }

    private static stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    private static scheduleNextRun() {
        if (!this.enabled) return;

        // Randomized Jitter: 400ms to 900ms
        // This makes it look less like a robot (fixed interval) and more like a fast human.
        const jitter = Math.floor(Math.random() * 500) + 400;

        this.timer = setTimeout(async () => {
            await this.performPilotActions();
            // Schedule the next one recursively
            this.scheduleNextRun();
        }, jitter);
    }

    private static async performPilotActions() {
        if (!this.enabled) return;

        try {
            const result = await AutomationEngine.runCycle();

            if (result.clicked.length > 0) {
                // If the panel is open, notify it for analytics update
                if (AntigravityPanel.currentPanel) {
                    AntigravityPanel.currentPanel.postMessage({
                        command: 'automationEvent',
                        actions: result.clicked,
                        timeSaved: result.timeSaved
                    });
                }
            }
        } catch (e) {
            Logger.log(`❌ Automation Cycle Error: ${e}`);
        }
    }
}
