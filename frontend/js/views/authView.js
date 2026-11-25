/**
 * Authentication View (Sign In & Sign Up)
 * Mobile-first, accessible, matching the Student Planner MMDC design system.
 */

import { esc } from '../utils/helpers.js';
import { authService } from '../auth/authService.js';
import { getAuthConfig, getAuthRedirectUrl } from '../config.js';

export const authUiState = {
  mode: 'signin', // 'signin' | 'signup' | 'config'
  email: '',
  password: '',
  loading: false,
  error: '',
  successMessage: '',
  showConfig: false
};

export function renderAuthPage() {
  const user = authService.getUser();
  const config = getAuthConfig();
  const isConfigured = Boolean(config.url && config.anonKey);
  const redirectUrl = getAuthRedirectUrl();

  // If already authenticated, show account profile & sign-out UI
  if (user) {
    return `
      <div style="max-width: 540px; margin: 16px auto;">
        <nav class="meta" style="margin-bottom: 16px;">
          <a href="#" class="l">← Return to Dashboard</a>
        </nav>

        <div style="border: 1px solid var(--border); border-radius: 10px; background: var(--canvas); padding: 24px;">
          <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 16px;">
            <div style="font-size: 36px;">👤</div>
            <div>
              <h1 style="font-size: 22px; line-height: 28px; margin: 0;">Account Profile</h1>
              <div class="meta">${esc(user.email)}</div>
            </div>
          </div>

          <div class="banner" style="background: var(--okbg); color: var(--ok); border: 1px solid var(--ok); margin-bottom: 16px;">
            <strong>✓ Signed In via Supabase</strong>
            <p style="margin: 4px 0 0; font-size: 13px;">
              Your account is active. Session management and authentication are securely handled by Supabase Auth.
            </p>
          </div>

          <!-- Local Storage Preservation Notice -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <div style="display:flex; gap: 8px; align-items:flex-start;">
              <span style="font-size: 18px;">ℹ️</span>
              <div style="font-size: 13px; line-height: 18px; color: var(--text);">
                <strong>Local Planner Storage Active:</strong><br>
                All your subjects, assignments, notes, and custom properties remain saved locally in this browser's <code>localStorage</code>.
                <span class="meta" style="display:block; margin-top: 4px;">Cloud synchronization and remote database tables are planned for a subsequent release.</span>
              </div>
            </div>
          </div>

          <div class="row sp" style="margin-top: 24px;">
            <a href="#" class="btn primary">Go to Planner</a>
            <button class="ghost" data-act="signout">Sign out</button>
          </div>
        </div>
      </div>
    `;
  }

  // Not signed in: Render mobile-friendly Sign In / Sign Up Card
  return `
    <div style="max-width: 480px; margin: 16px auto;">
      <nav class="meta" style="margin-bottom: 16px;">
        <a href="#" class="l">← Return to Dashboard</a>
      </nav>

      <div style="border: 1px solid var(--border); border-radius: 10px; background: var(--canvas); padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 40px; line-height: 48px;">📚</div>
          <h1 style="font-size: 24px; line-height: 32px; margin: 8px 0 4px;">Student Planner Account</h1>
          <p class="meta" style="margin: 0;">Sign in to establish your student identity</p>
        </div>

        <!-- Local Storage Preservation Notice -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
          <div style="display:flex; gap: 8px; align-items:flex-start;">
            <span style="font-size: 16px;">ℹ️</span>
            <div style="font-size: 13px; line-height: 18px; color: var(--text);">
              <strong>Notice:</strong> Signing in creates your account. Your planner data (subjects, assignments, notes) continues to be stored locally in this browser.
            </div>
          </div>
        </div>

        <!-- Configuration warning if Supabase keys not set -->
        ${!isConfigured ? `
          <div class="banner" style="background: var(--soonbg); color: var(--soon); border: 1px solid var(--soon); margin-bottom: 16px; font-size: 13px;">
            <strong>⚙️ Supabase Project Setup Needed</strong>
            <p style="margin: 4px 0 8px;">
              Enter your Supabase Project URL and Public Anon Key below to enable live sign-in and sign-up.
            </p>
            <button class="ghost" data-act="toggleconfig" style="min-height: 32px; padding: 0 8px; font-size: 12px; border: 1px solid var(--soon);">
              ${authUiState.showConfig ? 'Hide Settings' : 'Configure Supabase Keys'}
            </button>
          </div>
        ` : ''}

        <!-- Optional Configuration Form (Expandable) -->
        ${authUiState.showConfig || !isConfigured ? `
          <form data-form="authconfig" style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--muted); margin-bottom: 8px;">
              Supabase Project Settings
            </div>
            <label for="cfg-url" style="font-size: 12px; margin: 4px 0;">Project URL</label>
            <input id="cfg-url" name="supabase_url" value="${esc(config.url)}" placeholder="https://xyzcompany.supabase.co" style="min-height: 36px; font-size: 13px; margin-bottom: 8px;">
            
            <label for="cfg-key" style="font-size: 12px; margin: 4px 0;">Public Anon Key</label>
            <input id="cfg-key" name="supabase_anon_key" type="password" value="${esc(config.anonKey)}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." style="min-height: 36px; font-size: 13px; margin-bottom: 8px;">
            
            <div class="meta" style="font-size: 11px; margin-bottom: 8px;">
              Redirect URL: <code>${esc(redirectUrl)}</code>
            </div>
            
            <button class="btn" style="min-height: 32px; font-size: 12px;">Save Project Settings</button>
          </form>
        ` : ''}

        <!-- Mode Tabs: Sign In vs Sign Up -->
        <div class="tabs row" style="margin-bottom: 16px; width: 100%; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
          <button data-auth-tab="signin" aria-pressed="${authUiState.mode === 'signin'}" style="flex: 1; justify-content: center;">
            Sign In
          </button>
          <button data-auth-tab="signup" aria-pressed="${authUiState.mode === 'signup'}" style="flex: 1; justify-content: center;">
            Create Account
          </button>
        </div>

        <!-- Alert messages -->
        ${authUiState.error ? `
          <div class="banner" role="alert" style="margin-bottom: 16px;">
            <strong>Error:</strong> ${esc(authUiState.error)}
          </div>
        ` : ''}

        ${authUiState.successMessage ? `
          <div class="banner" role="status" style="background: var(--okbg); color: var(--ok); border: 1px solid var(--ok); margin-bottom: 16px;">
            ${esc(authUiState.successMessage)}
          </div>
        ` : ''}

        <!-- Auth Form -->
        <form data-form="auth" novalidate>
          <label for="auth-email">School or Personal Email</label>
          <input 
            id="auth-email" 
            name="email" 
            type="email" 
            value="${esc(authUiState.email)}" 
            placeholder="student@example.com" 
            required
            autocomplete="email"
            ${authUiState.loading ? 'disabled' : ''}
          >

          <label for="auth-password" style="margin-top: 12px;">
            Password 
            <small style="color: var(--muted); font-weight: normal;">(minimum 6 characters)</small>
          </label>
          <input 
            id="auth-password" 
            name="password" 
            type="password" 
            value="${esc(authUiState.password)}" 
            placeholder="••••••••" 
            required
            minlength="6"
            autocomplete="${authUiState.mode === 'signup' ? 'new-password' : 'current-password'}"
            ${authUiState.loading ? 'disabled' : ''}
          >

          <div style="margin-top: 24px;">
            <button 
              class="primary" 
              style="width: 100%; justify-content: center; min-height: 44px;" 
              ${authUiState.loading ? 'disabled' : ''}
            >
              ${authUiState.loading ? (
                authUiState.mode === 'signup' ? 'Creating account...' : 'Signing in...'
              ) : (
                authUiState.mode === 'signup' ? 'Sign Up' : 'Sign In'
              )}
            </button>
          </div>
        </form>

        <div style="text-align: center; margin-top: 16px; font-size: 13px;">
          ${authUiState.mode === 'signin' ? `
            <span class="meta">Don't have an account yet?</span>
            <button class="ghost" data-auth-tab="signup" style="min-height: 32px; padding: 0 4px; color: var(--accent); font-weight: 500;">
              Create one now
            </button>
          ` : `
            <span class="meta">Already have an account?</span>
            <button class="ghost" data-auth-tab="signin" style="min-height: 32px; padding: 0 4px; color: var(--accent); font-weight: 500;">
              Sign In
            </button>
          `}
        </div>

        ${isConfigured ? `
          <div style="text-align: right; margin-top: 12px;">
            <button class="ghost" data-act="toggleconfig" style="font-size: 11px; padding: 0; min-height: 24px; color: var(--muted);">
              ⚙️ Supabase Settings
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
