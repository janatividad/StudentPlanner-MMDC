/**
 * Client Configuration & Auth Redirect URL Resolver
 * 
 * SECURITY: Only the Supabase Project URL and Public Anon Key belong here.
 * Never place service_role or privileged secret keys in browser client code.
 */

// Default configuration can be overridden by localStorage or window variables
export const DEFAULT_SUPABASE_CONFIG = {
  // Configured via localStorage or default project values
  PROJECT_URL: (typeof window !== 'undefined' && window.__SUPABASE_URL__) || '',
  ANON_KEY: (typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY__) || ''
};

export function getAuthConfig() {
  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('mmdc_supabase_url') : '';
  const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('mmdc_supabase_anon_key') : '';

  return {
    url: (storedUrl || DEFAULT_SUPABASE_CONFIG.PROJECT_URL || '').trim(),
    anonKey: (storedKey || DEFAULT_SUPABASE_CONFIG.ANON_KEY || '').trim()
  };
}

export function setAuthConfig(url, anonKey) {
  if (typeof localStorage !== 'undefined') {
    if (url != null) localStorage.setItem('mmdc_supabase_url', url.trim());
    if (anonKey != null) localStorage.setItem('mmdc_supabase_anon_key', anonKey.trim());
  }
}

/**
 * Resolves the canonical redirect URL for Supabase Auth email confirmations.
 * Correctly accounts for GitHub Pages project subpaths and local development hosts.
 */
export function getAuthRedirectUrl() {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname;

  // GitHub Pages deployment subpath check (e.g. /StudentPlanner-MMDC/ or /StudentPlanner-MMDC/frontend/)
  if (pathname.includes('/StudentPlanner-MMDC')) {
    return `${origin}/StudentPlanner-MMDC/frontend/`;
  }

  // Local development or root deployment
  return `${origin}/frontend/`;
}
