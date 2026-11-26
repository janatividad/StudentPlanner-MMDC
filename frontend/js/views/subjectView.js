import { esc, cmp, okUrl, typeOf, TYPES, safeExternalLink } from '../utils/helpers.js';
import { getActiveAssignments } from '../state.js';
import { renderAssignmentTable } from './dashboardView.js';

export function renderTypeBtn(s, p, tmenu) {
  return `<button class="ti" data-act="ptype" data-id="${s.id}" data-pid="${p.id}" aria-haspopup="menu" aria-expanded="${tmenu === p.id}" aria-label="Property type: ${typeOf(p.type)[1]}. Change type" title="${typeOf(p.type)[1]}">${typeOf(p.type)[2]}</button>`;
}

export function renderTypeMenu(s, p) {
  return `<div class="tmenu" role="menu">
    ${TYPES.map(([k, l, i]) => `
      <button class="si" role="menuitemradio" aria-checked="${(p.type || 'text') === k}" data-act="settype" data-id="${s.id}" data-pid="${p.id}" data-t="${k}">
        <span style="width:20px;text-align:center">${i}</span> ${l}
        <span style="margin-left:auto">${(p.type || 'text') === k ? '✓' : ''}</span>
      </button>
    `).join('')}
  </div>`;
}

export function renderValEditor(s, p) {
  const t = p.type || 'text';
  const a = `data-ent="prop" data-id="${s.id}" data-pid="${p.id}" data-k="value"`;
  const ph = p.label.trim() ? 'Add ' + esc(p.label.toLowerCase()) : 'Add a value';

  if (t === 'checkbox') {
    return `<input type="checkbox" ${a} ${p.value === true ? 'checked' : ''} style="width:20px;min-height:20px;margin:8px" aria-label="${esc(p.label) || 'Checkbox'}">`;
  }
  if (t === 'select' || t === 'multi' || t === 'status') {
    const sel = v => (t === 'multi' ? (p.value || []).includes(v) : p.value === v);
    return `
      <div class="chips">
        ${(p.options || []).map(o => `
          <span class="chip ${sel(o) ? 'on' : ''}">
            <button class="cb" data-act="opt" data-id="${s.id}" data-pid="${p.id}" data-o="${esc(o)}" aria-pressed="${sel(o)}">${esc(o)}</button>
            <button class="cx" data-act="delopt" data-id="${s.id}" data-pid="${p.id}" data-o="${esc(o)}" aria-label="Remove option ${esc(o)}">×</button>
          </span>
        `).join('')}
        <input class="oi" data-ent="optadd" data-id="${s.id}" data-pid="${p.id}" placeholder="Add option" aria-label="Add option, then press Enter">
      </div>
    `;
  }
  if (t === 'date') return `<input type="date" ${a} value="${esc(p.value)}">`;
  if (t === 'number') return `<input type="number" step="any" ${a} value="${esc(p.value)}" placeholder="${ph}">`;
  if (t === 'text' && /description/i.test(p.label)) return `<textarea rows="2" ${a} placeholder="${ph}">${esc(p.value)}</textarea>`;
  let linkIndicator = '';
  if (t === 'url' && p.value) {
    linkIndicator = okUrl(p.value)
      ? `<a class="l meta" href="${esc(p.value.trim())}" target="_blank" rel="noopener noreferrer" style="padding:0 8px">Open link</a>`
      : `<span class="meta" style="padding:0 8px; color:var(--od); font-size:12px;">(Invalid URL)</span>`;
  }
  return `<input ${t === 'email' ? 'type="email"' : t === 'phone' ? 'type="tel"' : ''} ${a} value="${esc(p.value)}" placeholder="${ph}">${linkIndicator}`;
}

export function renderSubjectPage(state, id, options = {}) {
  const { tmenu = '', arm = '' } = options;
  const s = state.subjects.find(sub => sub.id == id);
  if (!s) return '<h1>Subject not found</h1>';

  const allAs = getActiveAssignments();
  const as = allAs.filter(a => String(a.subject_id) === String(id)).sort(cmp);
  const doneCount = as.filter(a => a.status === 'done').length;
  const progressText = as.length
    ? `<span class="bar"><i style="width:${Math.round((doneCount / as.length) * 100)}%"></i></span>${doneCount}/${as.length} · ${Math.round((doneCount / as.length) * 100)}%`
    : '<span class="meta">No assignments yet.</span>';

  return `
    <div class="row sp">
      <input class="title" data-ent="sub" data-id="${s.id}" data-f="name" value="${esc(s.name)}" placeholder="Untitled subject" aria-label="Subject name" style="flex:1 1 260px;width:auto">
      <a class="btn primary" href="#new-${s.id}" data-from>+ Add assignment</a>
    </div>

    <div class="props">
      ${s.props.map(p => `
        <div class="prow" data-prow="${p.id}" data-sid="${s.id}">
          <span class="dh" data-drag draggable="true" role="button" tabindex="0" title="Drag to reorder" aria-label="Reorder ${esc(p.label) || 'property'}. Use arrow keys to move up or down">⋮⋮</span>
          <div class="lw">
            ${renderTypeBtn(s, p, tmenu)}
            <input class="pl" data-ent="prop" data-id="${s.id}" data-pid="${p.id}" data-k="label" value="${esc(p.label)}" placeholder="Property name" aria-label="Property name">
            ${tmenu === p.id ? renderTypeMenu(s, p) : ''}
          </div>
          <div class="v">${renderValEditor(s, p)}</div>
          <button class="x ghost" data-act="delprop" data-id="${s.id}" data-pid="${p.id}" aria-label="Delete property ${esc(p.label)}">×</button>
        </div>
      `).join('')}
    </div>
    <button class="ghost" data-act="addprop" data-id="${s.id}">+ Add a property</button>

    <div class="meta" style="margin-top:8px">Progress: ${progressText}</div>

    <h2>Assignments</h2>
    ${renderAssignmentTable(state, as, false, 'No assignments yet. Add the first one.')}

    <h2>Notes</h2>
    <textarea rows="6" data-ent="sub" data-id="${s.id}" data-f="notes" placeholder="Add notes">${esc(s.notes)}</textarea>

    <p style="margin-top:32px">
      <button class="ghost" data-act="delsub" data-id="${s.id}">
        ${arm === 's' + s.id ? `Confirm: delete subject and ${as.length} assignment(s)` : 'Delete subject'}
      </button>
    </p>
  `;
}
