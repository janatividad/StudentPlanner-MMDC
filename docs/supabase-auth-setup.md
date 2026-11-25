# Supabase Auth Configuration Guide

> **Scope:** Authentication setup for Student Planner MMDC  
> **Target Deployments:** Local Development (`http://127.0.0.1:3000/`) & GitHub Pages (`https://janatividad.github.io/StudentPlanner-MMDC/`)

---

## 1. Overview & Architecture

Student Planner MMDC uses **Supabase Auth** for identity management (sign-up, email verification, sign-in, and sign-out), while keeping planner data (subjects, assignments, notes, and custom properties) safely stored in the browser's `localStorage`.

### Key Security Rules
- **Public Credentials Only**: The browser code only requires:
  1. `Supabase Project URL` (e.g., `https://your-project-id.supabase.co`)
  2. `Publishable Anon Key` (`anon` public key)
- **Zero Privileged Keys**: Never commit or expose `service_role` secret keys or database passwords in the frontend repository or build outputs.
- **Planner Data Isolation**: Planner records in `localStorage` (`study-planner-mmdc-v3`) remain isolated and are untouched during sign-in or sign-out.

---

## 2. Supabase Dashboard Configuration

Follow these steps in your [Supabase Dashboard](https://supabase.com/dashboard):

### Step A: Configure Authentication Redirect URLs
1. Navigate to **Authentication** > **URL Configuration** in the left sidebar.
2. Set the **Site URL**:
   ```
   https://janatividad.github.io/StudentPlanner-MMDC/frontend/
   ```
3. Add the following entries to **Redirect URLs**:
   ```
   https://janatividad.github.io/StudentPlanner-MMDC/frontend/
   https://janatividad.github.io/StudentPlanner-MMDC/
   http://127.0.0.1:3000/frontend/
   http://127.0.0.1:3000/
   http://localhost:3000/frontend/
   http://localhost:3000/
   ```
4. Click **Save**.

### Step B: Email Provider Settings
1. Navigate to **Authentication** > **Providers** > **Email**.
2. Ensure **Enable Email provider** is turned **ON**.
3. Ensure **Confirm email** is enabled (if you want students to confirm their email before logging in).
4. (Optional) Customize the confirmation email template under **Authentication** > **Email Templates** > **Confirm signup**.

---

## 3. Connecting the App to Your Supabase Project

You can connect your project using either of two zero-friction methods:

### Method 1: Via the Planner UI (Fastest)
1. Open the planner in your browser (`http://127.0.0.1:3000/` or `https://janatividad.github.io/StudentPlanner-MMDC/`).
2. Click **🔑 Sign In / Sign Up** in the sidebar.
3. Click **Configure Supabase Keys** (or **⚙️ Supabase Settings**).
4. Enter your `Project URL` and `Public Anon Key`.
5. Click **Save Project Settings**. The credentials are stored locally in your browser.

### Method 2: Via Pre-configured Defaults
In `frontend/js/config.js`, set default values:
```javascript
export const DEFAULT_SUPABASE_CONFIG = {
  PROJECT_URL: 'https://your-project.supabase.co',
  ANON_KEY: 'your-public-anon-key'
};
```

---

## 4. Manual Verification & Acceptance Test

Follow this checklist to verify authentication across laptop and mobile (iPhone):

### Test 1: Sign-Up Flow
1. Go to the planner (`#auth`) and switch to the **Create Account** tab.
2. Enter an email address and a password (minimum 6 characters).
3. Click **Sign Up**.
4. **Expected Result**: A green notice appears: *"✉️ Account created! Please check your email inbox to confirm your address before logging in."*

### Test 2: Email Confirmation
1. Open the confirmation email in your inbox.
2. Click the confirmation link.
3. **Expected Result**: The browser opens the planner. The URL token hash (`#access_token=...`) is automatically processed, cleaned from the address bar, and the account status displays: *"✓ Signed In via Supabase"*.

### Test 3: Cross-Device Sign-In (Laptop + iPhone Safari)
1. On your laptop (Chrome/Safari/Firefox), sign in with the email and password.
2. On your iPhone in Safari (or installed PWA), open `https://janatividad.github.io/StudentPlanner-MMDC/frontend/#auth`.
3. Sign in with the exact same email and password.
4. **Expected Result**: Both browsers show the user as authenticated with their email displayed in the sidebar.

### Test 4: Local Data Preservation Check
1. Before signing in, create a subject (e.g., *"Cloud Computing"*) and an assignment.
2. Sign in to your Supabase account.
3. **Expected Result**: The subject and assignment remain intact on your dashboard.
4. Sign out.
5. **Expected Result**: The subject and assignment still remain intact on your dashboard.
