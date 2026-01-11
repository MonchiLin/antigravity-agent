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
    const [privacyMode, setPrivacyMode] = useState(false);
    const [showAccount, setShowAccount] = useState(true);

    // Listen for state messages from Extension Host
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'autoPilotState') {
                setAutoAccept(message.enabled);
            } else if (message.command === 'privacyModeState') {
                setPrivacyMode(message.enabled);
            } else if (message.command === 'showAccountState') {
                setShowAccount(message.enabled);
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

    const togglePrivacyMode = () => {
        const newState = !privacyMode;
        setPrivacyMode(newState);
        if (vscodeApi) {
            vscodeApi.postMessage({
                command: 'setPrivacyMode',
                enabled: newState
            });
        }
    };

    const toggleShowAccount = () => {
        const newState = !showAccount;
        setShowAccount(newState);
        if (vscodeApi) {
            vscodeApi.postMessage({
                command: 'setShowAccount',
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
                    <VSCodeCheckbox
                        checked={privacyMode}
                        onChange={togglePrivacyMode}
                        className="text-[12px] opacity-70"
                    >
                        Privacy Mode
                    </VSCodeCheckbox>
                    <VSCodeCheckbox
                        checked={showAccount}
                        onChange={toggleShowAccount}
                        className="text-[12px] opacity-70"
                    >
                        Show Account
                    </VSCodeCheckbox>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                <div className="h-full">
                    <AccountsTab privacyMode={privacyMode} />
                </div>
            </div>
        </div>
    );
};

export default App;

