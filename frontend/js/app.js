/**
 * Application Entry Point
 */
import { loadState } from './state.js';
import { setupEventListeners } from './events.js';
import { renderApp } from './router.js';

export function initApp() {
  loadState();
  setupEventListeners();
  renderApp();
}

// Bootstrap on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
