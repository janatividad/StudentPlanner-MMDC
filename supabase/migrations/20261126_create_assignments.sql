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
