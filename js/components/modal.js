const root = () => document.getElementById('modal-root');

export function closeModal() {
  root().innerHTML = '';
}

/**
 * Renders a modal from raw inner HTML (the caller owns the .modal-box contents).
 * `onMount(container)` runs after insertion, wiring up form logic and returning
 * an optional cleanup callback triggered on close.
 */
export function openModal(innerHtml, onMount) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${innerHtml}</div>`;
  root().innerHTML = '';
  root().appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const box = overlay.querySelector('.modal-box');
  if (onMount) onMount(box);

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  return () => closeModal();
}

export function openConfirm({ title, message, confirmLabel = 'Delete', danger = true, onConfirm }) {
  openModal(
    `
    <div class="confirm-icon">&#9888;</div>
    <div class="modal-title">${title}</div>
    <div class="modal-sub">${message}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-role="cancel">Cancel</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-role="confirm">${confirmLabel}</button>
    </div>
  `,
    (box) => {
      box.querySelector('[data-role="cancel"]').addEventListener('click', closeModal);
      box.querySelector('[data-role="confirm"]').addEventListener('click', () => {
        onConfirm();
        closeModal();
      });
    }
  );
}
