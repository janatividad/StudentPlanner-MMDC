# Supabase Assignment Sync & Setup Guide

This guide walks you through navigating the Supabase dashboard to run the database migration and configure authentication redirect URLs for **Study Planner MMDC**.

---

## 1. Entering Your Project in Supabase

In the main Supabase dashboard (`https://supabase.com/dashboard/projects`):
1. Click on the project card: **`janatividad's Project`**.
2. This opens your project dashboard (`https://supabase.com/dashboard/project/giyqcgqmhzzjbcnjlvdn`).

Once inside the project, the left sidebar displays all project menus:
- **Table Editor** (spreadsheet table icon)
- **SQL Editor** (`>_` terminal/query icon)
- **Authentication** (person/two users icon)
- **Project Settings** (gear icon at the bottom of the sidebar)

---

## 2. Running the Database Migration (SQL Editor)

To create the `assignments` table, enable Row Level Security (RLS), and configure user policies:

1. In the left sidebar, click **SQL Editor** (`>_` icon).
2. Click **+ New Query** (or the green "New Query" button).
3. Copy and paste the complete SQL script below into the editor:

```sql
-- Migration: Create assignments table with Row Level Security (RLS)
-- Phase 3: Sync assignments for Study Planner MMDC

-- 1. Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  import_id TEXT,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 160),
  subject_id TEXT,
  subject_name TEXT DEFAULT '',
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done')),
  notes TEXT DEFAULT '',
  description TEXT DEFAULT '',
  coursera_url TEXT DEFAULT '',
  resource_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast queries and stable idempotent imports per user
CREATE INDEX IF NOT EXISTS assignments_user_id_due_date_idx ON public.assignments (user_id, due_date ASC);
CREATE UNIQUE INDEX IF NOT EXISTS assignments_user_import_id_idx ON public.assignments (user_id, import_id) WHERE import_id IS NOT NULL;

-- 3. Automatic updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_assignments_updated_at ON public.assignments;
CREATE TRIGGER set_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any to ensure clean idempotent run
DROP POLICY IF EXISTS "Users can select their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Users can insert their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Users can update their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Users can delete their own assignments" ON public.assignments;

-- 6. Define strict RLS policies

-- SELECT: Authenticated users can view only their own assignments
CREATE POLICY "Users can select their own assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Authenticated users can insert only records where user_id matches their auth.uid()
CREATE POLICY "Users can insert their own assignments"
ON public.assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Enforce ownership both BEFORE (USING) and AFTER (WITH CHECK) the update
-- This ensures users cannot update other users' records AND cannot change the user_id to someone else
CREATE POLICY "Users can update their own assignments"
ON public.assignments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Authenticated users can delete only their own assignments
CREATE POLICY "Users can delete their own assignments"
ON public.assignments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

4. Click the green **Run** button (or press `Cmd + Enter` / `Ctrl + Enter`).
5. You will see **"Success. No rows returned"**. The table and RLS policies are now live!

---

## 3. Finding "Authentication > URL Configuration"

1. In the left sidebar, click the **Authentication** icon (person or users icon).
2. In the secondary sidebar or tabs under Authentication, click **URL Configuration** (or **Configuration** -> **URL Configuration**).
3. Set the following:
   - **Site URL**: `https://janatividad.github.io/StudentPlanner-MMDC/frontend/`
   - **Redirect URLs** (add both of these):
     - `https://janatividad.github.io/StudentPlanner-MMDC/frontend/`
     - `http://127.0.0.1:3000/frontend/`
4. Click **Save**.

---

## 4. Verification Checklist

### A. Two Test Accounts Isolation Check
1. Sign in with Account A (`student1@mmdc.mcl.edu.ph`) on your laptop browser.
2. Create an assignment: "Project Proposal - Web Systems".
3. Verify that the assignment saves to Supabase and shows `☁️ Cloud Sync: Synced`.
4. Sign out, then sign in with Account B (`student2@mmdc.mcl.edu.ph`).
5. Confirm Account B sees an empty list or only Account B's own assignments.
6. Verify via PostgREST / Supabase API that Account B cannot read or edit Account A's record (`403` / empty result enforced by RLS).

### B. Idempotent Import Check
1. While signed in, click **"Import local assignments to [your-email]"**.
2. Notice the report: `X imported, 0 skipped`.
3. Click the import button a second time.
4. Notice the report: `0 imported, X already synced`. Zero duplicates are created.
5. Check your local browser storage: the original local assignments remain completely intact.

### C. Cross-Device Sync (iPhone & Laptop)
1. Open the app on your laptop (`https://janatividad.github.io/StudentPlanner-MMDC/frontend/`) and sign in.
2. Open the app on your iPhone (Safari) and sign in with the same account.
3. On your laptop, create or edit an assignment (e.g. mark status as **Done**).
4. On your iPhone, refresh the page.
5. Verify the assignment appears with the updated status.
