import React from 'react';
import {
    VSCodePanels,
    VSCodePanelTab,
    VSCodePanelView
} from '@vscode/webview-ui-toolkit/react';
import { AccountsTab } from './components/AccountsTab';
import './App.css';

const App: React.FC = () => {
    return (
        <div className="app-container">
            <VSCodePanels className="panels-full-width">
                <VSCodePanelTab id="tab-accounts">
                    Accounts
                </VSCodePanelTab>
                <VSCodePanelView id="view-accounts" className="panel-view">
                    <AccountsTab />
                </VSCodePanelView>
            </VSCodePanels>
        </div>
    );
};

export default App;
