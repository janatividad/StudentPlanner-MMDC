/**
 * Application Entry Point
 */
import { loadState } from './state.js';
import { setupEventListeners } from './events.js';
import { renderApp } from './router.js';
import { authService } from './auth/authService.js';
import { plannerSyncService } from './services/plannerSyncService.js';

export function initApp() {
  loadState();
  setupEventListeners();

  // Process incoming Supabase Auth callback tokens if present in URL hash
  authService.handleAuthCallback();

  // Listen to full planner cloud sync changes
  plannerSyncService.onSyncChange(() => {
    renderApp();
  });

  // Listen to auth state transitions (sign in, sign out, token refresh)
  authService.onAuthStateChange((user) => {
    if (user) {
      plannerSyncService.fetchCloudPlanner();
    } else {
      plannerSyncService.clearCloudState();
    }
    renderApp();
  });

  // If already logged in on initial load, fetch cloud planner entities
  if (authService.isAuthenticated()) {
    plannerSyncService.fetchCloudPlanner();
  }

  renderApp();
  registerServiceWorker();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      // Register sw.js relative to frontend
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered in scope:', reg.scope);
        })
        .catch((err) => {
          // If frontend is accessed from root scope
          navigator.serviceWorker
            .register('../sw.js')
            .then((reg) => {
              console.log('[PWA] Root Service Worker registered in scope:', reg.scope);
            })
            .catch((rootErr) => {
              console.warn('[PWA] Service Worker registration failed:', err, rootErr);
            });
        });
    });
  }
}

// Bootstrap on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
