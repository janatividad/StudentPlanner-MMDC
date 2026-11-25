import { esc, fmt, today, addDays, cmp, isOpen, lk, pill, progressBadge, dueTag, okUrl } from '../utils/helpers.js';
import { isSaveFailed } from '../state.js';

export function renderSubjectTable(state, pid) {
  const subs = state.subjects.filter(s => s.project_id == pid);
  const seenLabels = [];
  subs.forEach(s => s.props.forEach(p => {
    const l = p.label.trim();
    if (l && !seenLabels.some(x => x.toLowerCase() === l.toLowerCase())) {
      seenLabels.push(l);
    }
  }));

  const propVal = (s, l) => {
    const p = s.props.find(pr => pr.label.trim().toLowerCase() === l.toLowerCase());
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
              <td>${progressBadge(state.assignments, s.id)}</td>
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
  const sub = id => state.subjects.find(s => s.id == id);

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

export const renderProjectList = (state) => `
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
        ${state.projects.map(p => {
          const ids = state.subjects.filter(s => s.project_id == p.id).map(s => s.id);
          const openCount = state.assignments.filter(a => ids.includes(a.subject_id) && isOpen(a)).length;
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

export function renderDashboard(state, pid, currentTab = 'upcoming') {
  const t = today();
  const pr = state.projects.find(x => x.id == pid);
  const ids = new Set(state.subjects.filter(s => pid == null || s.project_id == pid).map(s => s.id));
  const all = state.assignments.filter(a => ids.has(a.subject_id)).sort(cmp);
  const openAsgs = all.filter(isOpen);

  if (pid == null) {
    return `
      <div style="font-size:40px;line-height:48px">🏠</div>
      <h1>Home</h1>
      <div class="meta">${fmt(t)} · ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })} (Asia/Manila)</div>
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
      ${state.links.map(l => `
        <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>
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
