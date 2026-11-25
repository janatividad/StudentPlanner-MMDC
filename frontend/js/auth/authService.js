/**
 * Supabase Authentication Service
 * 
 * Handles sign-up, email confirmation, sign-in, sign-out, session persistence,
 * and auth state change notifications.
 * Implements standard Supabase Auth REST protocols with full offline safety.
 */

import { getAuthConfig, getAuthRedirectUrl } from '../config.js';

const SESSION_KEY = 'mmdc_auth_session';

class AuthService {
  constructor() {
    this.listeners = new Set();
    this.session = this._loadSavedSession();
  }

  _loadSavedSession() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Validate session structure
      if (parsed && parsed.access_token && parsed.user) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  _saveSession(session) {
    this.session = session;
    if (typeof localStorage !== 'undefined') {
      if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    this._notifyListeners();
  }

  _notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.session);
      } catch (err) {
        console.error('[AuthService] Error in auth listener:', err);
      }
    }
  }

  onAuthStateChange(callback) {
    this.listeners.add(callback);
    // Immediately invoke with current state
    try {
      callback(this.session);
    } catch (err) {
      console.error('[AuthService] Error in initial auth listener:', err);
    }
    return () => this.listeners.delete(callback);
  }

  getSession() {
    return this.session;
  }

  getUser() {
    return this.session ? this.session.user : null;
  }

  isAuthenticated() {
    return Boolean(this.session && this.session.user);
  }

  /**
   * Parses URL hash for Supabase redirect tokens (#access_token=...&refresh_token=...)
   * Automatically extracts session, cleans up the URL hash, and updates auth state.
   */
  handleAuthCallback() {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash.slice(1);
    if (!hash || !hash.includes('access_token=')) {
      return false;
    }

    try {
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const tokenType = params.get('token_type') || 'bearer';
      const expiresIn = params.get('expires_in');
      const type = params.get('type');

      if (accessToken) {
        // Construct session payload
        const user = this._decodeJwtUser(accessToken);
        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: tokenType,
          expires_at: expiresIn ? Date.now() + Number(expiresIn) * 1000 : null,
          user: user || { email: 'User', id: 'confirmed-user' },
          type: type || 'signup'
        };

        this._saveSession(session);

        // Fetch official user object in background if config is available
        this.fetchCurrentUser().catch(() => {});

        // Clean up hash to prevent leaking tokens or breaking router
        window.history.replaceState(null, '', window.location.pathname);
        window.location.hash = '#auth';
        return true;
      }
    } catch (err) {
      console.warn('[AuthService] Failed to parse auth callback hash:', err);
    }
    return false;
  }

  _decodeJwtUser(jwt) {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return {
        id: payload.sub,
        email: payload.email,
        created_at: payload.created_at,
        app_metadata: payload.app_metadata,
        user_metadata: payload.user_metadata
      };
    } catch {
      return null;
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email, password) {
    const { url, anonKey } = getAuthConfig();
    if (!url || !anonKey) {
      throw new Error('Supabase project is not configured. Please enter your Supabase Project URL and Public Anon Key.');
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) throw new Error('Please enter a valid email address.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');

    const redirectUrl = getAuthRedirectUrl();
    const endpoint = `${url.replace(/\/+$/, '')}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectUrl)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: password
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data.error_description || data.msg || data.message || `Sign up failed (${response.status})`;
      throw new Error(msg);
    }

    // Check if user is immediately confirmed or requires email confirmation
    if (data.session) {
      this._saveSession(data.session);
      return { user: data.user, session: data.session, requiresConfirmation: false };
    }

    return {
      user: data.user || data,
      session: null,
      requiresConfirmation: true
    };
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    const { url, anonKey } = getAuthConfig();
    if (!url || !anonKey) {
      throw new Error('Supabase project is not configured. Please enter your Supabase Project URL and Public Anon Key.');
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) throw new Error('Please enter your email.');
    if (!password) throw new Error('Please enter your password.');

    const endpoint = `${url.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: password
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let msg = data.error_description || data.msg || data.message || `Sign in failed (${response.status})`;
      if (msg.includes('Email not confirmed')) {
        msg = 'Your email has not been confirmed yet. Please check your inbox for the confirmation email from Supabase.';
      } else if (msg.includes('Invalid login credentials')) {
        msg = 'Invalid email or password. Please verify your credentials and try again.';
      }
      throw new Error(msg);
    }

    this._saveSession(data);
    return data;
  }

  /**
   * Sign out current user
   */
  async signOut() {
    const { url, anonKey } = getAuthConfig();
    const token = this.session?.access_token;

    // Immediately clear local session
    this._saveSession(null);

    // Attempt to notify Supabase in background
    if (url && anonKey && token) {
      try {
        const endpoint = `${url.replace(/\/+$/, '')}/auth/v1/logout`;
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${token}`
          }
        });
      } catch {
        // Safe to ignore network failure during local logout
      }
    }
  }

  /**
   * Fetch current user details from Supabase using access token
   */
  async fetchCurrentUser() {
    const { url, anonKey } = getAuthConfig();
    const token = this.session?.access_token;
    if (!url || !anonKey || !token) return null;

    try {
      const endpoint = `${url.replace(/\/+$/, '')}/auth/v1/user`;
      const response = await fetch(endpoint, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const user = await response.json();
        if (this.session) {
          this.session.user = user;
          this._saveSession(this.session);
        }
        return user;
      }
    } catch {
      // Offline fallback
    }
    return this.getUser();
  }
}

export const authService = new AuthService();
