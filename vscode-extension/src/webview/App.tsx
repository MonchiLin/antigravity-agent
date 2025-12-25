import {
    VSCodePanels,
    VSCodePanelTab,
    VSCodePanelView,
    VSCodeCheckbox
} from '@vscode/webview-ui-toolkit/react';
import React, { useState } from 'react';
import { AccountsTab } from './components/AccountsTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { useAnalyticsStore } from './store/analyticsStore';
import './App.css';

// Acquire VS Code API singleton
const vscodeApi = (() => {
    try {
        return (window as any).acquireVsCodeApi();
    } catch {
        return null;
    }
})();

// Export for other components
(window as any).vscode = vscodeApi;

const App: React.FC = () => {
    const [autoAccept, setAutoAccept] = useState(false);
    const [activeTab, setActiveTab] = useState('accounts');

    const vscode = vscodeApi;

    const addAutomationEvent = useAnalyticsStore(state => state.addAutomationEvent);

    const toggleAutoAccept = () => {
        const newState = !autoAccept;
        setAutoAccept(newState);
        if (vscode) {
            vscode.postMessage({
                command: 'setAutoAccept',
                enabled: newState
            });
        }
    };

    // Listen for messages from the extension
    React.useEffect(() => {
        const handler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'automationEvent':
                    addAutomationEvent(message.actions, message.timeSaved);
                    break;
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [addAutomationEvent]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-vscode-bg text-vscode-fg">
            {/* Nav Row */}
            <div className="flex items-center justify-between border-b border-vscode-border h-[35px] shrink-0 px-2 select-none">
                <div className="flex h-full gap-2">
                    <div
                        onClick={() => setActiveTab('accounts')}
                        className={`px-3 h-full flex items-center cursor-pointer text-[13px] transition-all border-b-2 ${activeTab === 'accounts'
                            ? 'border-vscode-info opacity-100 font-medium'
                            : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                    >
                        账户列表
                    </div>
                    <div
                        onClick={() => setActiveTab('analytics')}
                        className={`px-3 h-full flex items-center cursor-pointer text-[13px] transition-all border-b-2 ${activeTab === 'analytics'
                            ? 'border-vscode-info opacity-100 font-medium'
                            : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                    >
                        效率概览
                    </div>
                </div>

                <div className="flex items-center px-2">
                    <VSCodeCheckbox
                        checked={autoAccept}
                        onChange={toggleAutoAccept}
                        className="text-[12px] opacity-70"
                    >
                        自动驾驶
                    </VSCodeCheckbox>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'accounts' ? (
                    <div className="h-full">
                        <AccountsTab />
                    </div>
                ) : (
                    <div className="h-full p-4">
                        <AnalyticsTab />
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;

