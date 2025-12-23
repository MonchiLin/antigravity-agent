import React, { useEffect, useState } from 'react';
import {
    VSCodeButton,
    VSCodeDataGrid,
    VSCodeDataGridRow,
    VSCodeDataGridCell,
    VSCodeDivider,
    VSCodeTag
} from '@vscode/webview-ui-toolkit/react';

const API_BASE = 'http://127.0.0.1:18888/api';

interface Account {
    context: {
        email: string;
        plan_name: string;
        plan?: {
            slug: string;
        };
    };
}

const App = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAccounts = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/accounts`);
            if (!res.ok) {
                throw new Error(`Failed to fetch accounts: ${res.statusText}`);
            }
            const data = await res.json();
            setAccounts(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const switchAccount = async (email: string) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/account/switch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text);
            }
            // After switch, maybe refresh or show success
            fetchAccounts();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    return (
        <div style={{ padding: '10px' }}>
            <h3>Antigravity Accounts</h3>
            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'var(--vscode-errorForeground)' }}>Error: {error}</div>}

            {!loading && !error && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {accounts.map((acc) => (
                        <div
                            key={acc.context.email}
                            style={{
                                border: '1px solid var(--vscode-widget-border)',
                                padding: '10px',
                                borderRadius: '4px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{acc.context.plan_name || 'No Name'}</div>
                                <div style={{ fontSize: '0.9em', opacity: 0.8 }}>{acc.context.email}</div>
                                <VSCodeTag>{acc.context.plan?.slug || 'Basic'}</VSCodeTag>
                            </div>
                            <VSCodeButton onClick={() => switchAccount(acc.context.email)}>
                                Switch
                            </VSCodeButton>
                        </div>
                    ))}
                </div>
            )}

            <VSCodeDivider />
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <VSCodeButton appearance="secondary" onClick={fetchAccounts}>Refresh List</VSCodeButton>
            </div>
        </div>
    );
};

export default App;
