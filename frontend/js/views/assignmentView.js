import { esc, ST } from '../utils/helpers.js';

export function renderAssignmentForm(state, assignment, defaultSubjectId = '', errors = {}, draft = null, arm = '') {
  const d = draft || assignment || {
    title: '',
    subject_id: defaultSubjectId || '',
    due_date: '',
    status: 'not_started',
    notes: '',
    description: '',
    coursera_url: '',
    resource_url: ''
  };

  const f = k => (errors[k] ? `<div class="err" id="e-${k}">${errors[k]}</div>` : '');
  const inp = (k, l, extra = '', ph = '') => `
    <label for="f-${k}">${l}</label>
    <input id="f-${k}" name="${k}" value="${esc(d[k])}" ${extra} placeholder="${ph}">
    ${f(k)}
  `;

  return `
    <nav class="meta"><a href="#" data-cancel>← Cancel</a></nav>
    <h1>${assignment ? 'Edit assignment' : 'Add assignment'}</h1>
    <form data-form="asg" data-id="${assignment ? assignment.id : ''}" novalidate style="max-width:640px">
      ${inp('title', 'Title', '', 'Add a title')}

      <label for="f-subject_id">Subject</label>
      <select id="f-subject_id" name="subject_id">
        <option value="">Choose a subject</option>
        ${state.subjects.map(s => {
          const proj = state.projects.find(p => p.id == s.project_id) || {};
          return `<option value="${s.id}"${s.id == d.subject_id ? ' selected' : ''}>${esc(proj.name || '')} – ${esc(s.name) || 'Untitled'}</option>`;
        }).join('')}
      </select>
      ${f('subject_id')}

      ${inp('due_date', 'Due date', 'type="date"')}

      <label for="f-status">Status</label>
      <select id="f-status" name="status">
        ${ST.map(s => `<option value="${s[0]}"${s[0] === d.status ? ' selected' : ''}>${s[1]}</option>`).join('')}
      </select>

      <label for="f-notes">Notes <small>(optional)</small></label>
      <textarea id="f-notes" name="notes" rows="3">${esc(d.notes)}</textarea>

      <label for="f-description">Description <small>(optional)</small></label>
      <textarea id="f-description" name="description" rows="4" placeholder="What does this assignment require?">${esc(d.description)}</textarea>

      ${inp('coursera_url', 'Coursera link <small>(optional)</small>', '', 'https://www.coursera.org/…')}
      ${inp('resource_url', 'Link <small>(optional)</small>', '', 'https://')}

      <p class="row" style="margin-top:24px">
        <button class="primary">Save assignment</button>
        <button type="button" data-cancel>Cancel</button>
        ${assignment ? `
          <button type="button" class="ghost" data-act="delasg" data-id="${assignment.id}">
            ${arm === 'a' + assignment.id ? 'Confirm delete' : 'Delete'}
          </button>
        ` : ''}
      </p>
    </form>
  `;
}
