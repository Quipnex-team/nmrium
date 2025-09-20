import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic',
    }),
  ],
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
    rollupOptions: {
      output: {
        // Ensure React is bundled with the component
        globals: {},
        assetFileNames: 'nmrium-webcomponent.[ext]',
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