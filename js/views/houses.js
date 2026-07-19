import { getHouses, getClients } from '../storage.js';
import { navigateTo } from '../router.js';
import { escapeHtml } from '../utils.js';

export function renderHouses(container) {
  const houses = getHouses();

  container.innerHTML = `
    <h1 class="screen-title">Facilities</h1>
    <p class="screen-sub">Select a house to view its clients.</p>
    <div class="grid" id="house-grid"></div>
  `;

  const grid = container.querySelector('#house-grid');
  grid.innerHTML = houses
    .map((h) => {
      const count = getClients(h.id).length;
      return `
        <div class="card" data-id="${h.id}">
          <div class="card-icon">&#127968;</div>
          <div class="card-title">${escapeHtml(h.name)}</div>
          <div class="card-meta">${count} client${count === 1 ? '' : 's'}</div>
        </div>
      `;
    })
    .join('');

  grid.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('click', () => {
      navigateTo(`/house/${card.dataset.id}`);
    });
  });
}
