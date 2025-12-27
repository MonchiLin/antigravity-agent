import React from 'react';
import { VSCodeButton, VSCodeTag } from '@vscode/webview-ui-toolkit/react';
import { useTranslation } from 'react-i18next';
import { QuotaItem } from './QuotaItem';

interface AccountData {
    geminiProQuote?: number;
    geminiProQuoteRestIn?: string;
    claudeQuote?: number;
    claudeQuoteRestIn?: string;
    geminiFlashQuote?: number;
    geminiFlashQuoteRestIn?: string;
    geminiImageQuote?: number;
    geminiImageQuoteRestIn?: string;
    userAvatar?: string;
    userId?: string;
}

interface Account {
    context: {
        email: string;
        plan_name: string;
        plan?: {
            slug: string;
        };
    };
}

interface AccountCardProps {
    account: Account;
    data?: AccountData;
    isCurrent: boolean;
    onSwitch: (email: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, data, isCurrent, onSwitch }) => {
    const { t } = useTranslation(['common', 'dashboard']);

    return (
        <div className={`card flex flex-col gap-2.5 ${isCurrent ? 'card-active' : ''}`}>
            {/* Account Header */}
            <div className="flex justify-between items-center">
                <div className="flex gap-2.5 items-center">
                    {data?.userAvatar && (
                        <img
                            src={data.userAvatar}
                            className="w-8 h-8 rounded-full"
                            alt="avatar"
                        />
                    )}
                    <div>
                        <div className="font-bold">{account.context.plan_name || 'No Name'}</div>
                        <div className="text-xs opacity-70">{account.context.email}</div>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {isCurrent && (
                        <VSCodeTag className="bg-vscode-info text-white">
                            {t('common:status.current')}
                        </VSCodeTag>
                    )}
                    <VSCodeTag>{account.context.plan?.slug || t('common:status.unknown')}</VSCodeTag>
                    {!isCurrent && (
                        <VSCodeButton
                            appearance="secondary"
                            onClick={() => onSwitch(account.context.email)}
                        >
                            {t('common:actions.switch')}
                        </VSCodeButton>
                    )}
                </div>
            </div>

            {/* Quotas Section */}
            <div className="quota-section flex flex-col gap-2">
                {!data ? (
                    <div className="text-xs opacity-60">{t('dashboard:loadingQuota')}</div>
                ) : (
                    <>
                        <QuotaItem label="Gemini Pro" percentage={data.geminiProQuote} resetText={data.geminiProQuoteRestIn} />
                        <QuotaItem label="Claude" percentage={data.claudeQuote} resetText={data.claudeQuoteRestIn} />
                        <QuotaItem label="Gemini Flash" percentage={data.geminiFlashQuote} resetText={data.geminiFlashQuoteRestIn} />
                        <QuotaItem label="Gemini Image" percentage={data.geminiImageQuote} resetText={data.geminiImageQuoteRestIn} />
                    </>
                )}
            </div>
        </div>
    );
};
