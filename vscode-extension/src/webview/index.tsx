import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n/index';
import App from './App';

// 全局错误捕获
window.onerror = (message, source, lineno, colno, error) => {
    console.error('Global error:', message, source, lineno, colno, error);
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">
            <h2>Runtime Error</h2>
            <p>${message}</p>
            <p>Source: ${source}:${lineno}:${colno}</p>
            <pre>${error?.stack || 'No stack trace'}</pre>
        </div>`;
    }
};

// Promise rejection 捕获
window.onunhandledrejection = (event) => {
    console.error('Unhandled rejection:', event.reason);
};

// 错误边界组件
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
                    <h2>Something went wrong</h2>
                    <p>{this.state.error?.message}</p>
                    <pre>{this.state.error?.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
} else {
    console.error('Root container not found!');
}
