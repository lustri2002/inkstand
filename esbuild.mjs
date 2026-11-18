import { copyFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('dist', { recursive: true });

await Promise.all([
  // Extension host
  build({
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['vscode'],
    sourcemap: true,
  }),
  // Script running inside the webview
  build({
    entryPoints: ['src/webview/main.ts'],
    outfile: 'dist/webview.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
  }),
  // Mermaid is loaded by the webview only for pages with a diagram, so it ships as its own file.
  copyFile('node_modules/mermaid/dist/mermaid.min.js', 'dist/mermaid.min.js'),
]);
