import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isWeb = mode === 'web' || process.env.VITE_TARGET === 'web';

  return {
    base: './',
    plugins: [
      react(),
      ...(!isWeb
        ? [
            electron([
              {
                entry: 'src/main.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      output: {
                        format: 'cjs',
                      },
                    },
                  },
                },
              },
              {
                entry: 'src/preload.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      output: {
                        format: 'cjs',
                      },
                    },
                  },
                },
              },
            ]),
            renderer(),
          ]
        : []),
    ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
};
});
