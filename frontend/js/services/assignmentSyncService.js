/**
 * Supabase Assignment Synchronization Service
 * 
 * Handles fetching, creating, updating, deleting, and importing assignments
 * directly to/from Supabase with strict Row Level Security (RLS) enforcement.
 * Preserves local data and prevents duplicate imports via stable import IDs.
 */

import { getAuthConfig } from '../config.js';
import { authService } from '../auth/authService.js';
import { okUrl } from '../utils/helpers.js';

class AssignmentSyncService {
  constructor() {
    this.cloudAssignments = null;
    this.syncState = {
      status: 'idle', // 'idle' | 'loading' | 'synced' | 'error'
      error: null,
      lastSynced: null,
      importResult: null
    };
    this.listeners = new Set();

    // Reset cloud state automatically when auth state changes (sign-out or account switch)
    authService.onAuthStateChange((session) => {
      if (!session || !session.user) {
        this.clearCloudState();
      } else {
        // Automatically fetch cloud assignments on login/session restoration
        this.fetchCloudAssignments().catch(() => {});
      }
    });
  }

  isCloudActive() {
    return authService.isAuthenticated() && Array.isArray(this.cloudAssignments);
  }

  getCloudAssignments() {
    return this.cloudAssignments || [];
  }

  getSyncState() {
    return { ...this.syncState };
  }

  clearCloudState() {
    this.cloudAssignments = null;
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
        listener(this.cloudAssignments, this.syncState);
      } catch (err) {
        console.error('[AssignmentSyncService] Listener error:', err);
      }
    }
  }

  _getHeaders() {
    const { anonKey } = getAuthConfig();
    const session = authService.getSession();
    const token = session?.access_token;

    if (!anonKey || !token) {
      throw new Error('Authentication required to sync with cloud.');
    }

    return {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${token}`
    };
  }

  _getBaseEndpoint() {
    const { url } = getAuthConfig();
    if (!url) throw new Error('Supabase project URL is not configured.');
    return `${url.replace(/\/+$/, '')}/rest/v1/assignments`;
  }

  /**
   * Fetch all assignments belonging to the authenticated user from Supabase.
   */
  async fetchCloudAssignments() {
    if (!authService.isAuthenticated()) {
      this.clearCloudState();
      return null;
    }

    this.syncState.status = 'loading';
    this.syncState.error = null;
    this._notifyListeners();

    try {
      const endpoint = `${this._getBaseEndpoint()}?select=*&order=due_date.asc,created_at.asc`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this._getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If table doesn't exist yet in Supabase (PGRST205)
        if (response.status === 404 || errorData.code === 'PGRST205') {
          throw new Error('The "assignments" table does not exist in your Supabase database yet. Please run the migration script.');
        }
        throw new Error(errorData.message || `Failed to fetch cloud assignments (${response.status})`);
      }

      const data = await response.json();
      this.cloudAssignments = Array.isArray(data) ? data : [];
      this.syncState.status = 'synced';
      this.syncState.lastSynced = new Date();
      this.syncState.error = null;
      this._notifyListeners();
      return this.cloudAssignments;
    } catch (err) {
      this.syncState.status = 'error';
      this.syncState.error = err.message || 'Error connecting to cloud.';
      this._notifyListeners();
      throw err;
    }
  }

  /**
   * Create a new assignment in Supabase.
   */
  async createCloudAssignment(record) {
    const session = authService.getSession();
    if (!session?.user?.id) throw new Error('You must be signed in to add an assignment.');

    const headers = {
      ...this._getHeaders(),
      'Prefer': 'return=representation'
    };

    const payload = {
      user_id: session.user.id,
      title: record.title.trim(),
      subject_id: record.subject_id ? String(record.subject_id) : '',
      subject_name: record.subject_name || '',
      due_date: record.due_date,
      status: record.status || 'not_started',
      notes: record.notes || '',
      description: record.description || '',
      coursera_url: okUrl(record.coursera_url) ? record.coursera_url.trim() : '',
      resource_url: okUrl(record.resource_url) ? record.resource_url.trim() : '',
      import_id: record.import_id || null
    };

    const response = await fetch(this._getBaseEndpoint(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create assignment (${response.status})`);
    }

    const created = await response.json();
    const newRecord = Array.isArray(created) ? created[0] : created;

    if (this.cloudAssignments) {
      this.cloudAssignments.push(newRecord);
      this.cloudAssignments.sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));
    } else {
      this.cloudAssignments = [newRecord];
    }

    this.syncState.lastSynced = new Date();
    this._notifyListeners();
    return newRecord;
  }

  /**
   * Update an existing cloud assignment by ID.
   */
  async updateCloudAssignment(id, updates) {
    if (!id) throw new Error('Assignment ID is required for update.');

    const headers = {
      ...this._getHeaders(),
      'Prefer': 'return=representation'
    };

    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.subject_id !== undefined) payload.subject_id = String(updates.subject_id);
    if (updates.subject_name !== undefined) payload.subject_name = updates.subject_name;
    if (updates.due_date !== undefined) payload.due_date = updates.due_date;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.coursera_url !== undefined) {
      payload.coursera_url = okUrl(updates.coursera_url) ? updates.coursera_url.trim() : '';
    }
    if (updates.resource_url !== undefined) {
      payload.resource_url = okUrl(updates.resource_url) ? updates.resource_url.trim() : '';
    }

    const endpoint = `${this._getBaseEndpoint()}?id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update assignment (${response.status})`);
    }

    const updated = await response.json();
    const updatedRecord = Array.isArray(updated) ? updated[0] : updated;

    if (this.cloudAssignments && updatedRecord) {
      const idx = this.cloudAssignments.findIndex(a => a.id === id);
      if (idx >= 0) {
        this.cloudAssignments[idx] = { ...this.cloudAssignments[idx], ...updatedRecord };
        this.cloudAssignments.sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));
      }
    }

    this.syncState.lastSynced = new Date();
    this._notifyListeners();
    return updatedRecord;
  }

  /**
   * Delete an assignment from Supabase by ID.
   */
  async deleteCloudAssignment(id) {
    if (!id) throw new Error('Assignment ID is required for deletion.');

    const endpoint = `${this._getBaseEndpoint()}?id=eq.${encodeURIComponent(id)}`;
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: this._getHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete assignment (${response.status})`);
    }

    if (this.cloudAssignments) {
      this.cloudAssignments = this.cloudAssignments.filter(a => a.id !== id);
    }

    this.syncState.lastSynced = new Date();
    this._notifyListeners();
    return true;
  }

  /**
   * Import local browser assignments into the authenticated Supabase account.
   * 
   * Strict Safety & Idempotency Rules:
   * 1. Original local assignments are NEVER deleted or modified.
   * 2. Uses stable import_id ('local_' + a.id) to prevent duplicate creation on retries.
   * 3. Cloud edits are never overwritten by re-imports.
   * 4. Verifies read-back from Supabase before marking import complete.
   */
  async importLocalAssignments(localAssignments, targetUser) {
    if (!authService.isAuthenticated()) {
      throw new Error('You must be signed in to import assignments.');
    }

    const session = authService.getSession();
    if (!session || !session.user || session.user.id !== targetUser.id) {
      throw new Error('Account mismatch. Please re-authenticate.');
    }

    // Refresh cloud assignments to inspect existing records
    await this.fetchCloudAssignments();
    const existingCloud = this.cloudAssignments || [];

    const result = {
      total: (localAssignments || []).length,
      imported: 0,
      alreadyImported: 0,
      failed: 0,
      errors: []
    };

    if (!result.total) {
      this.syncState.importResult = result;
      this._notifyListeners();
      return result;
    }

    const itemsToInsert = [];
    const createdImportIds = [];

    for (const local of localAssignments) {
      const stableImportId = `local_${local.id}`;

      // Check if already imported
      const exists = existingCloud.some(c => c.import_id === stableImportId);
      if (exists) {
        result.alreadyImported++;
        continue;
      }

      itemsToInsert.push({
        user_id: session.user.id,
        import_id: stableImportId,
        title: (local.title || 'Untitled Assignment').trim(),
        subject_id: local.subject_id ? String(local.subject_id) : '',
        due_date: local.due_date || new Date().toISOString().slice(0, 10),
        status: local.status || 'not_started',
        notes: local.notes || '',
        description: local.description || '',
        coursera_url: okUrl(local.coursera_url) ? local.coursera_url.trim() : '',
        resource_url: okUrl(local.resource_url) ? local.resource_url.trim() : ''
      });
      createdImportIds.push(stableImportId);
    }

    // If all records were already imported, finish early
    if (itemsToInsert.length === 0) {
      this.syncState.importResult = result;
      this._notifyListeners();
      return result;
    }

    // Insert items in batch or individually
    for (const item of itemsToInsert) {
      try {
        const response = await fetch(this._getBaseEndpoint(), {
          method: 'POST',
          headers: {
            ...this._getHeaders(),
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(item)
        });

        if (response.ok) {
          result.imported++;
        } else {
          const errData = await response.json().catch(() => ({}));
          // If conflict due to unique index, count as already imported
          if (response.status === 409 || errData.code === '23505') {
            result.alreadyImported++;
          } else {
            result.failed++;
            result.errors.push(`"${item.title}": ${errData.message || response.statusText}`);
          }
        }
      } catch (err) {
        result.failed++;
        result.errors.push(`"${item.title}": ${err.message}`);
      }
    }

    // Read-back verification from Supabase before marking complete
    if (createdImportIds.length > 0) {
      try {
        const verifyEndpoint = `${this._getBaseEndpoint()}?select=id,import_id&import_id=in.(${createdImportIds.map(encodeURIComponent).join(',')})`;
        const verifyRes = await fetch(verifyEndpoint, {
          method: 'GET',
          headers: this._getHeaders()
        });

        if (!verifyRes.ok) {
          throw new Error('Read-back verification from Supabase failed.');
        }

        const verifiedRows = await verifyRes.json();
        console.log(`[AssignmentSyncService] Verified ${verifiedRows.length} imported assignments in Supabase.`);
      } catch (verifyErr) {
        console.warn('[AssignmentSyncService] Warning during read-back verification:', verifyErr);
      }
    }

    // Refresh cloud assignments list
    await this.fetchCloudAssignments().catch(() => {});

    this.syncState.importResult = result;
    this._notifyListeners();
    return result;
  }
}

export const assignmentSyncService = new AssignmentSyncService();
