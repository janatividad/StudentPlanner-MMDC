import { esc } from '../utils/helpers.js';

export function renderNotePage(state, id, options = {}) {
  const { arm = '' } = options;
  const p = state.pages.find(x => x.id == id);
  if (!p) return '<h1>Page not found</h1>';

  return `
    <div class="row">
      <input data-ent="page" data-id="${p.id}" data-f="icon" value="${esc(p.icon)}" maxlength="4" aria-label="Icon" style="width:64px;font-size:28px;text-align:center">
      <input class="title" data-ent="page" data-id="${p.id}" data-f="title" value="${esc(p.title)}" placeholder="Untitled" aria-label="Page title" style="flex:1 1 200px;width:auto">
    </div>
    <textarea rows="16" data-ent="page" data-id="${p.id}" data-f="body" placeholder="Write something, plan a space, or paste notes" style="margin-top:12px">${esc(p.body)}</textarea>
    <p style="margin-top:24px">
      <button class="ghost" data-act="delpage" data-id="${p.id}">
        ${arm === 'g' + p.id ? 'Confirm delete page' : 'Delete page'}
      </button>
    </p>
  `;
}
