import {defineConfig} from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        minify: false,
        lib: {
            entry: 'src/extension.ts',
            fileName: () => 'extension.js',
            formats: ['es']
        },
        outDir: 'dist/extension',
        rollupOptions: {
            // VS Code extension host runs in Node.js, so we externalize built-ins and 'vscode'
            external: [
                'vscode',
                'fs', 'path', 'os', 'child_process', 'crypto', 'events', 'util', 'net', 'http', 'https', 'stream', 'url', 'zlib',
                // Keep other dependencies external if they are in node_modules and not bundled?
                // For extensions, usually we bundle dependencies to avoid node_modules bloat in VSIX, 
                // UNLESS they are binary or huge.
                // Vite lib mode bundles by default.
            ],
            output: {
                inlineDynamicImports: true,
            }
        },
        // Target Node.js corresponding to VS Code version
        target: 'node16',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../src'),
        }
    }
});
