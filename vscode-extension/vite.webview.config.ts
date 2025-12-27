import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    // Standard relative base for Webview assets to work in VS Code
    base: './',
    plugins: [
        tailwindcss(),
        react(),
    ],
    resolve: {
        alias: {
            // Force React 18 from local node_modules
            'react': path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
            // Project aliases
            '@': path.resolve(__dirname, '../src'),
            '@tauri-apps/api/core': path.resolve(__dirname, 'src/shim/tauri-api.ts'),
            '@tauri-apps/plugin-http': path.resolve(__dirname, 'src/shim/tauri-http.ts'),
        }
    },
    build: {
        outDir: 'dist/webview',
        emptyOutDir: true,
        rollupOptions: {
            input: 'index.html',
        }
    }
});
