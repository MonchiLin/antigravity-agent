import { Logger } from '../utils/logger';
import { AutomationEngine } from '../services/automation-engine';

/**
 * Manages the "Auto Pilot" mode which automatically accepts suggestions and runs commands.
 * Orchestrates the automation cycle with randomized timing.
 */
export class AutoAcceptManager {
    private static enabled = false;
    private static timer: NodeJS.Timeout | undefined;

    /**
     * Toggles the Smart Pilot mode (Auto-Accept).
     * @param enabled Whether to enable or disable the pilot.
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
        // Simulates human reaction time to avoid conflicting with rapid updates or looking robotic
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
            await AutomationEngine.runCycle();
        } catch (e) {
            Logger.log(`❌ Automation Cycle Error: ${e}`);
        }
    }
}
