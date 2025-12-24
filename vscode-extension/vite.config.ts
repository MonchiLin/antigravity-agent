import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vscode from '@tomjs/vite-plugin-vscode';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [
        tailwindcss(),
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
            // 强制所有模块使用同一个 React 实例（避免父项目 React 19 和当前 React 18 冲突）
            'react': path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
            // 项目路径别名
            '@': path.resolve(__dirname, '../src'),
            '@tauri-apps/api/core': path.resolve(__dirname, 'src/shim/tauri-api.ts'),
            '@tauri-apps/plugin-http': path.resolve(__dirname, 'src/shim/tauri-http.ts'),
        }
    },
    server: {
        port: 5173,
        strictPort: true,
        host: '127.0.0.1',
        cors: {
            origin: '*',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            preflightContinue: false,
            optionsSuccessStatus: 204
        }
    }
});
