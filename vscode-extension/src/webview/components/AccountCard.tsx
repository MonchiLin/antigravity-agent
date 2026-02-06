import React from 'react';
import { VSCodeButton, VSCodeTag } from '@vscode/webview-ui-toolkit/react';
import { useTranslation } from 'react-i18next';
import { QuotaItem } from './QuotaItem';
import { AntigravityAccount } from '@/commands/types/account.types';

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

interface AccountCardProps {
    account: AntigravityAccount;
    data?: AccountData;
    isCurrent: boolean;
    onSwitch: (email: string) => void;
    privacyMode: boolean;
}

const maskEmail = (email: string): string => {
    try {
        const parts = email.split('@');
        if (parts.length < 2) return email;

        const [local, domain] = parts;
        if (local.length <= 2) return `${local[0]}***@${domain}`;

        // Keep first char, mask middle, show last char if length > 3
        const visibleStart = local.slice(0, 1);
        const visibleEnd = local.length > 3 ? local.slice(-1) : '';
        return `${visibleStart}***${visibleEnd}@${domain}`;
    } catch {
        return email;
    }
};

export const AccountCard: React.FC<AccountCardProps> = ({ account, data, isCurrent, onSwitch, privacyMode }) => {
    const { t } = useTranslation(['common', 'dashboard']);
    const email = account.antigravityAuthStatus.email;
    const displayEmail = privacyMode ? maskEmail(email) : email;
    const planName = account.userStatus?.rawData?.plan_name;
    const tierId = account.userStatus?.rawData?.plan?.tier_id;

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
                        <div className="font-bold">{planName || t('common:status.noName')}</div>
                        <div className="text-xs opacity-70" title={email}>{displayEmail}</div>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {isCurrent && (
                        <VSCodeTag className="bg-vscode-info text-white">
                            {t('common:status.current')}
                        </VSCodeTag>
                    )}
                    <VSCodeTag>{tierId || t('common:status.unknown')}</VSCodeTag>
                    {!isCurrent && (
                        <VSCodeButton
                            appearance="secondary"
                            className="h-6"
                            onClick={() => onSwitch(email)}
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
