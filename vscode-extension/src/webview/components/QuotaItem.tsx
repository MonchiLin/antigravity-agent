import React from 'react';
import {useTranslation} from 'react-i18next';

interface QuotaItemProps {
    label: string;
    percentage: number | undefined;
    resetText?: string;
}

const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
        return isoString;
    }
};

const getQuotaColor = (percentage: number | undefined) => {
    if (percentage === undefined) return 'text-vscode-info';
    if (percentage < 0.2) return 'text-red-500';
    if (percentage < 0.5) return 'text-yellow-500';
    return 'text-vscode-info';
};

export const QuotaItem: React.FC<QuotaItemProps> = ({ label, percentage, resetText }) => {
    const { t } = useTranslation(['dashboard']);

    // Treat undefined or negative values as unknown/invalid
    const isValid = percentage !== undefined && percentage >= 0;
    const val = isValid ? Math.round(percentage! * 100) : '?';

    // Only show reset text if valid and used (less than 100% typically, or logic as needed)
    // Original logic was percentage < 1, which implies < 100%. 
    // If -1 comes in, we don't want to show resetText if it's invalid.
    const showReset = isValid && percentage! < 1 && resetText;

    return (
        <div className="flex items-center justify-between text-sm mt-1">
            <div className="flex items-center gap-2">
                <span className="opacity-80">{label}</span>
                {showReset && (
                    <span className="text-xs opacity-70 ml-1">
                        {t('dashboard:quota.resetAt', { time: formatTime(resetText) })}
                    </span>
                )}
            </div>
            <span
                className={`font-bold ${getQuotaColor(isValid ? percentage : undefined)}`}>{val}{isValid ? '%' : ''}</span>
        </div>
    );
};
