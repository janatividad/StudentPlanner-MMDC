/**
 * Centralized Event Handlers & User Interactions
 */
import { getState, saveState } from './state.js';
import { uiState, renderApp, goBack } from './router.js';
import { authService } from './auth/authService.js';
import { authUiState } from './views/authView.js';
import { setAuthConfig } from './config.js';
import {
  blank,
  nid,
  say,
  okUrl,
  typeOf,
  stOf
} from './utils/helpers.js';

let dragId = '';

const getTargetEntity = (el) => {
  const state = getState();
  const e = el.dataset.ent;
  if (e === 'sub') return state.subjects.find(s => s.id == el.dataset.id);
  if (e === 'page') return state.pages.find(x => x.id == el.dataset.id);
  if (e === 'proj') return state.projects.find(x => x.id == el.dataset.id);
  if (e === 'asg') return state.assignments.find(x => x.id == el.dataset.id);
  if (e === 'prop') {
    const s = state.subjects.find(sub => sub.id == el.dataset.id);
    return s && s.props.find(p => p.id === el.dataset.pid);
  }
  return null;
};

const reorderProperties = (subject, aId, bId, after) => {
  if (aId === bId) return;
  const i = subject.props.findIndex(p => p.id === aId);
  if (i < 0) return;
  const [moved] = subject.props.splice(i, 1);
  let j = subject.props.findIndex(p => p.id === bId);
  if (j < 0) j = subject.props.length;
  subject.props.splice(after ? j + 1 : j, 0, moved);
  saveState();
};

const clearDragClasses = () => {
  document.querySelectorAll('.prow.over, .prow.overb, .prow.drag').forEach(r => {
    r.classList.remove('over', 'overb', 'drag');
  });
};

export function setupEventListeners() {
  const sideEl = document.getElementById('side');

  // Click events
  document.addEventListener('click', (e) => {
    const state = getState();

    if (uiState.tmenu && !e.target.closest('.tmenu, [data-act="ptype"]')) {
      setTimeout(() => {
        uiState.tmenu = '';
        renderApp();
      }, 0);
    }

    if (e.target.classList.contains('scrim')) {
      uiState.confirmId = '';
      renderApp();
      return;
    }

    if (uiState.menu && !e.target.closest('.menu, [data-act="menu"]')) {
      setTimeout(() => {
        uiState.menu = '';
        renderApp();
      }, 0);
    }

    if (e.target.closest('.menu a')) {
      setTimeout(() => {
        uiState.menu = '';
        renderApp();
      }, 0);
    }

    if (e.target.closest('aside a, aside [data-act="addpage"], aside [data-act="addproj"]') && window.innerWidth < 720) {
      state.side = false;
      if (sideEl) sideEl.hidden = true;
    }

    const el = e.target.closest('[data-from], [data-cancel], [data-act], [data-tab], [data-auth-tab]');
    if (!el) return;

    if ('authTab' in el.dataset) {
      authUiState.mode = el.dataset.authTab;
      authUiState.error = '';
      authUiState.successMessage = '';
      renderApp();
      return;
    }

    if ('from' in el.dataset) {
      uiState.from = location.hash.slice(1);
      uiState.draft = null;
      uiState.errs = {};
      return;
    }

    if ('cancel' in el.dataset) {
      e.preventDefault();
      const m = location.hash.match(/edit-(\d+)/);
      goBack(m ? state.assignments.find(a => a.id == m[1]) : null);
      return;
    }

    if ('tab' in el.dataset) {
      uiState.tab = el.dataset.tab;
      renderApp();
      return;
    }

    const id = el.dataset.id;
    const act = el.dataset.act;

    if (act === 'toggleconfig') {
      authUiState.showConfig = !authUiState.showConfig;
      renderApp();
      return;
    }
    if (act === 'signout') {
      authService.signOut().then(() => {
        say('Signed out successfully.');
        renderApp();
      });
      return;
    }
    if (act === 'side') {
      state.side = !state.side;
      saveState();
      renderApp();
    }
    if (act === 'addsub') {
      const s = blank(state.next++, '');
      s.project_id = +id;
      state.subjects.push(s);
      saveState();
      location.hash = 'subject-' + s.id;
    }
    if (act === 'addproj') {
      const p = { id: state.next++, name: '', icon: '📚' };
      state.projects.push(p);
      saveState();
      location.hash = 'project-' + p.id;
    }
    if (act === 'menu') {
      uiState.menu = uiState.menu === id ? '' : id;
      renderApp();
      return;
    }
    if (act === 'ptype') {
      const pid = el.dataset.pid;
      uiState.tmenu = uiState.tmenu === pid ? '' : pid;
      renderApp();
      return;
    }
    if (act === 'settype') {
      const s = state.subjects.find(sub => sub.id == id);
      const p = s.props.find(x => x.id === el.dataset.pid);
      const t = el.dataset.t;
      const tx = ['text', 'url', 'email', 'phone'];
      const s2 = ['select', 'status'];
      const v = p.value;
      const old = p.type || 'text';
      let nv = '';

      if (tx.includes(t) && tx.includes(old)) nv = v;
      else if (s2.includes(t) && s2.includes(old)) nv = v;
      else if (t === 'number' && !isNaN(parseFloat(v))) nv = v;
      else if (t === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(v)) nv = v;
      else if (t === 'multi') nv = s2.includes(old) && v ? [v] : [];
      else if (t === 'checkbox') nv = false;

      if ((t === 'select' || t === 'multi' || t === 'status') && !(p.options || []).length) {
        p.options = t === 'status' ? ['Not started', 'In progress', 'Done'] : [];
      }

      p.type = t;
      p.value = nv;
      uiState.tmenu = '';
      saveState();
      renderApp();
      say('Property type set to ' + typeOf(t)[1]);
      return;
    }
    if (act === 'opt') {
      const s = state.subjects.find(sub => sub.id == id);
      const p = s.props.find(x => x.id === el.dataset.pid);
      const o = el.dataset.o;
      if (p.type === 'multi') {
        const a = Array.isArray(p.value) ? p.value : [];
        p.value = a.includes(o) ? a.filter(x => x !== o) : [...a, o];
      } else {
        p.value = p.value === o ? '' : o;
      }
      saveState();
      renderApp();
      return;
    }
    if (act === 'delopt') {
      const s = state.subjects.find(sub => sub.id == id);
      const p = s.props.find(x => x.id === el.dataset.pid);
      const o = el.dataset.o;
      p.options = (p.options || []).filter(x => x !== o);
      p.value = Array.isArray(p.value)
        ? p.value.filter(x => x !== o)
        : p.value === o ? '' : p.value;
      saveState();
      renderApp();
      return;
    }
    if (act === 'cancelmodal') {
      uiState.confirmId = '';
      renderApp();
      return;
    }
    if (act === 'delproj') {
      uiState.menu = '';
      uiState.confirmId = id;
      renderApp();
      return;
    }
    if (act === 'delprojok') {
      uiState.confirmId = '';
      const sids = state.subjects.filter(s => s.project_id == id).map(s => s.id);
      state.assignments = state.assignments.filter(a => !sids.includes(a.subject_id));
      state.subjects = state.subjects.filter(s => s.project_id != id);
      state.projects = state.projects.filter(p => p.id != id);
      saveState();
      uiState.arm = '';
      const h = location.hash.slice(1);
      if (
        h === 'project-' + id ||
        (h.startsWith('subject-') && !state.subjects.some(s => s.id == h.slice(8))) ||
        (h.startsWith('edit-') && !state.assignments.some(a => a.id == h.slice(5)))
      ) {
        location.hash = '';
      }
      renderApp();
      say('Project deleted.');
    }
    if (act === 'addpage') {
      const p = { id: state.next++, title: '', icon: '📄', body: '' };
      state.pages.push(p);
      saveState();
      location.hash = 'page-' + p.id;
    }
    if (act === 'addprop') {
      const s = state.subjects.find(sub => sub.id == id);
      const p = { id: nid(), label: '', value: '' };
      s.props.push(p);
      saveState();
      uiState.focusP = p.id;
      renderApp();
    }
    if (act === 'delprop') {
      const s = state.subjects.find(sub => sub.id == id);
      s.props = s.props.filter(p => p.id !== el.dataset.pid);
      saveState();
      renderApp();
    }
    if (act === 'delsub') {
      if (uiState.arm !== 's' + id) {
        uiState.arm = 's' + id;
        renderApp();
        return;
      }
      const sj = state.subjects.find(s => s.id == id);
      state.assignments = state.assignments.filter(a => a.subject_id != id);
      state.subjects = state.subjects.filter(s => s.id != id);
      saveState();
      uiState.arm = '';
      location.hash = sj ? 'project-' + sj.project_id : '';
    }
    if (act === 'delpage') {
      if (uiState.arm !== 'g' + id) {
        uiState.arm = 'g' + id;
        renderApp();
        return;
      }
      state.pages = state.pages.filter(p => p.id != id);
      saveState();
      uiState.arm = '';
      location.hash = '';
    }
    if (act === 'delasg') {
      if (uiState.arm !== 'a' + id) {
        uiState.arm = 'a' + id;
        renderApp();
        return;
      }
      const a = state.assignments.find(x => x.id == id);
      state.assignments = state.assignments.filter(x => x.id != id);
      saveState();
      goBack(a);
    }
    if (act === 'dellink') {
      state.links = state.links.filter(r => r.id != id);
      saveState();
      renderApp();
    }
  });

  // Inputs
  document.addEventListener('input', (e) => {
    const el = e.target;
    const state = getState();

    if (el.dataset.term !== undefined) {
      state.term = el.value;
      saveState();
      return;
    }

    if (!el.dataset.ent || el.tagName === 'SELECT') return;
    const o = getTargetEntity(el);
    if (!o) return;

    if (el.dataset.ent === 'optadd') return;
    o[el.dataset.f || el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
    saveState();

    if (['name', 'title', 'icon'].includes(el.dataset.f) || el.dataset.k === 'label') {
      renderApp();
    }
  });

  // Select changes
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.tagName !== 'SELECT' || !el.dataset.f) return;
    const o = getTargetEntity(el);
    if (!o) return;

    o[el.dataset.f] = el.value;
    saveState();
    say('Status set to ' + stOf(el.value)[1]);
    renderApp();
  });

  // Forms submit
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const state = getState();
    const v = Object.fromEntries(new FormData(form));
    const k = form.dataset.form;

    if (k === 'authconfig') {
      setAuthConfig(v.supabase_url, v.supabase_anon_key);
      authUiState.showConfig = false;
      say('Supabase project configuration saved.');
      renderApp();
      return;
    }

    if (k === 'auth') {
      authUiState.loading = true;
      authUiState.error = '';
      authUiState.successMessage = '';
      authUiState.email = (v.email || '').trim();
      authUiState.password = v.password || '';
      renderApp();

      if (authUiState.mode === 'signup') {
        authService.signUp(authUiState.email, authUiState.password)
          .then((res) => {
            authUiState.loading = false;
            if (res.requiresConfirmation) {
              authUiState.successMessage = '✉️ Account created! Please check your email inbox to confirm your address before logging in.';
              authUiState.password = '';
            } else {
              authUiState.successMessage = '✓ Account created and signed in!';
              authUiState.email = '';
              authUiState.password = '';
              location.hash = '';
            }
            renderApp();
            say('Account sign up request completed.');
          })
          .catch((err) => {
            authUiState.loading = false;
            authUiState.error = err.message || 'Failed to create account.';
            renderApp();
            say('Sign up error: ' + authUiState.error);
          });
      } else {
        authService.signIn(authUiState.email, authUiState.password)
          .then(() => {
            authUiState.loading = false;
            authUiState.email = '';
            authUiState.password = '';
            location.hash = '';
            renderApp();
            say('Signed in successfully.');
          })
          .catch((err) => {
            authUiState.loading = false;
            authUiState.error = err.message || 'Failed to sign in.';
            renderApp();
            say('Sign in error: ' + authUiState.error);
          });
      }
      return;
    }

    if (k === 'asg') {
      uiState.draft = { ...v };
      uiState.errs = {};
      const t = v.title.trim();

      if (!t) uiState.errs.title = 'Enter a title.';
      else if (t.length > 160) uiState.errs.title = 'Use 160 characters or fewer.';

      if (!state.subjects.some(s => s.id == v.subject_id)) {
        uiState.errs.subject_id = 'Choose a subject.';
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(v.due_date) || isNaN(new Date(v.due_date))) {
        uiState.errs.due_date = 'Enter a valid due date.';
      }

      for (const u of ['coursera_url', 'resource_url']) {
        if (v[u].trim() && !okUrl(v[u].trim())) {
          uiState.errs[u] = 'Enter a link starting with http:// or https://.';
        }
      }

      if (Object.keys(uiState.errs).length) {
        renderApp();
        say('Fix the highlighted fields.');
        const x = document.querySelector('.err');
        if (x && x.previousElementSibling) x.previousElementSibling.focus();
        return;
      }

      const rec = {
        title: t,
        subject_id: +v.subject_id,
        due_date: v.due_date,
        status: v.status,
        notes: v.notes,
        description: v.description,
        coursera_url: v.coursera_url.trim(),
        resource_url: v.resource_url.trim()
      };

      let a;
      if (form.dataset.id) {
        a = state.assignments.find(x => x.id == form.dataset.id);
        Object.assign(a, rec);
      } else {
        a = { id: state.next++, ...rec };
        state.assignments.push(a);
      }

      saveState();
      say('Assignment saved.');
      goBack(a);
      return;
    }

    if (k === 'link') {
      const err = document.getElementById('lerr');
      if (!v.label.trim() || !okUrl(v.url)) {
        if (err) err.textContent = 'Enter a label and an http(s) URL.';
        return;
      }
      state.links.push({ id: state.next++, label: v.label.trim(), url: v.url });
      saveState();
      renderApp();
    }
  });

  // Drag and drop
  document.addEventListener('dragstart', (e) => {
    const handle = e.target.closest && e.target.closest('[data-drag]');
    if (!handle) return;
    const row = handle.closest('.prow');
    dragId = row.dataset.prow;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    try {
      e.dataTransfer.setDragImage(row, 10, 10);
    } catch {}
    row.classList.add('drag');
  });

  document.addEventListener('dragover', (e) => {
    const row = e.target.closest && e.target.closest('.prow');
    if (!dragId || !row) return;
    e.preventDefault();
    const after = e.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
    document.querySelectorAll('.prow.over, .prow.overb').forEach(r => r.classList.remove('over', 'overb'));
    if (row.dataset.prow !== dragId) {
      row.classList.add(after ? 'overb' : 'over');
    }
  });

  document.addEventListener('drop', (e) => {
    const row = e.target.closest && e.target.closest('.prow');
    if (!dragId || !row) return;
    e.preventDefault();
    const state = getState();
    const s = state.subjects.find(sub => sub.id == row.dataset.sid);
    const after = e.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
    reorderProperties(s, dragId, row.dataset.prow, after);
    dragId = '';
    renderApp();
    say('Property moved.');
  });

  document.addEventListener('dragend', () => {
    dragId = '';
    clearDragClasses();
  });

  // Accessible keyboard navigation
  window.addEventListener('keydown', (e) => {
    const handle = e.target.closest && e.target.closest('[data-drag]');
    if (handle && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const state = getState();
      const row = handle.closest('.prow');
      const s = state.subjects.find(sub => sub.id == row.dataset.sid);
      const i = s.props.findIndex(p => p.id === row.dataset.prow);
      const j = i + (e.key === 'ArrowUp' ? -1 : 1);
      if (j < 0 || j >= s.props.length) return;
      const [moved] = s.props.splice(i, 1);
      s.props.splice(j, 0, moved);
      saveState();
      renderApp();
      const newHandle = document.querySelector(`[data-prow="${moved.id}"] .dh`);
      if (newHandle) newHandle.focus();
      say('Moved property to position ' + (j + 1));
    }

    const el = e.target;
    if (e.key === 'Enter' && el.dataset && el.dataset.ent === 'optadd') {
      e.preventDefault();
      const state = getState();
      const s = state.subjects.find(sub => sub.id == el.dataset.id);
      const p = s && s.props.find(x => x.id === el.dataset.pid);
      const v = el.value.trim();
      if (p && v && !(p.options || []).includes(v)) {
        p.options = p.options || [];
        p.options.push(v);
        saveState();
        uiState.focusO = p.id;
        renderApp();
      }
    }

    if (e.key === 'Escape' && uiState.tmenu) {
      uiState.tmenu = '';
      renderApp();
    }

    if (e.key === 'Escape' && (uiState.menu || uiState.confirmId)) {
      uiState.menu = '';
      uiState.confirmId = '';
      renderApp();
    }
  });

  // Routing changes
  window.addEventListener('hashchange', () => {
    window.scrollTo(0, 0);
    uiState.arm = '';
    uiState.menu = '';
    renderApp();
  });
}
