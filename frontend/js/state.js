/**
 * Application State Management & LocalStorage Persistence
 */
import { ST, stOf, DEF, guess, blank, okUrl } from './utils/helpers.js';

const KEY = 'study-planner-mmdc-v3';

let state = null;
let saveFailed = false;

const readStorage = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch {
    return null;
  }
};

export const loadState = () => {
  let s = readStorage(KEY);

  // Migration from older versions if available
  if (!s || !s.subjects) {
    const legacy = readStorage('study-planner-mmdc-v2') || readStorage('study-planner-mmdc-v1');
    if (legacy && legacy.subjects) {
      s = { ...legacy, pages: [] };
      s.assignments = (legacy.assignments || []).map(a => ({
        description: '',
        coursera_url: '',
        ...a,
        status: a.status === 'completed' ? 'done' : a.status === 'pending' ? 'not_started' : a.status
      }));
    } else {
      s = {
        term: '2026–2027 Term 2',
        next: 10,
        subjects: [
          'Cloud Computing',
          'Mobile Development Application (Backend)',
          'System Integration and Architecture',
          'Integrative Programming and Technologies'
        ].map((n, i) => blank(i + 1, n)),
        assignments: [],
        links: [],
        pages: []
      };
    }
  }

  // Ensure default props and structure integrity
  s.subjects.forEach(x => {
    if (!x.props) {
      x.props = DEF.map(([l, f]) => ({
        id: 'p' + Math.random().toString(36).slice(2),
        label: l,
        value: x[f] || ''
      }));
    }
    x.status = stOf(x.status)[0];
    x.props.forEach(p => {
      if (!p.type) p.type = guess(p.label);
    });
  });

  s.pages = s.pages || [];
  s.links = s.links || [];

  if (!s.projects) {
    s.projects = [{ id: 9, name: s.term || '2026–2027 Term 2', icon: '📚' }];
    if (!(s.next > 9)) s.next = 10;
  }

  s.subjects.forEach(x => {
    if (!x.project_id) x.project_id = s.projects[0].id;
  });

  // Sanitize and trim external URLs on loaded records according to HTTP/HTTPS rules
  (s.assignments || []).forEach(a => {
    if (typeof a.coursera_url === 'string') a.coursera_url = a.coursera_url.trim();
    if (typeof a.resource_url === 'string') a.resource_url = a.resource_url.trim();
  });

  (s.links || []).forEach(l => {
    if (typeof l.url === 'string') l.url = l.url.trim();
    if (typeof l.label === 'string') l.label = l.label.trim();
  });

  (s.subjects || []).forEach(subItem => {
    (subItem.props || []).forEach(p => {
      if (p.type === 'url' && typeof p.value === 'string') {
        p.value = p.value.trim();
      }
    });
  });

  if (window.innerWidth < 720) {
    s.side = false;
  } else if (s.side === undefined) {
    s.side = true;
  }

  state = s;
  return state;
};

export const getState = () => {
  if (!state) return loadState();
  return state;
};

export const saveState = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveFailed = false;
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
    saveFailed = true;
  }
};

export const isSaveFailed = () => saveFailed;
