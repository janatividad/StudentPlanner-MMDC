# Supabase Migration & Cloud Sync for Projects, Subjects, Pages, and Links

This guide details the SQL migration and cloud synchronization architecture for the remaining planner entities in **Study Planner MMDC**:
- **Projects** (semesters / terms)
- **Subjects** (courses, including dynamic custom properties: Syllabus link, Zoom link, Google Drive folder)
- **Pages** (study notes and documentation)
- **Links** (dashboard quick links)

---

## 1. Running the Database Migration in Supabase

1. Open your Supabase Dashboard and go to **`janatividad's Project`**.
2. In the left navigation menu, click **SQL Editor** (`>_` icon).
3. Click **+ New Query**.
4. Paste the SQL script below and click **Run** (or press `Cmd + Enter` / `Ctrl + Enter`):

```sql
-- Migration: Create projects, subjects, pages, and links tables with Row Level Security (RLS)
-- Phase 4: Full Cloud Sync for Study Planner MMDC

-- 1. Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: projects (semesters / terms)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  import_id TEXT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 120),
  icon TEXT NOT NULL DEFAULT '📚',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_user_id_created_at_idx ON public.projects (user_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS projects_user_import_id_idx ON public.projects (user_id, import_id) WHERE import_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

CREATE POLICY "Users can select their own projects"
ON public.projects FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: subjects (courses, including dynamic custom properties JSONB)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  project_id TEXT NOT NULL,
  import_id TEXT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 120),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done')),
  notes TEXT DEFAULT '',
  props JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subjects_user_id_project_id_idx ON public.subjects (user_id, project_id);
CREATE UNIQUE INDEX IF NOT EXISTS subjects_user_import_id_idx ON public.subjects (user_id, import_id) WHERE import_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_subjects_updated_at ON public.subjects;
CREATE TRIGGER set_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON public.subjects;

CREATE POLICY "Users can select their own subjects"
ON public.subjects FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects"
ON public.subjects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects"
ON public.subjects FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects"
ON public.subjects FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: pages (notes and documentation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  import_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '📄',
  body TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pages_user_id_created_at_idx ON public.pages (user_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS pages_user_import_id_idx ON public.pages (user_id, import_id) WHERE import_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_pages_updated_at ON public.pages;
CREATE TRIGGER set_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own pages" ON public.pages;
DROP POLICY IF EXISTS "Users can insert their own pages" ON public.pages;
DROP POLICY IF EXISTS "Users can update their own pages" ON public.pages;
DROP POLICY IF EXISTS "Users can delete their own pages" ON public.pages;

CREATE POLICY "Users can select their own pages"
ON public.pages FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pages"
ON public.pages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pages"
ON public.pages FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pages"
ON public.pages FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: links (dashboard quick links)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  import_id TEXT,
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS links_user_id_created_at_idx ON public.links (user_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS links_user_import_id_idx ON public.links (user_id, import_id) WHERE import_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_links_updated_at ON public.links;
CREATE TRIGGER set_links_updated_at
BEFORE UPDATE ON public.links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own links" ON public.links;
DROP POLICY IF EXISTS "Users can insert their own links" ON public.links;
DROP POLICY IF EXISTS "Users can update their own links" ON public.links;
DROP POLICY IF EXISTS "Users can delete their own links" ON public.links;

CREATE POLICY "Users can select their own links"
ON public.links FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links"
ON public.links FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links"
ON public.links FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
ON public.links FOR DELETE TO authenticated
USING (auth.uid() = user_id);
```

---

## 2. Dynamic Custom Properties (`props` JSONB)

In the MMDC Student Planner, each subject includes dynamic properties such as:
- **Syllabus link** (`url`)
- **Zoom meeting link** (`url`)
- **Google Drive folder** (`url`)
- Custom selects, dates, checkboxes, notes, and custom text fields.

The `subjects.props` JSONB column stores these properties as structured arrays:
```json
[
  { "id": "p1", "label": "Syllabus", "value": "https://school.edu/syllabus", "type": "url" },
  { "id": "p2", "label": "Zoom meeting", "value": "https://zoom.us/j/123", "type": "url" },
  { "id": "p3", "label": "Google Drive folder", "value": "https://drive.google.com/...", "type": "url" }
]
```
This guarantees complete flexibility: students can add, remove, change types, and drag-and-drop reorder properties, and the full state syncs seamlessly to Supabase.

---

## 3. Idempotent Data Import

When students tap **"Import local planner data to [email]"**:
1. `projects` are imported first.
2. `subjects` are mapped to the cloud project IDs.
3. `assignments` are mapped to the cloud subject IDs.
4. `pages` and `links` are imported.
5. All records use stable `import_id` values (`local_<id>`), ensuring that re-running imports produces **zero duplicates**.
6. The user's original browser `localStorage` copy is strictly preserved.
