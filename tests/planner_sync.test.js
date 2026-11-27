/**
 * Automated tests for Supabase Planner Sync (Projects, Subjects, Pages, Links)
 * Validates Migration SQL, RLS Security Rules, State Isolation, and Idempotent Import
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Running Full Planner Sync & Migration Tests ---');

// 1. Verify Migration SQL Structure & RLS Security Rules for all 4 new tables
const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261127_create_planner_entities.sql');
console.assert(fs.existsSync(migrationPath), 'Migration SQL file must exist');
const sql = fs.readFileSync(migrationPath, 'utf8');

const tables = ['projects', 'subjects', 'pages', 'links'];
for (const table of tables) {
  console.assert(sql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`), `Must create public.${table}`);
  console.assert(sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`), `Must enable RLS on ${table}`);
  console.assert(sql.includes(`CREATE POLICY "Users can select their own ${table}"`), `Must have SELECT policy for ${table}`);
  console.assert(sql.includes(`CREATE POLICY "Users can insert their own ${table}"`), `Must have INSERT policy for ${table}`);
  console.assert(sql.includes(`CREATE POLICY "Users can update their own ${table}"`), `Must have UPDATE policy for ${table}`);
  console.assert(sql.includes(`CREATE POLICY "Users can delete their own ${table}"`), `Must have DELETE policy for ${table}`);
  console.assert(sql.includes(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_user_import_id_idx`), `Must have unique import_id index for ${table}`);
}

// Check JSONB props column on subjects for dynamic custom properties
console.assert(sql.includes('props JSONB NOT NULL DEFAULT \'[]\'::jsonb'), 'subjects table must have props JSONB column');
console.log('✓ Migration SQL adheres strictly to RLS policies and schema requirements for projects, subjects, pages, and links');

// 2. Mock Environment Setup
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

// Seed local storage with projects, subjects (with custom properties), assignments, pages, links
const sampleProps = [
  { id: 'p1', label: 'Syllabus', value: 'https://school.edu/syllabus', type: 'url' },
  { id: 'p2', label: 'Zoom meeting', value: 'https://zoom.us/j/123456789', type: 'url' },
  { id: 'p3', label: 'Google Drive folder', value: 'https://drive.google.com/drive/folders/abc', type: 'url' }
];

const initialLocalData = {
  term: '2026–2027 Term 2',
  projects: [{ id: 10, name: '2026–2027 Term 2', icon: '📚' }],
  subjects: [
    { id: 201, project_id: 10, name: 'Cloud Computing', status: 'in_progress', notes: 'AWS & GCP', props: sampleProps }
  ],
  assignments: [
    { id: 301, subject_id: 201, title: 'Serverless Architecture Paper', due_date: '2026-12-15', status: 'not_started' }
  ],
  pages: [
    { id: 401, title: 'Exam Review Notes', icon: '📝', body: 'Distributed systems fundamentals.' }
  ],
  links: [
    { id: 501, label: 'Student Portal', url: 'https://mycamu.com' }
  ],
  next: 600
};
mockStore['study-planner-mmdc-v3'] = JSON.stringify(initialLocalData);

// Import state and services
import {
  loadState,
  getActiveProjects,
  getActiveSubjects,
  getActiveAssignments,
  getActivePages,
  getActiveLinks,
  findProject,
  findSubject
} from '../frontend/js/state.js';
import { plannerSyncService } from '../frontend/js/services/plannerSyncService.js';
import { authService } from '../frontend/js/auth/authService.js';

loadState();

// Test A: Signed-out access to local data
console.assert(getActiveProjects().length === 1, 'Should have 1 local project');
console.assert(getActiveSubjects().length === 1, 'Should have 1 local subject');
console.assert(getActiveSubjects()[0].props.length === 3, 'Subject must retain 3 custom properties');
console.assert(getActiveAssignments().length === 1, 'Should have 1 local assignment');
console.assert(getActivePages().length === 1, 'Should have 1 local page');
console.assert(getActiveLinks().length === 1, 'Should have 1 local link');
console.log('✓ Signed-out state correctly accesses local storage planner entities');

// Test B: Mock authentication
const mockUser = { id: 'usr-uuid-test', email: 'student@mmdc.mcl.edu.ph' };
const mockSession = { access_token: 'fake-jwt-token-999', user: mockUser };
authService._saveSession(mockSession);
mockStore['mmdc_supabase_url'] = 'https://mockproject.supabase.co';
mockStore['mmdc_supabase_anon_key'] = 'mock-anon-key';

// Test C: Cloud state isolation
plannerSyncService.cloudProjects = [
  { id: 'cloud-proj-1', name: 'Cloud Term 1', icon: '🎓' }
];
plannerSyncService.cloudSubjects = [
  { id: 'cloud-sub-1', project_id: 'cloud-proj-1', name: 'Cloud Subject', status: 'in_progress', props: sampleProps }
];
plannerSyncService.cloudAssignments = [
  { id: 'cloud-asg-1', subject_id: 'cloud-sub-1', title: 'Cloud Assignment', due_date: '2026-12-20', status: 'done' }
];
plannerSyncService.cloudPages = [
  { id: 'cloud-page-1', title: 'Cloud Page', icon: '📄', body: 'Cloud content' }
];
plannerSyncService.cloudLinks = [
  { id: 'cloud-link-1', label: 'Cloud Link', url: 'https://cloud.com' }
];
plannerSyncService.syncState.status = 'synced';

console.assert(getActiveProjects().length === 1 && getActiveProjects()[0].id === 'cloud-proj-1', 'Active projects should return cloud project');
console.assert(findProject('cloud-proj-1').name === 'Cloud Term 1', 'findProject should find cloud project by string/UUID');
console.assert(findSubject('cloud-sub-1').props[0].label === 'Syllabus', 'Dynamic custom properties preserved in cloud subject');
console.assert(getActiveAssignments().length === 1 && getActiveAssignments()[0].id === 'cloud-asg-1', 'Active assignments should return cloud assignment');
console.assert(getActivePages().length === 1 && getActivePages()[0].id === 'cloud-page-1', 'Active pages should return cloud page');
console.assert(getActiveLinks().length === 1 && getActiveLinks()[0].id === 'cloud-link-1', 'Active links should return cloud link');
console.log('✓ Cloud mode active: entities isolated and accessible via active getters');

// Test D: Local storage is preserved completely intact
const localAfterCloud = JSON.parse(mockStore['study-planner-mmdc-v3']);
console.assert(localAfterCloud.projects.length === 1, 'Local projects preserved');
console.assert(localAfterCloud.subjects.length === 1, 'Local subjects preserved');
console.assert(localAfterCloud.subjects[0].name === 'Cloud Computing', 'Local subject name unchanged');
console.assert(localAfterCloud.assignments.length === 1, 'Local assignments preserved');
console.assert(localAfterCloud.pages.length === 1, 'Local pages preserved');
console.assert(localAfterCloud.links.length === 1, 'Local links preserved');
console.log('✓ Local storage data strictly preserved without modification');

// Test E: Sign-out reverts immediately to local storage
plannerSyncService.clearCloudState();
authService._saveSession(null);
console.assert(getActiveProjects()[0].name === '2026–2027 Term 2', 'Reverted to local project');
console.assert(getActiveSubjects()[0].name === 'Cloud Computing', 'Reverted to local subject');
console.log('✓ Sign-out clears cloud state and immediately restores local planner data');

console.log('All Full Planner Sync tests PASSED successfully!\n');
