import { esc, fmt, today, addDays, cmp, isOpen, lk, pill, progressBadge, dueTag, okUrl, safeExternalLink } from '../utils/helpers.js';
import { isSaveFailed, getActiveAssignments, getActiveProjects, getActiveSubjects, getActiveLinks, findProject, getState } from '../state.js';
import { plannerSyncService } from '../services/plannerSyncService.js';
import { authService } from '../auth/authService.js';
import { uiState } from '../router.js';

export function renderSubjectTable(state, pid) {
  const activeAssignments = getActiveAssignments();
  const activeSubjects = getActiveSubjects();
  const subs = activeSubjects.filter(s => String(s.project_id) === String(pid));
  const seenLabels = [];
  subs.forEach(s => (s.props || []).forEach(p => {
    const l = p.label.trim();
    if (l && !seenLabels.some(x => x.toLowerCase() === l.toLowerCase())) {
      seenLabels.push(l);
    }
  }));

  const propVal = (s, l) => {
    const p = (s.props || []).find(pr => pr.label.trim().toLowerCase() === l.toLowerCase());
    if (!p) return '';
    const t = p.type || 'text';
    const v = p.value;
    if (t === 'checkbox') return v === true ? '✓' : '';
    if (t === 'multi') return (v || []).map(x => `<span class="pill ns">${esc(x)}</span>`).join(' ');
    if (t === 'select' || t === 'status') {
      const cls = t === 'status' && v === 'Done' ? 'dn' : t === 'status' && v === 'In progress' ? 'ip' : 'ns';
      return v ? `<span class="pill ${cls}">${esc(v)}</span>` : '';
    }
    if (t === 'date') return v ? fmt(v) : '';
    return okUrl(v) ? lk(v, 'Open') : esc(v);
  };

  return `
    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Progress</th>
            ${seenLabels.map(l => `<th>${esc(l)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${subs.map(s => `
            <tr>
              <td class="n"><a href="#subject-${s.id}">${esc(s.name) || 'Untitled'}</a></td>
              <td>${progressBadge(activeAssignments, s.id)}</td>
              ${seenLabels.map(l => `<td class="c">${propVal(s, l)}</td>`).join('')}
            </tr>
          `).join('') || `<tr><td colspan="${seenLabels.length + 2}" class="meta">No subjects yet. Add your first subject.</td></tr>`}
        </tbody>
      </table>
      <button class="add" data-act="addsub" data-id="${pid}">+ New subject</button>
    </div>
  `;
}

export function renderAssignmentTable(state, list, showSub, emptyMessage) {
  const t = today();
  const activeSubjects = getActiveSubjects();
  const sub = id => activeSubjects.find(s => String(s.id) === String(id));

  return `
    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            ${showSub ? '<th>Subject</th>' : ''}
            <th>Due date</th>
            <th>Status</th>
            <th>Coursera</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(a => {
            const s = sub(a.subject_id);
            return `
              <tr>
                <td class="n"><a href="#edit-${a.id}" data-from>${esc(a.title)}</a></td>
                ${showSub ? `<td>${s ? `<a href="#subject-${s.id}">${esc(s.name) || 'Untitled'}</a>` : ''}</td>` : ''}
                <td>${fmt(a.due_date)}${dueTag(a, t)}</td>
                <td>${pill('asg', a.id, 'status', a.status)}</td>
                <td>${lk(a.coursera_url, 'Coursera')}</td>
                <td>${lk(a.resource_url, 'Open')}</td>
              </tr>
            `;
          }).join('') || `<tr><td colspan="6" class="meta">${emptyMessage}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

export const renderProjectList = (state) => {
  const activeAssignments = getActiveAssignments();
  const activeProjects = getActiveProjects();
  const activeSubjects = getActiveSubjects();

  return `
  <h2>Projects</h2>
  <div class="wrap">
    <table>
      <thead>
        <tr>
          <th>Project</th>
          <th>Subjects</th>
          <th>Open work</th>
        </tr>
      </thead>
      <tbody>
        ${activeProjects.map(p => {
          const ids = activeSubjects.filter(s => String(s.project_id) === String(p.id)).map(s => String(s.id));
          const openCount = activeAssignments.filter(a => ids.includes(String(a.subject_id)) && isOpen(a)).length;
          return `
            <tr>
              <td class="n"><a href="#project-${p.id}">${esc(p.icon)} ${esc(p.name) || 'Untitled'}</a></td>
              <td>${ids.length}</td>
              <td>${openCount}</td>
            </tr>
          `;
        }).join('') || '<tr><td colspan="3" class="meta">No projects yet.</td></tr>'}
      </tbody>
    </table>
    <button class="add" data-act="addproj">+ New project</button>
  </div>
`;
};

export function renderDashboard(state, pid, currentTab = 'upcoming') {
  const t = today();
  const activeProjects = getActiveProjects();
  const activeSubjects = getActiveSubjects();
  const activeAssignments = getActiveAssignments();
  const activeLinks = getActiveLinks();

  const pr = pid != null ? findProject(pid) : null;
  const ids = new Set(activeSubjects.filter(s => pid == null || String(s.project_id) === String(pid)).map(s => String(s.id)));
  const all = activeAssignments.filter(a => ids.has(String(a.subject_id))).sort(cmp);
  const openAsgs = all.filter(isOpen);

  const user = authService.getUser();
  const syncStatus = plannerSyncService.syncStatus;
  const syncError = plannerSyncService.lastError;
  const localProjectsCount = (state.projects || []).length;
  const localSubjectsCount = (state.subjects || []).length;
  const localAsgCount = (state.assignments || []).length;
  const localTotalCount = localProjectsCount + localSubjectsCount + localAsgCount + (state.pages || []).length + (state.links || []).length;
  const importReport = uiState.importReport;

  if (pid == null) {
    return `
      <div style="font-size:40px;line-height:48px">🏠</div>
      <h1>Home</h1>
      <div class="meta">${fmt(t)} · ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })} (Asia/Manila)</div>
      ${user ? `
        <div style="margin: 12px 0 16px; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 13px; display: flex; align-items: center; gap: 8px;">
            <span>☁️</span>
            <span><strong>Cloud Sync:</strong> ${esc(user.email)}</span>
            ${syncStatus === 'loading' ? '<span class="pill ip">Syncing...</span>' : ''}
            ${syncStatus === 'synced' ? '<span class="pill dn">Synced</span>' : ''}
            ${syncStatus === 'error' ? '<span class="pill ns" style="color:var(--err);border-color:var(--err)">Sync error</span>' : ''}
          </div>
          ${syncStatus === 'error' ? `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="meta" style="color:var(--err)">${esc(syncError)}</span>
              <button class="ghost" data-act="retrysync" style="min-height:28px;padding:0 8px;font-size:12px">Retry</button>
            </div>
          ` : ''}
        </div>

        ${importReport ? `
          <div class="banner" role="status" style="background: var(--okbg); color: var(--ok); border: 1px solid var(--ok); margin-bottom: 12px; font-size: 13px;">
            <strong>✓ Cloud Import Complete for ${esc(user.email)}:</strong>
            ${importReport.projects ? `Projects: ${importReport.projects.imported} new, ${importReport.projects.skipped} existing · ` : ''}
            ${importReport.subjects ? `Subjects: ${importReport.subjects.imported} new, ${importReport.subjects.skipped} existing · ` : ''}
            ${importReport.assignments ? `Assignments: ${importReport.assignments.imported} new, ${importReport.assignments.skipped} existing` : ''}
            <button class="ghost" data-act="clearimportreport" style="margin-left: 8px; font-size: 11px; padding: 0 4px; min-height: 22px;">Dismiss</button>
          </div>
        ` : ''}

        ${localTotalCount > 0 ? `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #1e3a8a; font-size: 13px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <strong>📦 Browser Data Available:</strong> You have local projects, subjects, and assignments saved in this browser.
            </div>
            <button class="btn primary" data-act="importlocal" style="min-height: 32px; font-size: 12px; padding: 0 12px;">
              Import to ${esc(user.email)}
            </button>
          </div>
        ` : ''}
      ` : ''}
      ${renderProjectList(state)}
    `;
  }

  const f = {
    upcoming: openAsgs.filter(a => a.due_date >= t),
    soon: openAsgs.filter(a => a.due_date >= t && a.due_date <= addDays(t, 6)),
    overdue: openAsgs.filter(a => a.due_date < t),
    all
  }[currentTab] || openAsgs;

  const tabs = [
    ['upcoming', 'Upcoming'],
    ['soon', 'Due soon'],
    ['overdue', 'Overdue'],
    ['all', 'All']
  ];

  return `
    <div class="row sp">
      <div style="flex:1 1 280px">
        <div style="font-size:40px;line-height:48px">${pr ? esc(pr.icon) : '🏠'}</div>
        ${pr ? `<input class="title" data-ent="proj" data-id="${pid}" data-f="name" value="${esc(pr.name)}" placeholder="Untitled project" aria-label="Project name" style="width:100%">` : '<h1>Home</h1>'}
        <div class="meta">Study Planner · Today is ${fmt(t)} (Asia/Manila)</div>
      </div>
      <a class="btn primary" href="#new" data-from>+ Add assignment</a>
    </div>

    ${user ? `
      <div style="margin: 12px 0 16px; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="font-size: 13px; display: flex; align-items: center; gap: 8px;">
          <span>☁️</span>
          <span><strong>Cloud Sync:</strong> ${esc(user.email)}</span>
          ${syncStatus === 'loading' ? '<span class="pill ip">Syncing...</span>' : ''}
          ${syncStatus === 'synced' ? '<span class="pill dn">Synced</span>' : ''}
          ${syncStatus === 'error' ? '<span class="pill ns" style="color:var(--err);border-color:var(--err)">Sync error</span>' : ''}
        </div>
        ${syncStatus === 'error' ? `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="meta" style="color:var(--err)">${esc(syncError)}</span>
            <button class="ghost" data-act="retrysync" style="min-height:28px;padding:0 8px;font-size:12px">Retry</button>
          </div>
        ` : ''}
      </div>

      ${importReport ? `
        <div class="banner" role="status" style="background: var(--okbg); color: var(--ok); border: 1px solid var(--ok); margin-bottom: 12px; font-size: 13px;">
          <strong>✓ Cloud Import Complete for ${esc(user.email)}:</strong>
          ${importReport.projects ? `Projects: ${importReport.projects.imported} new · ` : ''}
          ${importReport.subjects ? `Subjects: ${importReport.subjects.imported} new · ` : ''}
          ${importReport.assignments ? `Assignments: ${importReport.assignments.imported} new` : ''}
          <button class="ghost" data-act="clearimportreport" style="margin-left: 8px; font-size: 11px; padding: 0 4px; min-height: 22px;">Dismiss</button>
        </div>
      ` : ''}

      ${localTotalCount > 0 ? `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #1e3a8a; font-size: 13px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <strong>📦 Browser Data Available:</strong> You have local projects, subjects, and assignments saved in this browser.
          </div>
          <button class="btn primary" data-act="importlocal" style="min-height: 32px; font-size: 12px; padding: 0 12px;">
            Import to ${esc(user.email)}
          </button>
        </div>
      ` : ''}
    ` : ''}

    ${isSaveFailed() ? '<div class="banner" role="alert">Could not save to this browser. Changes may be lost on refresh.</div>' : ''}

    ${pr ? `<h2>Subjects</h2>${renderSubjectTable(state, pid)}` : renderProjectList(state)}

    <h2>Assignments</h2>
    <div class="tabs row" style="margin-bottom:8px">
      ${tabs.map(([k, l]) => `
        <button data-tab="${k}" aria-pressed="${currentTab === k}">
          ${l}${k === 'overdue' && openAsgs.some(a => a.due_date < t) ? ' (' + openAsgs.filter(a => a.due_date < t).length + ')' : ''}
        </button>
      `).join('')}
    </div>

    ${renderAssignmentTable(
      state,
      f,
      true,
      currentTab === 'overdue' ? 'Nothing overdue.' : 'No work due. Add an assignment to get started.'
    )}

    <h2>Quick links</h2>
    <div class="ql">
      ${activeLinks.map(l => `
        ${safeExternalLink(l.url, l.label, { invalidMode: 'text' })}
        <button class="ghost" style="min-height:28px;padding:0 6px;margin-right:6px" data-act="dellink" data-id="${l.id}" aria-label="Remove ${esc(l.label)}">×</button>
      `).join('') || '<span class="meta">No quick links yet.</span>'}
    </div>
    <form data-form="link" class="row" style="margin-top:8px">
      <input name="label" placeholder="Label, e.g. MyCamu Portal" style="flex:1 1 160px;width:auto" aria-label="Label">
      <input name="url" placeholder="https://" style="flex:2 1 220px;width:auto" aria-label="URL">
      <button>Add link</button>
    </form>
    <div class="err" id="lerr"></div>
  `;
}
