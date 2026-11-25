/**
 * Helper utilities for formatting, date math, escaping, and validation.
 */
export const TZ = 'Asia/Manila';

export const ST = [
  ['not_started', 'Not started', 'ns'],
  ['in_progress', 'In progress', 'ip'],
  ['done', 'Done', 'dn']
];

export const stOf = (v) => ST.find(s => s[0] === v) || ST[0];

export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

export const addDays = (d, n) => {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

export const fmt = (d) => {
  if (!d) return '';
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

/**
 * Validates that a string is a well-formed HTTP or HTTPS URL.
 * Strictly disallows javascript:, data:, file:, and other unsafe schemes.
 */
export const okUrl = (u) => {
  if (!u || typeof u !== 'string') return false;
  try {
    const trimmed = u.trim();
    if (!trimmed) return false;
    const x = new URL(trimmed);
    return (x.protocol === 'http:' || x.protocol === 'https:') && Boolean(x.hostname);
  } catch {
    return false;
  }
};

/**
 * Centralized external link renderer.
 * Validates links at render time. Allows only HTTP and HTTPS links, escapes all values,
 * and renders invalid links as plain text or omits them.
 */
export const safeExternalLink = (u, label, options = {}) => {
  const trimmed = typeof u === 'string' ? u.trim() : '';
  const text = label != null ? String(label) : trimmed;

  if (!trimmed) {
    return options.fallback === 'dash' ? '<span class="meta">—</span>' : '';
  }

  if (okUrl(trimmed)) {
    const cls = options.className ? ` class="${esc(options.className)}"` : ' class="l"';
    return `<a${cls} href="${esc(trimmed)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
  }

  // Handle invalid links: omit or display as escaped plain text
  if (options.invalidMode === 'omit') {
    return options.fallback === 'dash' ? '<span class="meta">—</span>' : '';
  }

  return `<span class="meta" title="Invalid link (HTTP/HTTPS only)">${esc(text)}</span>`;
};

let pc = 0;
export const nid = () => 'p' + Date.now().toString(36) + (pc++);

export const say = (m) => {
  const el = document.getElementById('live');
  if (el) el.textContent = m;
};

export const DEF = [
  ['Code', 'code'],
  ['Section', 'section'],
  ['Course description', 'description'],
  ['Credits', 'credits'],
  ['Course homepage', 'homepage'],
  ['Syllabus', 'syllabus'],
  ['Mentoring', 'mentoring'],
  ['Recording', 'recording'],
  ['Sync schedule', 'sync']
];

export const guess = (l) =>
  /homepage|syllabus|recording|link|url/i.test(l)
    ? 'url'
    : /credit/i.test(l)
      ? 'number'
      : 'text';

export const TYPES = [
  ['text', 'Text', '≡'],
  ['number', 'Number', '#'],
  ['select', 'Select', '◉'],
  ['multi', 'Multi-select', '☰'],
  ['status', 'Status', '◌'],
  ['date', 'Date', '📅'],
  ['checkbox', 'Checkbox', '☑'],
  ['url', 'URL', '🔗'],
  ['email', 'Email', '@'],
  ['phone', 'Phone', '📞']
];

export const typeOf = (t) => TYPES.find(x => x[0] === t) || TYPES[0];

export const blank = (id, name) => ({
  id,
  name,
  status: 'not_started',
  notes: '',
  props: DEF.map(([l]) => ({
    id: nid(),
    label: l,
    value: '',
    type: guess(l)
  }))
});

export const cmp = (a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : a.id - b.id);

export const isOpen = (a) => a.status !== 'done';

export const lk = (u, t) => safeExternalLink(u, t, { className: 'l', fallback: 'dash', invalidMode: 'text' });

export const pill = (ent, id, f, v) => {
  const [, , c] = stOf(v);
  return `<select class="pill ${c}" data-ent="${ent}" data-id="${id}" data-f="${f}" aria-label="Status">
    ${ST.map(s => `<option value="${s[0]}"${s[0] === v ? ' selected' : ''}>${s[1]}</option>`).join('')}
  </select>`;
};

export const progressBadge = (assignments, subjectId) => {
  const l = assignments.filter(a => a.subject_id == subjectId);
  const d = l.filter(a => a.status === 'done').length;
  if (!l.length) return '<span class="meta">No assignments yet.</span>';
  const pct = Math.round((d / l.length) * 100);
  return `<span class="bar"><i style="width:${pct}%"></i></span>${d}/${l.length} · ${pct}%`;
};

export const dueTag = (a, t) => {
  if (!isOpen(a)) return '';
  if (a.due_date < t) return '<span class="tag od">Overdue</span>';
  if (a.due_date <= addDays(t, 6)) return '<span class="tag soon">Due soon</span>';
  return '';
};
