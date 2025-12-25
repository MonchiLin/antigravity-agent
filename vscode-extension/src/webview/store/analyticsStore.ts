import { create } from 'zustand';

export interface AnalyticsState {
    totalClicks: number;
    totalTimeSaved: number; // in seconds
    sessionLog: Array<{ id: string; action: string; timestamp: number; timeSaved: number }>;

    // Actions
    addAutomationEvent: (actions: string[], timeSaved: number) => void;
    clearAnalytics: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
    totalClicks: 0,
    totalTimeSaved: 0,
    sessionLog: [],

    addAutomationEvent: (actions, timeSaved) => set((state) => ({
        totalClicks: state.totalClicks + actions.length,
        totalTimeSaved: state.totalTimeSaved + timeSaved,
        sessionLog: [
            {
                id: Math.random().toString(36).substring(7),
                action: actions.join(', '),
                timestamp: Date.now(),
                timeSaved
            },
            ...state.sessionLog
        ].slice(0, 50) // Keep last 50 events
    })),

    clearAnalytics: () => set({
        totalClicks: 0,
        totalTimeSaved: 0,
        sessionLog: []
    })
}));
