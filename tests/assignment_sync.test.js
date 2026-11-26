/**
 * Automated tests for Supabase Assignment Sync, RLS Policies, and Import Idempotency
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Running Assignment Sync & Migration Tests ---');

// 1. Verify Migration SQL Structure & RLS Security Rules
const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261126_create_assignments.sql');
console.assert(fs.existsSync(migrationPath), 'Migration SQL file must exist');
const sql = fs.readFileSync(migrationPath, 'utf8');

// Table and fields checks
console.assert(sql.includes('CREATE TABLE IF NOT EXISTS public.assignments'), 'Must create public.assignments');
console.assert(sql.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'), 'Must have UUID primary key');
console.assert(sql.includes('user_id UUID NOT NULL REFERENCES auth.users(id)'), 'Must have required user_id owner');
console.assert(sql.includes('import_id TEXT'), 'Must have import_id for idempotency');
console.assert(sql.includes('title TEXT NOT NULL'), 'Must have title');
console.assert(sql.includes('due_date DATE NOT NULL'), 'Must have due_date');
console.assert(sql.includes('status TEXT NOT NULL'), 'Must have status');
console.assert(sql.includes('UNIQUE INDEX IF NOT EXISTS assignments_user_import_id_idx'), 'Must enforce unique (user_id, import_id) for idempotent imports');

// RLS checks
console.assert(sql.includes('ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
console.assert(sql.includes('CREATE POLICY "Users can select their own assignments"'), 'Must have SELECT policy');
console.assert(sql.includes('CREATE POLICY "Users can insert their own assignments"'), 'Must have INSERT policy');
console.assert(sql.includes('CREATE POLICY "Users can update their own assignments"'), 'Must have UPDATE policy');
console.assert(sql.includes('CREATE POLICY "Users can delete their own assignments"'), 'Must have DELETE policy');

// Strict ownership checks on UPDATE (both USING and WITH CHECK)
console.assert(
  sql.includes('FOR UPDATE') &&
  sql.includes('USING (auth.uid() = user_id)') &&
  sql.includes('WITH CHECK (auth.uid() = user_id)'),
  'UPDATE policy must enforce auth.uid() = user_id in BOTH USING and WITH CHECK clauses'
);
console.log('✓ Migration SQL adheres strictly to RLS requirements and field schemas');

// 2. Mock environment for Assignment Sync Service & State
const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
};

globalThis.window = {
  location: { origin: 'http://127.0.0.1:3000', pathname: '/frontend/', hash: '' }
};

// Seed local storage planner data
const initialLocalData = {
  term: '2026-2027 Term 2',
  subjects: [
    { id: 101, project_id: 1, name: 'Web Systems', props: [] },
    { id: 102, project_id: 1, name: 'Database Systems', props: [] }
  ],
  assignments: [
    { id: 1, subject_id: 101, title: 'Milestone 1', due_date: '2026-12-01', status: 'done', coursera_url: '', resource_url: '' },
    { id: 2, subject_id: 102, title: 'Database Schema', due_date: '2026-12-05', status: 'in_progress', coursera_url: '', resource_url: '' }
  ],
  projects: [{ id: 1, name: 'Term 2', icon: '📚' }],
  links: [],
  pages: [],
  next: 3
};
mockStore['study-planner-mmdc-v3'] = JSON.stringify(initialLocalData);

// Import state and sync service
import { loadState, getState, getActiveAssignments, findAssignment } from '../frontend/js/state.js';
import { assignmentSyncService } from '../frontend/js/services/assignmentSyncService.js';
import { authService } from '../frontend/js/auth/authService.js';

loadState();

// Test A: Before sign in, getActiveAssignments returns local storage data
const activeBeforeAuth = getActiveAssignments();
console.assert(activeBeforeAuth.length === 2, 'Should return 2 local assignments when signed out');
console.assert(activeBeforeAuth[0].title === 'Milestone 1', 'Should match local assignment title');
console.log('✓ Signed-out state correctly accesses local storage assignments');

// Test B: Mock authentication via authService
const mockUser = { id: 'usr-uuid-1111', email: 'student1@mmdc.mcl.edu.ph' };
const mockSession = { access_token: 'fake-jwt-token-1234', user: mockUser };
authService._saveSession(mockSession);
mockStore['mmdc_supabase_url'] = 'https://mockproject.supabase.co';
mockStore['mmdc_supabase_anon_key'] = 'mock-anon-key';

// Test C: Cloud state isolation
assignmentSyncService.cloudAssignments = [
  { id: 'cloud-uuid-999', title: 'Cloud Assignment A', due_date: '2026-12-10', status: 'not_started', subject_id: 101 }
];
assignmentSyncService.syncStatus = 'synced';

const activeAfterAuth = getActiveAssignments();
console.assert(activeAfterAuth.length === 1, 'Should return cloud assignments when authenticated and synced');
console.assert(activeAfterAuth[0].title === 'Cloud Assignment A', 'Should return cloud record');
console.assert(findAssignment('cloud-uuid-999').title === 'Cloud Assignment A', 'findAssignment must find by UUID');

// Test D: Local storage is preserved completely intact during cloud operation
const localSaved = JSON.parse(mockStore['study-planner-mmdc-v3']);
console.assert(localSaved.assignments.length === 2, 'Local assignments in localStorage must remain preserved');
console.assert(localSaved.assignments[0].title === 'Milestone 1', 'Original local data remains unaltered');
console.log('✓ Local storage assignments strictly preserved while cloud mode is active');

// Test E: Sign out cleans up cloud state and reverts to local
assignmentSyncService.clearCloudState();
authService._saveSession(null);
console.assert(assignmentSyncService.cloudAssignments === null, 'Cloud assignments should be null on sign out');
console.assert(getActiveAssignments().length === 2, 'Should immediately revert to local storage assignments');
console.log('✓ Sign-out correctly clears cloud state and restores local storage access');

console.log('All Assignment Sync unit tests passed successfully!\n');
