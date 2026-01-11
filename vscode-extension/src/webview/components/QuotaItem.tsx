import React from 'react';
import { useTranslation } from 'react-i18next';

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
    const val = isValid ? Math.round(percentage! * 100) : t('dashboard:quota.unknown');

    // Only show reset text if valid and used (less than 100% typically, or logic as needed)
    // Original logic was percentage < 1, which implies < 100%. 
    // If -1 comes in, we don't want to show resetText if it's invalid.
    const showReset = isValid && percentage! < 1 && resetText;

    return (
        <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                    <span className="opacity-90 font-medium">{label}</span>
                    {showReset && (
                        <span className="text-[10px] opacity-60 ml-1">
                            ({formatTime(resetText).split(' ')[1] || formatTime(resetText)})
                        </span>
                    )}
                </div>
                <span className={`font-bold text-xs ${getQuotaColor(isValid ? percentage : undefined)}`}>
                    {val}{isValid ? '%' : ''}
                </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${percentage === undefined ? 'bg-white/20' :
                        percentage < 0.2 ? 'bg-red-500' :
                            percentage < 0.5 ? 'bg-yellow-500' :
                                'bg-vscode-info'
                        }`}
                    style={{ width: `${Math.max(5, (percentage || 0) * 100)}%` }} // Min width 5% so it's visible
                />
            </div>
        </div>
    );
};
