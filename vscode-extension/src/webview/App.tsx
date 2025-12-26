import {
    VSCodePanels,
    VSCodePanelTab,
    VSCodePanelView,
    VSCodeCheckbox
} from '@vscode/webview-ui-toolkit/react';
import React, { useState } from 'react';
import { AccountsTab } from './components/AccountsTab';
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
    const vscode = vscodeApi;

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

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-vscode-bg text-vscode-fg">
            {/* Nav Row */}
            <div className="flex items-center justify-between border-b border-vscode-border h-[35px] shrink-0 px-2 select-none">
                <div className="flex h-full gap-2">
                    <div
                        className="px-3 h-full flex items-center text-[13px] font-medium border-b-2 border-vscode-info opacity-100"
                    >
                        账户列表
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
                <div className="h-full">
                    <AccountsTab />
                </div>
            </div>
        </div>
    );
};

export default App;

