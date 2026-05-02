import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    // ── Development proxy ─────────────────────────────────────────────────────
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },

    // ── Production build optimizations ───────────────────────────────────────
    build: {
      // Warn if any single chunk exceeds 500KB
      chunkSizeWarningLimit: 500,

      rollupOptions: {
        output: {
          /**
           * Manual chunk splitting strategy.
           *
           * WHY: Without this, Vite bundles React, Firebase, and our app into
           * one giant file. Users who return to the site re-download the entire
           * bundle even if only our code changed.
           *
           * WITH THIS: Each group gets a separate cached chunk.
           * - 'vendor-react': Changes almost never → cached very long
           * - 'vendor-firebase': Changes rarely → cached long
           * - 'vendor-ui': Toast/router change infrequently
           * - Our app code: Changes often → short cache, small download
           */
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/react-router-dom') ||
                id.includes('node_modules/react-hot-toast')) {
              return 'vendor-ui';
            }
          },
        },
      },

      // Generate source maps for production error tracking (e.g., Sentry)
      sourcemap: mode === 'production' ? 'hidden' : true,
    },

    // ── Environment variable passthrough ─────────────────────────────────────
    define: {
      // Make the app version available for the X-App-Version header
      'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.0'),
    },
  };
});
