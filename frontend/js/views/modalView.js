import { esc } from '../utils/helpers.js';

export function renderModal(state, confirmProjectId) {
  const modalEl = document.getElementById('modal');
  if (!modalEl) return;

  const p = state.projects.find(x => x.id == confirmProjectId);
  if (!confirmProjectId || !p) {
    modalEl.innerHTML = '';
    return;
  }

  const count = state.subjects.filter(s => s.project_id == p.id).length;

  modalEl.innerHTML = `
    <div class="scrim">
      <div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dt">
        <h2 id="dt" style="margin:0 0 8px">Delete project?</h2>
        <p>“${esc(p.name) || 'Untitled'}”, its ${count} subject(s) and all their assignments will be permanently deleted.</p>
        <div class="row" style="justify-content:flex-end">
          <button id="cx" data-act="cancelmodal">Cancel</button>
          <button class="danger" data-act="delprojok" data-id="${p.id}">Delete project</button>
        </div>
      </div>
    </div>
  `;

  const cancelBtn = document.getElementById('cx');
  if (cancelBtn) cancelBtn.focus();
}
