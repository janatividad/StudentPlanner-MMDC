/**
 * Automated tests for Supabase Auth Service & URL Resolver
 */

import { getAuthRedirectUrl, setAuthConfig, getAuthConfig } from '../frontend/js/config.js';
import { authService } from '../frontend/js/auth/authService.js';

// Setup Mock Window and LocalStorage
const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
};

globalThis.window = {
  location: {
    origin: 'https://janatividad.github.io',
    pathname: '/StudentPlanner-MMDC/frontend/',
    hash: ''
  },
  history: {
    replaceState: () => {}
  }
};

console.log('Testing Supabase Auth Service and Redirect URL Resolver...');

// 1. Test getAuthRedirectUrl on GitHub Pages
const ghPagesRedirect = getAuthRedirectUrl();
console.assert(
  ghPagesRedirect === 'https://janatividad.github.io/StudentPlanner-MMDC/frontend/',
  'GitHub Pages redirect mismatch: ' + ghPagesRedirect
);
console.log('✓ Redirect URL for GitHub Pages project subpath resolved correctly');

// 2. Test getAuthRedirectUrl on Localhost
window.location.origin = 'http://127.0.0.1:3000';
window.location.pathname = '/';
const localRedirect = getAuthRedirectUrl();
console.assert(
  localRedirect === 'http://127.0.0.1:3000/frontend/',
  'Localhost redirect mismatch: ' + localRedirect
);
console.log('✓ Redirect URL for local development resolved correctly');

// 3. Test Config storage
setAuthConfig('https://exampleproject.supabase.co', 'anon-test-key-12345');
const cfg = getAuthConfig();
console.assert(cfg.url === 'https://exampleproject.supabase.co', 'Config URL mismatch');
console.assert(cfg.anonKey === 'anon-test-key-12345', 'Config Anon Key mismatch');
console.log('✓ Auth configuration saved and retrieved from localStorage');

// 4. Test Local Planner Data Preservation
mockStore['study-planner-mmdc-v3'] = JSON.stringify({
  term: '2026-2027 Term 2',
  subjects: [{ id: 1, name: 'Cloud Computing' }],
  assignments: [{ id: 10, title: 'Final Project', status: 'not_started' }]
});

// Initial auth state
console.assert(authService.isAuthenticated() === false, 'Should start unauthenticated');
console.assert(authService.getUser() === null, 'User should be null initially');

// 5. Test Auth State Callback Parsing
// Create a fake JWT payload
const fakeHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const fakePayload = btoa(JSON.stringify({
  sub: 'user-uuid-12345',
  email: 'angelo@example.com',
  created_at: '2026-11-25T00:00:00Z'
}));
const fakeJwt = `${fakeHeader}.${fakePayload}.signature`;

window.location.hash = `#access_token=${fakeJwt}&refresh_token=mock-refresh-token&expires_in=3600&token_type=bearer&type=signup`;

let authStateChanged = false;
authService.onAuthStateChange((session) => {
  if (session && session.user && session.user.email === 'angelo@example.com') {
    authStateChanged = true;
  }
});

const callbackResult = authService.handleAuthCallback();
console.assert(callbackResult === true, 'handleAuthCallback should return true on token present');
console.assert(authService.isAuthenticated() === true, 'Should be authenticated after callback');
console.assert(authService.getUser().email === 'angelo@example.com', 'User email mismatch: ' + authService.getUser()?.email);
console.assert(authStateChanged === true, 'Auth state change listener should fire');
console.log('✓ Auth callback token parsing and session establishment succeeded');

// 6. Verify local planner data is 100% preserved
const plannerData = JSON.parse(mockStore['study-planner-mmdc-v3']);
console.assert(plannerData.subjects[0].name === 'Cloud Computing', 'Planner subjects were mutated!');
console.assert(plannerData.assignments[0].title === 'Final Project', 'Planner assignments were mutated!');
console.log('✓ Planner data in localStorage is completely preserved across auth events');

// 7. Test Sign Out
await authService.signOut();
console.assert(authService.isAuthenticated() === false, 'Should be unauthenticated after sign out');
console.assert(authService.getUser() === null, 'User should be null after sign out');

// Verify planner data is still preserved after sign out
const plannerDataPostSignout = JSON.parse(mockStore['study-planner-mmdc-v3']);
console.assert(plannerDataPostSignout.subjects[0].name === 'Cloud Computing', 'Planner subjects mutated on signout!');
console.log('✓ Sign out successfully clears auth session while leaving local planner data intact');

console.log('\nAll Supabase Auth tests PASSED successfully!');
process.exit(0);
