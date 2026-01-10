import { VSCodeCheckbox, VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccountsTab } from './components/AccountsTab';
import { LanguageSwitcher } from './components/LanguageSwitcher';
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
    const { t } = useTranslation(['dashboard', 'common']);
    const [autoAccept, setAutoAccept] = useState(false);

    // Listen for state messages from Extension Host
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'autoPilotState') {
                setAutoAccept(message.enabled);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const toggleAutoAccept = () => {
        const newState = !autoAccept;
        setAutoAccept(newState);
        if (vscodeApi) {
            vscodeApi.postMessage({
                command: 'setAutoAccept',
                enabled: newState
            });
        }
    };

    const handleReload = () => {
        if (vscodeApi) {
            vscodeApi.postMessage({
                command: 'reloadWindow'
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
                        {t('dashboard:toolbar.accounts')}
                    </div>
                </div>

                <div className="flex items-center gap-4 px-2">
                    <LanguageSwitcher />
                    <VSCodeCheckbox
                        checked={autoAccept}
                        onChange={toggleAutoAccept}
                        className="text-[12px] opacity-70"
                    >
                        {t('dashboard:actions.autoPilot')}
                    </VSCodeCheckbox>
                    <VSCodeButton
                        appearance="secondary"
                        className="h-6 text-[12px]"
                        onClick={handleReload}
                    >
                        Reload
                    </VSCodeButton>
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

