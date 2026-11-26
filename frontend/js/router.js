/**
 * Central Router & View Orchestrator
 */
import { getState, saveState, findAssignment } from './state.js';
import { renderSidebar } from './views/sidebarView.js';
import { renderDashboard } from './views/dashboardView.js';
import { renderSubjectPage } from './views/subjectView.js';
import { renderNotePage } from './views/pageView.js';
import { renderAssignmentForm } from './views/assignmentView.js';
import { renderModal } from './views/modalView.js';
import { renderAuthPage } from './views/authView.js';

export const uiState = {
  tab: 'upcoming',
  from: '',
  draft: null,
  errs: {},
  arm: '',
  focusP: '',
  focusO: '',
  menu: '',
  confirmId: '',
  tmenu: ''
};

export function goBack(assignment) {
  uiState.draft = null;
  uiState.errs = {};
  uiState.arm = '';
  const state = getState();
  const sub = assignment ? state.subjects.find(s => String(s.id) === String(assignment.subject_id)) : null;
  const target = uiState.from || (sub ? 'subject-' + sub.id : '');
  const cur = location.hash.slice(1);
  uiState.from = '';
  if (cur === target) {
    renderApp();
  } else {
    location.hash = target;
  }
}

export function renderApp() {
  const state = getState();
  const h = location.hash.slice(1);
  const appEl = document.getElementById('app');
  let match, bodyContent;

  if ((match = h.match(/^subject-(\d+)$/))) {
    bodyContent = renderSubjectPage(state, match[1], {
      tmenu: uiState.tmenu,
      arm: uiState.arm
    });
  } else if ((match = h.match(/^page-(\d+)$/))) {
    bodyContent = renderNotePage(state, match[1], { arm: uiState.arm });
  } else if ((match = h.match(/^new(?:-(\d+))?$/))) {
    bodyContent = renderAssignmentForm(state, null, match[1], uiState.errs, uiState.draft, uiState.arm);
  } else if ((match = h.match(/^edit-([a-zA-Z0-9\-_]+)$/))) {
    const a = findAssignment(match[1]);
    bodyContent = a
      ? renderAssignmentForm(state, a, '', uiState.errs, uiState.draft, uiState.arm)
      : '<h1>Assignment not found</h1>';
  } else if ((match = h.match(/^project-(\d+)$/))) {
    bodyContent = state.projects.some(p => p.id == match[1])
      ? renderDashboard(state, +match[1], uiState.tab)
      : '<h1>Project not found</h1>';
  } else if (h === 'auth' || h === 'signin' || h === 'signup') {
    bodyContent = renderAuthPage();
  } else {
    bodyContent = renderDashboard(state, null, uiState.tab);
  }

  const topBar = `
    <div class="top">
      ${state.side ? '' : '<button class="ghost" data-act="side" aria-label="Show sidebar" aria-expanded="false">☰</button>'}
      ${h ? '<a class="meta" href="#" style="margin-left:8px">Home</a>' : ''}
    </div>
  `;

  if (appEl) {
    appEl.innerHTML = topBar + bodyContent;
  }

  renderSidebar(state, { menu: uiState.menu });
  renderModal(state, uiState.confirmId);

  // Focus restoration
  if (uiState.focusP && appEl) {
    const el = appEl.querySelector(`[data-pid="${uiState.focusP}"][data-k="label"]`);
    if (el) {
      el.focus();
      el.select();
    }
    uiState.focusP = '';
  }

  if (uiState.focusO && appEl) {
    const el = appEl.querySelector(`[data-ent="optadd"][data-pid="${uiState.focusO}"]`);
    if (el) el.focus();
    uiState.focusO = '';
  }
}
