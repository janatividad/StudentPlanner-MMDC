import { esc } from '../utils/helpers.js';
import { authService } from '../auth/authService.js';
import { getActiveProjects, getActivePages } from '../state.js';

export function renderSidebar(state, options = {}) {
  const { menu = '' } = options;
  const h = location.hash.slice(1);
  const cur = x => (h === x ? ' aria-current="page"' : '');
  const user = authService.getUser();
  const activeProjects = getActiveProjects();
  const activePages = getActivePages();

  const sideEl = document.getElementById('side');
  if (!sideEl) return;

  sideEl.hidden = !state.side;

  sideEl.innerHTML = `
    <div class="st">
      <span class="meta" style="padding-left:8px">Study Planner</span>
      <button class="ghost" data-act="side" aria-label="Hide sidebar" style="min-height:36px">«</button>
    </div>
    <a class="si" href="#"${cur('')}>🏠 Home</a>

    <div class="sh">
      <span>Projects</span>
      <button data-act="addproj" aria-label="New project">+</button>
    </div>
    ${activeProjects.map(p => `
      <div class="pr">
        <a class="si" href="#project-${p.id}"${cur('project-' + p.id)}>
          ${esc(p.icon) || '📚'} ${esc(p.name) || 'Untitled'}
        </a>
        <button class="dots" data-act="menu" data-id="${p.id}" aria-label="Project options" aria-haspopup="menu" aria-expanded="${menu == p.id}">⋯</button>
        ${menu == p.id ? `
          <div class="menu" role="menu">
            <a class="si" role="menuitem" href="${location.href.split('#')[0]}#project-${p.id}" target="_blank" rel="noopener">Open in new tab</a>
            <button class="si dg" role="menuitem" data-act="delproj" data-id="${p.id}">Delete project</button>
          </div>
        ` : ''}
      </div>
    `).join('') || '<div class="meta" style="padding:0 8px">No projects yet.</div>'}

    <div class="sh" style="margin-top: 16px;">
      <span>Pages & Notes</span>
      <button data-act="addpage" aria-label="New page">+</button>
    </div>
    ${activePages.map(pg => `
      <div class="pr">
        <a class="si" href="#page-${pg.id}"${cur('page-' + pg.id)}>
          ${esc(pg.icon) || '📄'} ${esc(pg.title) || 'Untitled'}
        </a>
      </div>
    `).join('') || '<div class="meta" style="padding:0 8px">No pages yet.</div>'}

    <div class="sh" style="margin-top: 24px;">
      <span>Account</span>
    </div>
    ${user ? `
      <a class="si" href="#auth"${cur('auth')} title="${esc(user.email)}">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">👤 ${esc(user.email)}</span>
      </a>
      <button class="si" data-act="signout" style="color: var(--muted); font-size: 13px;">Sign out</button>
    ` : `
      <a class="si" href="#auth"${cur('auth')}>
        🔑 Sign In / Sign Up
      </a>
    `}
  `;
}
