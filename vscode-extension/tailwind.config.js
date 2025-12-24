/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/webview/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // VS Code 颜色变量映射
                'vscode-bg': 'var(--vscode-editor-background)',
                'vscode-fg': 'var(--vscode-foreground)',
                'vscode-border': 'var(--vscode-widget-border)',
                'vscode-input-bg': 'var(--vscode-input-background)',
                'vscode-button-bg': 'var(--vscode-button-background)',
                'vscode-button-fg': 'var(--vscode-button-foreground)',
                'vscode-error': 'var(--vscode-errorForeground)',
                'vscode-success': 'var(--vscode-charts-green)',
                'vscode-warning': 'var(--vscode-charts-yellow)',
                'vscode-info': 'var(--vscode-charts-blue)',
                'vscode-quote-bg': 'var(--vscode-textBlockQuote-background)',
                'vscode-quote-border': 'var(--vscode-textBlockQuote-border)',
            },
        },
    },
    plugins: [],
}
