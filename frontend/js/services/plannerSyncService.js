/**
 * Supabase Full Planner Synchronization Service
 * 
 * Synchronizes all planner entities with Supabase:
 * - Projects (semesters / terms)
 * - Subjects (courses + dynamic custom properties JSONB)
 * - Assignments
 * - Pages (notes and documentation)
 * - Links (quick links)
 * 
 * Strict Row Level Security (RLS) enforcement, stable import IDs (local_<id>),
 * and zero data loss on localStorage.
 */

import { getAuthConfig } from '../config.js';
import { authService } from '../auth/authService.js';
import { okUrl, blank, DEF } from '../utils/helpers.js';
import { getState, saveState } from '../state.js';

class PlannerSyncService {
  constructor() {
    this.cloudProjects = null;
    this.cloudSubjects = null;
    this.cloudAssignments = null;
    this.cloudPages = null;
    this.cloudLinks = null;

    this.syncState = {
      status: 'idle', // 'idle' | 'loading' | 'synced' | 'error'
      error: null,
      lastSynced: null,
      importResult: null
    };

    this.listeners = new Set();

    authService.onAuthStateChange((session) => {
      if (!session || !session.user) {
        this.clearCloudState();
      } else {
        this.fetchCloudPlanner().catch(() => {});
      }
    });
  }

  get syncStatus() {
    return this.syncState.status;
  }

  get lastError() {
    return this.syncState.error;
  }

  isCloudActive() {
    return authService.isAuthenticated() && (
      Array.isArray(this.cloudAssignments) ||
      Array.isArray(this.cloudProjects) ||
      Array.isArray(this.cloudSubjects)
    );
  }

  getCloudProjects() { return this.cloudProjects || []; }
  getCloudSubjects() { return this.cloudSubjects || []; }
  getCloudAssignments() { return this.cloudAssignments || []; }
  getCloudPages() { return this.cloudPages || []; }
  getCloudLinks() { return this.cloudLinks || []; }

  clearCloudState() {
    this.cloudProjects = null;
    this.cloudSubjects = null;
    this.cloudAssignments = null;
    this.cloudPages = null;
    this.cloudLinks = null;
    this.syncState = {
      status: 'idle',
      error: null,
      lastSynced: null,
      importResult: null
    };
    this._notifyListeners();
  }

  onSyncChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        console.error('[PlannerSyncService] Listener error:', err);
      }
    }
  }

  async _getHeaders(customHeaders = {}) {
    const { anonKey } = getAuthConfig();
    const token = await authService.getValidToken();

    if (!anonKey || !token) {
      throw new Error('Authentication required to sync with cloud. Please sign in again.');
    }

    return {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${token}`,
      ...customHeaders
    };
  }

  async _fetchWithAuth(endpoint, options = {}) {
    let headers = await this._getHeaders(options.headers || {});
    let res = await fetch(endpoint, { ...options, headers });

    // Automatically recover if token expired
    if (res.status === 401) {
      try {
        const refreshedToken = await authService.refreshToken();
        if (refreshedToken) {
          headers = await this._getHeaders(options.headers || {});
          res = await fetch(endpoint, { ...options, headers });
        }
      } catch {
        throw new Error('Session expired. Please sign in again.');
      }
    }

    return res;
  }

  _getBaseEndpoint(entity) {
    const { url } = getAuthConfig();
    if (!url) throw new Error('Supabase project URL is not configured.');
    return `${url.replace(/\/+$/, '')}/rest/v1/${entity}`;
  }

  /**
   * Fetch all cloud entities in parallel
   */
  async fetchCloudPlanner() {
    if (!authService.isAuthenticated()) {
      this.clearCloudState();
      return null;
    }

    this.syncState.status = 'loading';
    this.syncState.error = null;
    this._notifyListeners();

    try {
      const endpoints = {
        projects: `${this._getBaseEndpoint('projects')}?select=*&order=created_at.asc`,
        subjects: `${this._getBaseEndpoint('subjects')}?select=*&order=created_at.asc`,
        assignments: `${this._getBaseEndpoint('assignments')}?select=*&order=due_date.asc,created_at.asc`,
        pages: `${this._getBaseEndpoint('pages')}?select=*&order=created_at.asc`,
        links: `${this._getBaseEndpoint('links')}?select=*&order=created_at.asc`
      };

      const [resProj, resSub, resAsg, resPage, resLink] = await Promise.all([
        this._fetchWithAuth(endpoints.projects),
        this._fetchWithAuth(endpoints.subjects),
        this._fetchWithAuth(endpoints.assignments),
        this._fetchWithAuth(endpoints.pages),
        this._fetchWithAuth(endpoints.links)
      ]);

      const responses = [resProj, resSub, resAsg, resPage, resLink];
      for (const res of responses) {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 404 || errData.code === 'PGRST205') {
            throw new Error(`Database tables not found. Please run the SQL migration in Supabase SQL Editor.`);
          }
          throw new Error(errData.message || `Failed to fetch cloud planner data (${res.status})`);
        }
      }

      this.cloudProjects = await resProj.json();
      this.cloudSubjects = await resSub.json();
      this.cloudAssignments = await resAsg.json();
      this.cloudPages = await resPage.json();
      this.cloudLinks = await resLink.json();

      this.syncState.status = 'synced';
      this.syncState.lastSynced = new Date();
      this.syncState.error = null;
      this._notifyListeners();

      return {
        projects: this.cloudProjects,
        subjects: this.cloudSubjects,
        assignments: this.cloudAssignments,
        pages: this.cloudPages,
        links: this.cloudLinks
      };
    } catch (err) {
      this.syncState.status = 'error';
      this.syncState.error = err.message || 'Error connecting to cloud.';
      this._notifyListeners();
      throw err;
    }
  }

  // ==========================================================================
  // PROJECTS CRUD
  // ==========================================================================
  async createCloudProject(projectData) {
    const session = authService.getSession();
    if (!session?.user?.id) throw new Error('Signed-in account required.');

    const payload = {
      user_id: session.user.id,
      name: (projectData.name || 'Untitled').trim().slice(0, 120),
      icon: projectData.icon || '📚',
      import_id: projectData.import_id || null
    };

    const res = await this._fetchWithAuth(this._getBaseEndpoint('projects'), {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create project in cloud.');
    }

    const [saved] = await res.json();
    if (this.cloudProjects) {
      this.cloudProjects.push(saved);
      this._notifyListeners();
    }
    return saved;
  }

  async updateCloudProject(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = String(updates.name).trim().slice(0, 120);
    if (updates.icon !== undefined) payload.icon = updates.icon;

    const res = await this._fetchWithAuth(`${this._getBaseEndpoint('projects')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update project in cloud.');
    }

    const [updated] = await res.json();
    if (this.cloudProjects) {
      const idx = this.cloudProjects.findIndex(p => String(p.id) === String(id));
      if (idx >= 0) this.cloudProjects[idx] = updated;
      this._notifyListeners();
    }
    return updated;
  }

  async deleteCloudProject(id) {
    const res = await this._fetchWithAuth(`${this._getBaseEndpoint('projects')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete project from cloud.');
    }

    if (this.cloudProjects) {
      this.cloudProjects = this.cloudProjects.filter(p => String(p.id) !== String(id));
      // Also prune cascade in-memory subjects and assignments
      if (this.cloudSubjects) {
        const subIds = this.cloudSubjects.filter(s => String(s.project_id) === String(id)).map(s => String(s.id));
        this.cloudSubjects = this.cloudSubjects.filter(s => String(s.project_id) !== String(id));
        if (this.cloudAssignments) {
          this.cloudAssignments = this.cloudAssignments.filter(a => !subIds.includes(String(a.subject_id)));
        }
      }
      this._notifyListeners();
    }
    return true;
  }

  // ==========================================================================
  // SUBJECTS CRUD
  // ==========================================================================
  async createCloudSubject(subjectData) {
    const session = authService.getSession();
    if (!session?.user?.id) throw new Error('Signed-in account required.');

    const payload = {
      user_id: session.user.id,
      project_id: String(subjectData.project_id),
      name: (subjectData.name || 'Untitled').trim().slice(0, 120),
      status: subjectData.status || 'not_started',
      notes: subjectData.notes || '',
      props: Array.isArray(subjectData.props) ? subjectData.props : [],
      import_id: subjectData.import_id || null
    };

    const res = await this._fetchWithAuth(this._getBaseEndpoint('subjects'), {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create subject in cloud.');
    }

    const [saved] = await res.json();
    if (this.cloudSubjects) {
      this.cloudSubjects.push(saved);
      this._notifyListeners();
    }
    return saved;
  }

  async updateCloudSubject(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = String(updates.name).trim().slice(0, 120);
    if (updates.project_id !== undefined) payload.project_id = String(updates.project_id);
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.props !== undefined) payload.props = updates.props;

    const res = await this._fetchWithAuth(`${this._getBaseEndpoint('subjects')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update subject in cloud.');
    }

    const [updated] = await res.json();
    if (this.cloudSubjects) {
      const idx = this.cloudSubjects.findIndex(s => String(s.id) === String(id));
      if (idx >= 0) this.cloudSubjects[idx] = updated;
      this._notifyListeners();
    }
    return updated;
  }

  async deleteCloudSubject(id) {
    const res = await this._fetchWithAuth(`${this._getBaseEndpoint('subjects')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete subject from cloud.');
    }

    if (this.cloudSubjects) {
      this.cloudSubjects = this.cloudSubjects.filter(s => String(s.id) !== String(id));
      if (this.cloudAssignments) {
        this.cloudAssignments = this.cloudAssignments.filter(a => String(a.subject_id) !== String(id));
      }
      this._notifyListeners();
    }
    return true;
  }

  // ==========================================================================
  // ASSIGNMENTS CRUD
  // ==========================================================================
  async createCloudAssignment(rec) {
    const session = authService.getSession();
    if (!session?.user?.id) throw new Error('Signed-in account required.');

    const payload = {
      user_id: session.user.id,
      title: rec.title.trim().slice(0, 160),
      subject_id: String(rec.subject_id),
      due_date: rec.due_date,
      status: rec.status || 'not_started',
      notes: rec.notes || '',
      description: rec.description || '',
      coursera_url: rec.coursera_url || '',
      resource_url: rec.resource_url || '',
      import_id: rec.import_id || null
    };

    const res = await this._fetchWithAuth(this._getBaseEndpoint('assignments'), {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to save assignment to cloud.');
    }

    const [saved] = await res.json();
    if (this.cloudAssignments) {
      this.cloudAssignments.push(saved);
      this._notifyListeners();
    }
    return saved;
  }

  async updateCloudAssignment(id, updates) {
    const payload = {};
    if (updates.title !== undefined) payload.title = String(updates.title).trim().slice(0, 160);
    if (updates.subject_id !== undefined) payload.subject_id = String(updates.subject_id);
    if (updates.due_date !== undefined) payload.due_date = updates.due_date;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.coursera_url !== undefined) payload.coursera_url = updates.coursera_url.trim();
    if (updates.resource_url !== undefined) payload.resource_url = updates.resource_url.trim();

    const res = await this._fetchWithAuth(`${this._getBaseEndpoint('assignments')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update assignment in cloud.');
    }

    const [updated] = await res.json();
    if (this.cloudAssignments) {
      const idx = this.cloudAssignments.findIndex(a => String(a.id) === String(id));
      if (idx >= 0) this.cloudAssignments[idx] = updated;
      this._notifyListeners();
    }
    return updated;
  }

  async deleteCloudAssignment(id) {
    const res = await this._fetchWithAuth(`${this._getBaseEndpoint('assignments')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete assignment from cloud.');
    }

    if (this.cloudAssignments) {
      this.cloudAssignments = this.cloudAssignments.filter(a => String(a.id) !== String(id));
      this._notifyListeners();
    }
    return true;
  }

  // ==========================================================================
  // PAGES CRUD
  // ==========================================================================
  async createCloudPage(pageData) {
    const session = authService.getSession();
    if (!session?.user?.id) throw new Error('Signed-in account required.');

    const payload = {
      user_id: session.user.id,
      title: (pageData.title || '').trim(),
      icon: pageData.icon || '📄',
      body: pageData.body || '',
      import_id: pageData.import_id || null
    };

    const res = await this._fetchWithAuth(this._getBaseEndpoint('pages'), {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create page in cloud.');
    }

    const [saved] = await res.json();
    if (this.cloudPages) {
      this.cloudPages.push(saved);
      this._notifyListeners();
    }
    return saved;
  }

  async updateCloudPage(id, updates) {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.icon !== undefined) payload.icon = updates.icon;
    if (updates.body !== undefined) payload.body = updates.body;

    const res = await this._fetchWithAuth(`${this._getBaseEndpoint('pages')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update page in cloud.');
    }

    const [updated] = await res.json();
    if (this.cloudPages) {
      const idx = this.cloudPages.findIndex(p => String(p.id) === String(id));
      if (idx >= 0) this.cloudPages[idx] = updated;
      this._notifyListeners();
    }
    return updated;
  }

  async deleteCloudPage(id) {
    const res = await this._fetchWithAuth(`${this._getBaseEndpoint('pages')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete page from cloud.');
    }

    if (this.cloudPages) {
      this.cloudPages = this.cloudPages.filter(p => String(p.id) !== String(id));
      this._notifyListeners();
    }
    return true;
  }

  // ==========================================================================
  // LINKS CRUD
  // ==========================================================================
  async createCloudLink(linkData) {
    const session = authService.getSession();
    if (!session?.user?.id) throw new Error('Signed-in account required.');

    const payload = {
      user_id: session.user.id,
      label: (linkData.label || '').trim(),
      url: (linkData.url || '').trim(),
      import_id: linkData.import_id || null
    };

    const res = await this._fetchWithAuth(this._getBaseEndpoint('links'), {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create link in cloud.');
    }

    const [saved] = await res.json();
    if (this.cloudLinks) {
      this.cloudLinks.push(saved);
      this._notifyListeners();
    }
    return saved;
  }

  async deleteCloudLink(id) {
    const res = await this._fetchWithAuth(`${this._getBaseEndpoint('links')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete link from cloud.');
    }

    if (this.cloudLinks) {
      this.cloudLinks = this.cloudLinks.filter(l => String(l.id) !== String(id));
      this._notifyListeners();
    }
    return true;
  }

  // ==========================================================================
  // IDEMPOTENT IMPORT OF ALL LOCAL DATA
  // ==========================================================================
  /**
   * Imports all local planner data into Supabase:
   * 1. Projects
   * 2. Subjects (mapped to project UUIDs)
   * 3. Assignments (mapped to subject UUIDs)
   * 4. Pages
   * 5. Links
   * 
   * Retries are 100% idempotent via UNIQUE (user_id, import_id) on all tables.
   */
  async importAllLocalData() {
    const session = authService.getSession();
    if (!session?.user?.id) throw new Error('Sign in to import your planner data.');

    const state = getState();
    const importHeaders = {
      'Prefer': 'return=representation,resolution=ignore-duplicates'
    };

    const report = {
      projects: { imported: 0, skipped: 0, failed: 0 },
      subjects: { imported: 0, skipped: 0, failed: 0 },
      assignments: { imported: 0, skipped: 0, failed: 0 },
      pages: { imported: 0, skipped: 0, failed: 0 },
      links: { imported: 0, skipped: 0, failed: 0 },
      account: session.user.email
    };

    // 1. Existing cloud records
    await this.fetchCloudPlanner();
    const existingProjects = new Map(this.getCloudProjects().map(p => [p.import_id, p]));
    const existingSubjects = new Map(this.getCloudSubjects().map(s => [s.import_id, s]));
    const existingAssignments = new Map(this.getCloudAssignments().map(a => [a.import_id, a]));
    const existingPages = new Map(this.getCloudPages().map(p => [p.import_id, p]));
    const existingLinks = new Map(this.getCloudLinks().map(l => [l.import_id, l]));

    const projectMap = new Map(); // local_id -> cloud_id
    const subjectMap = new Map(); // local_id -> cloud_id

    // Import Projects
    for (const p of state.projects || []) {
      const importId = 'local_' + p.id;
      if (existingProjects.has(importId)) {
        projectMap.set(String(p.id), existingProjects.get(importId).id);
        report.projects.skipped++;
        continue;
      }
      try {
        const payload = {
          user_id: session.user.id,
          import_id: importId,
          name: p.name || 'Untitled Project',
          icon: p.icon || '📚'
        };
        const res = await this._fetchWithAuth(this._getBaseEndpoint('projects'), {
          method: 'POST',
          headers: importHeaders,
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const [saved] = await res.json();
          if (saved) {
            projectMap.set(String(p.id), saved.id);
            report.projects.imported++;
          } else {
            report.projects.skipped++;
          }
        } else {
          report.projects.failed++;
        }
      } catch {
        report.projects.failed++;
      }
    }

    // Import Subjects
    for (const s of state.subjects || []) {
      const importId = 'local_' + s.id;
      if (existingSubjects.has(importId)) {
        subjectMap.set(String(s.id), existingSubjects.get(importId).id);
        report.subjects.skipped++;
        continue;
      }
      try {
        const mappedProjectId = projectMap.get(String(s.project_id)) || String(s.project_id);
        const payload = {
          user_id: session.user.id,
          project_id: mappedProjectId,
          import_id: importId,
          name: s.name || 'Untitled Subject',
          status: s.status || 'not_started',
          notes: s.notes || '',
          props: s.props || []
        };
        const res = await this._fetchWithAuth(this._getBaseEndpoint('subjects'), {
          method: 'POST',
          headers: importHeaders,
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const [saved] = await res.json();
          if (saved) {
            subjectMap.set(String(s.id), saved.id);
            report.subjects.imported++;
          } else {
            report.subjects.skipped++;
          }
        } else {
          report.subjects.failed++;
        }
      } catch {
        report.subjects.failed++;
      }
    }

    // Import Assignments
    for (const a of state.assignments || []) {
      const importId = 'local_' + a.id;
      if (existingAssignments.has(importId)) {
        report.assignments.skipped++;
        continue;
      }
      try {
        const mappedSubjectId = subjectMap.get(String(a.subject_id)) || String(a.subject_id);
        const payload = {
          user_id: session.user.id,
          subject_id: mappedSubjectId,
          import_id: importId,
          title: a.title,
          due_date: a.due_date,
          status: a.status || 'not_started',
          notes: a.notes || '',
          description: a.description || '',
          coursera_url: a.coursera_url || '',
          resource_url: a.resource_url || ''
        };
        const res = await this._fetchWithAuth(this._getBaseEndpoint('assignments'), {
          method: 'POST',
          headers: importHeaders,
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const [saved] = await res.json();
          if (saved) report.assignments.imported++;
          else report.assignments.skipped++;
        } else {
          report.assignments.failed++;
        }
      } catch {
        report.assignments.failed++;
      }
    }

    // Import Pages
    for (const pg of state.pages || []) {
      const importId = 'local_' + pg.id;
      if (existingPages.has(importId)) {
        report.pages.skipped++;
        continue;
      }
      try {
        const payload = {
          user_id: session.user.id,
          import_id: importId,
          title: pg.title || '',
          icon: pg.icon || '📄',
          body: pg.body || ''
        };
        const res = await this._fetchWithAuth(this._getBaseEndpoint('pages'), {
          method: 'POST',
          headers: importHeaders,
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const [saved] = await res.json();
          if (saved) report.pages.imported++;
          else report.pages.skipped++;
        } else {
          report.pages.failed++;
        }
      } catch {
        report.pages.failed++;
      }
    }

    // Import Links
    for (const lk of state.links || []) {
      const importId = 'local_' + lk.id;
      if (existingLinks.has(importId)) {
        report.links.skipped++;
        continue;
      }
      try {
        const payload = {
          user_id: session.user.id,
          import_id: importId,
          label: lk.label || '',
          url: lk.url || ''
        };
        const res = await this._fetchWithAuth(this._getBaseEndpoint('links'), {
          method: 'POST',
          headers: importHeaders,
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const [saved] = await res.json();
          if (saved) report.links.imported++;
          else report.links.skipped++;
        } else {
          report.links.failed++;
        }
      } catch {
        report.links.failed++;
      }
    }

    // Refresh cloud data and confirm read-back
    await this.fetchCloudPlanner();
    this.syncState.importResult = report;
    this._notifyListeners();
    return report;
  }
}

export const plannerSyncService = new PlannerSyncService();
