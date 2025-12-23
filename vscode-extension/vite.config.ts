import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vscode from '@tomjs/vite-plugin-vscode';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        vscode({
            extension: {
                entry: 'src/extension.ts',
                formats: ['cjs'], // VS Code extensions essentially run in Node.js, CJS is standard
            },
            webview: {
                'antigravity.view': {
                    entry: 'index.html',
                }
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        }
    }
});
