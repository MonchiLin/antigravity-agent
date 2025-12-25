import React, { useEffect, useState } from 'react';
import { VSCodeProgressRing } from '@vscode/webview-ui-toolkit/react';
import { useAccountAdditionData } from '@/modules/use-account-addition-data';
import { invoke } from '@tauri-apps/api/core';
import { AccountCard } from './AccountCard';
import { ErrorState } from './ErrorState';
import './AccountsTab.css';

interface Account {
    context: {
        email: string;
        plan_name: string;
        plan?: {
            slug: string;
        };
    };
    auth: {
        access_token: string;
        id_token: string;
    };
}

export const AccountsTab: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentEmail, setCurrentEmail] = useState<string | null>(null);

    const additionData = useAccountAdditionData();

    const fetchAccounts = async () => {
        setLoading(true);
        setError(null);
        try {
            const [data, currentInfo] = await Promise.all([
                invoke<Account[]>('get_antigravity_accounts'),
                invoke<any>('get_current_antigravity_account_info').catch(() => null)
            ]);

            setAccounts(data);
            if (currentInfo?.context?.email) {
                setCurrentEmail(currentInfo.context.email);
            }

            data.forEach(account => {
                additionData.update(account as any).catch(e => console.error("Failed to update quota", e));
            });
        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const switchAccount = async (email: string) => {
        try {
            setLoading(true);
            await invoke('switch_to_antigravity_account', { account_name: email });
            await fetchAccounts();
        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
        const intervalId = setInterval(() => fetchAccounts(), 30 * 1000);
        return () => clearInterval(intervalId);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[200px]">
                <VSCodeProgressRing />
            </div>
        );
    }


    if (error) {
        return <ErrorState error={error} onRetry={fetchAccounts} />;
    }

    return (
        <div className="accounts-container">
            <div className="accounts-grid">
                {accounts.map((acc) => (
                    <AccountCard
                        key={acc.context.email}
                        account={acc}
                        data={additionData.data[acc.context.email]}
                        isCurrent={currentEmail === acc.context.email}
                        onSwitch={switchAccount}
                    />
                ))}
            </div>
        </div>
    );
};
