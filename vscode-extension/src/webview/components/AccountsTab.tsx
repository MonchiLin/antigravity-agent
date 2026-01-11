import React, { useEffect } from 'react';
import { VSCodeProgressRing } from '@vscode/webview-ui-toolkit/react';
import { useAccountAdditionData } from '@/modules/use-account-addition-data';
import { useAntigravityAccount } from '@/modules/use-antigravity-account';
import { AccountCard } from './AccountCard';
import './AccountsTab.css';

interface AccountsTabProps {
    privacyMode: boolean;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({ privacyMode }) => {
    const {
        accounts,
        currentAuthInfo,
        getAccounts,
        insertOrUpdateCurrentAccount,
        switchToAccount
    } = useAntigravityAccount();
    const additionData = useAccountAdditionData();

    // 初始化加载
    useEffect(() => {
        const init = async () => {
            await Promise.all([
                getAccounts(),
                insertOrUpdateCurrentAccount()
            ]);
        };
        init();
    }, []);

    // 轮询更新账户列表和额度信息
    useEffect(() => {
        if (accounts.length === 0) return;

        // 更新额度信息
        accounts.forEach(account => {
            additionData.update(account).catch(e => console.error("Failed to update quota", e));
        });

        // 定时轮询
        const intervalId = setInterval(() => {
            getAccounts();
            insertOrUpdateCurrentAccount();
            accounts.forEach(account => {
                additionData.update(account).catch(e => console.error("Failed to update quota", e));
            });
        }, 30 * 1000);

        return () => clearInterval(intervalId);
    }, [accounts.length]); // 依赖 accounts.length 避免频繁重置定时器，但确保有账户时才开始干活

    const handleSwitchAccount = async (email: string) => {
        await switchToAccount(email);
        // 切换后刷新数据
        await Promise.all([
            getAccounts(),
            insertOrUpdateCurrentAccount()
        ]);
    };

    if (!accounts && !currentAuthInfo) {
        return (
            <div className="flex items-center justify-center h-full min-h-[200px]">
                <VSCodeProgressRing />
            </div>
        );
    }

    return (
        <div className="accounts-container">
            <div className="accounts-grid">
                {accounts.map((acc) => (
                    <AccountCard
                        key={acc.context.email}
                        account={acc}
                        data={additionData.data[acc.context.email]}
                        isCurrent={currentAuthInfo?.context.email === acc.context.email}
                        onSwitch={handleSwitchAccount}
                        privacyMode={privacyMode}
                    />
                ))}
            </div>
        </div>
    );
};
