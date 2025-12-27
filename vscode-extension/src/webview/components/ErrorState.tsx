import React, { useState, useEffect } from 'react';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
    error: string;
    onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
    const { t } = useTranslation(['dashboard']);
    const [copied, setCopied] = useState(false);
    const repoUrl = 'https://github.com/MonchiLin/antigravity-agent';

    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else {
            onRetry();
            setCountdown(5); // Reset for next cycle if retry fails immediately
        }
        return () => clearTimeout(timer);
    }, [countdown, onRetry]);

    const handleManualRetry = () => {
        setCountdown(5);
        onRetry();
    };

    const handleCopy = () => {
        const api = (window as any).vscode;
        if (api) {
            api.postMessage({
                command: 'copyToClipboard',
                text: repoUrl
            });
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 h-full min-h-[400px] text-center w-full mx-auto overflow-hidden">
            <div className="codicon codicon-debug-disconnect text-6xl mb-6 opacity-20 text-vscode-error"></div>

            <h2 className="text-xl font-normal mb-3">{t('dashboard:errorState.title')}</h2>

            <p className="text-[13px] opacity-60 max-w-md mb-8 leading-relaxed">
                {t('dashboard:errorState.description')}
            </p>

            <div className="flex flex-col items-center gap-5 w-full max-w-md">
                <div className="w-full bg-vscode-input-bg border border-vscode-border rounded p-4 text-left">
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-[10px] uppercase opacity-40 font-bold tracking-wider">{t('dashboard:errorState.notInstalled')}</div>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider hover:text-vscode-info transition-colors bg-transparent border-none cursor-pointer outline-none"
                        >
                            <span className={`codicon ${copied ? 'codicon-check text-vscode-success' : 'codicon-copy'} text-[12px]`}></span>
                            {copied ? t('dashboard:errorState.copied') : t('dashboard:errorState.copyLink')}
                        </button>
                    </div>
                    <a
                        href={`command:vscode.open?${encodeURIComponent(JSON.stringify([repoUrl]))}`}
                        className="text-sm font-mono block opacity-80 hover:text-vscode-info transition-colors cursor-pointer break-all underline decoration-vscode-info/30 hover:decoration-vscode-info p-1 no-underline"
                        title={t('dashboard:errorState.openInBrowser')}
                    >
                        {repoUrl}
                    </a>
                </div>

                <div className="w-full flex flex-col gap-2">
                    <VSCodeButton className="w-full" onClick={handleManualRetry}>
                        {t('dashboard:errorState.retry')}
                    </VSCodeButton>
                    <div className="text-[11px] opacity-40 animate-pulse">
                        {t('dashboard:errorState.reconnect', { seconds: countdown })}
                    </div>
                </div>
            </div>
        </div>
    );
};
