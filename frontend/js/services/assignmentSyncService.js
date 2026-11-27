/**
 * Supabase Assignment Synchronization Service
 * 
 * Provides assignment-specific synchronization, delegating to the unified
 * PlannerSyncService for complete cross-entity cloud sync.
 */

import { plannerSyncService } from './plannerSyncService.js';

class AssignmentSyncService {
  get cloudAssignments() {
    return plannerSyncService.cloudAssignments;
  }

  set cloudAssignments(val) {
    plannerSyncService.cloudAssignments = val;
  }

  get syncStatus() {
    return plannerSyncService.syncStatus;
  }

  set syncStatus(val) {
    plannerSyncService.syncState.status = val;
  }

  get lastError() {
    return plannerSyncService.lastError;
  }

  isCloudActive() {
    return plannerSyncService.isCloudActive();
  }

  getCloudAssignments() {
    return plannerSyncService.getCloudAssignments();
  }

  clearCloudState() {
    plannerSyncService.clearCloudState();
  }

  onSyncChange(cb) {
    return plannerSyncService.onSyncChange(cb);
  }

  async fetchCloudAssignments() {
    const data = await plannerSyncService.fetchCloudPlanner();
    return data?.assignments || [];
  }

  async createCloudAssignment(rec) {
    return plannerSyncService.createCloudAssignment(rec);
  }

  async updateCloudAssignment(id, updates) {
    return plannerSyncService.updateCloudAssignment(id, updates);
  }

  async deleteCloudAssignment(id) {
    return plannerSyncService.deleteCloudAssignment(id);
  }

  async importLocalAssignments() {
    const fullReport = await plannerSyncService.importAllLocalData();
    return {
      imported: fullReport.assignments.imported,
      skipped: fullReport.assignments.skipped,
      failed: fullReport.assignments.failed
    };
  }
}

export const assignmentSyncService = new AssignmentSyncService();
