import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    // Custom plugin to copy type definitions after build
    {
      name: 'copy-dts',
      closeBundle() {
        const src = resolve(__dirname, 'src/web-component/index.d.ts');
        const dest = resolve(__dirname, 'dist/web-component/index.d.ts');
        copyFileSync(src, dest);
        console.log('✓ Copied index.d.ts to dist/web-component/');
      },
    },
  ],
  publicDir: false, // Don't copy public folder files for library build
  build: {
    lib: {
      entry: resolve(__dirname, 'src/web-component/index.ts'),
      name: 'NMRiumWebComponent',
      formats: ['es', 'umd'],
      fileName: (format) => `nmrium-webcomponent.${format}.js`,
    },
    outDir: 'dist/web-component',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Ensure React is bundled with the component
        globals: {},
        assetFileNames: 'nmrium-webcomponent.[ext]',
        // Inline CSS into JS bundle for self-contained web component
        inlineDynamicImports: true,
        // Use named exports to avoid default export warning
        exports: 'named',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});