import React from 'react';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';

interface ErrorStateProps {
    error: string;
    onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
    return (
        <div className="p-5 border border-vscode-error rounded-md flex flex-col items-center gap-3 bg-[var(--vscode-inputValidation-errorBackground)]">
            <div className="text-3xl">⚠️</div>
            <div className="font-bold">Backend Disconnected</div>
            <div className="text-center opacity-90 text-sm">
                Unable to connect to Antigravity Agent.<br />
                Please ensure the Rust backend is running.
            </div>
            <code className="bg-vscode-quote-bg px-2 py-1 rounded text-sm">
                cargo run
            </code>
            <VSCodeButton onClick={onRetry}>Retry Connection</VSCodeButton>
            <div className="text-xs opacity-50 mt-2">
                Detailed Error: {error}
            </div>
        </div>
    );
};
