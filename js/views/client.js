import {
  getHouse, getClients, getClient, createClient, updateClient, deleteClient,
  getGoals, createGoal, updateGoal, deleteGoal, getGoalLog, setGoalStatus,
  getBehaviorEntries, createBehaviorEntry, updateBehaviorEntry, deleteBehaviorEntry, getBehaviorEntry,
} from '../storage.js';
import { navigateTo } from '../router.js';
import { openModal, openConfirm, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, todayISO, nowTime24, formatDateShort, formatTime12 } from '../utils.js';

/* ---------------------------------------------------------------------- */
/* Clients list (per house)                                               */
/* ---------------------------------------------------------------------- */

export function renderClientsList(container, houseId) {
  const house = getHouse(houseId);
  if (!house) {
    navigateTo('/');
    return;
  }

  container.innerHTML = `
    <h1 class="screen-title">${escapeHtml(house.name)}</h1>
    <p class="screen-sub">Clients in this facility.</p>
    <div class="fab-row">
      <button class="btn btn-primary" id="add-client-btn">+ Client</button>
    </div>
    <div id="client-grid"></div>
  `;

  container.querySelector('#add-client-btn').addEventListener('click', () => openClientForm(houseId));

  renderClientGrid(container.querySelector('#client-grid'), houseId);
}

function renderClientGrid(mount, houseId) {
  const clients = getClients(houseId);

  if (!clients.length) {
    mount.innerHTML = `
      <div class="empty-state">
        <div class="glyph">&#128100;</div>
        No clients yet. Tap <strong>+ Client</strong> to add one.
      </div>`;
    return;
  }

  mount.innerHTML = `<div class="grid">${clients
    .map(
      (c) => `
      <div class="card" data-id="${c.id}">
        <div class="card-actions">
          <button class="icon-btn edit" data-action="edit" title="Edit">&#9998;</button>
          <button class="icon-btn danger" data-action="remove" title="Remove">&#10005;</button>
        </div>
        <div class="card-icon">&#128100;</div>
        <div class="card-title">${escapeHtml(c.initials)}</div>
        <div class="card-meta">${getGoals(c.id).length} goal${getGoals(c.id).length === 1 ? '' : 's'}</div>
      </div>`
    )
    .join('')}</div>`;

  mount.querySelectorAll('.card').forEach((card) => {
    const id = card.dataset.id;
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      navigateTo(`/house/${houseId}/client/${id}`);
    });
    card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openClientForm(houseId, getClient(id));
    });
    card.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openConfirm({
        title: 'Remove client?',
        message: `This will permanently delete ${escapeHtml(getClient(id).initials)} and all of their goals, behavior, and IR entries.`,
        confirmLabel: 'Remove',
        onConfirm: () => {
          deleteClient(id);
          showToast('Client removed');
          renderClientGrid(mount, houseId);
        },
      });
    });
  });
}

function openClientForm(houseId, existing) {
  const isEdit = !!existing;
  openModal(
    `
    <div class="modal-title">${isEdit ? 'Edit Client' : 'New Client'}</div>
    <div class="modal-sub">Enter the client's initials.</div>
    <form id="client-form">
      <div class="field">
        <label for="initials">Client Initials</label>
        <input class="input" id="initials" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="e.g. J.D." value="${isEdit ? escapeHtml(existing.initials) : ''}" required />
        <div class="field-error" id="initials-error">Please enter initials.</div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-role="cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Add Client'}</button>
      </div>
    </form>
  `,
    (box) => {
      const input = box.querySelector('#initials');
      input.focus();
      box.querySelector('[data-role="cancel"]').addEventListener('click', closeModal);
      box.querySelector('#client-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) {
          box.querySelector('#initials-error').classList.add('show');
          return;
        }
        if (isEdit) {
          updateClient(existing.id, val);
          showToast('Client updated');
        } else {
          createClient(houseId, val);
          showToast('Client added');
        }
        closeModal();
        navigateTo(`/house/${houseId}`);
      });
    }
  );
}

/* ---------------------------------------------------------------------- */
/* Client detail: Goals + Behavior + IR                                   */
/* ---------------------------------------------------------------------- */

export function renderClientDetail(container, houseId, clientId) {
  const house = getHouse(houseId);
  const client = getClient(clientId);
  if (!house || !client) {
    navigateTo('/');
    return;
  }

  container.innerHTML = `
    <h1 class="screen-title">${escapeHtml(client.initials)}</h1>
    <p class="screen-sub">${escapeHtml(house.name)}</p>

    <div class="fab-row">
      <button class="btn btn-primary" id="add-goal-btn">+ Goals</button>
      <button class="btn" id="behavior-btn">&#9888; Behavior</button>
      <button class="btn" id="ir-btn">&#128220; IR</button>
    </div>

    <div id="goals-mount"></div>

    <div class="section-header"><h3>Behavior Log</h3></div>
    <div id="behavior-mount" class="list"></div>

    <div class="section-header"><h3>Incident Reports (IR)</h3></div>
    <div id="ir-mount" class="list"></div>
  `;

  container.querySelector('#add-goal-btn').addEventListener('click', () => openGoalForm(clientId));
  container.querySelector('#behavior-btn').addEventListener('click', () => openBehaviorForm(clientId, 'behavior'));
  container.querySelector('#ir-btn').addEventListener('click', () => openBehaviorForm(clientId, 'ir'));

  renderGoalsList(container.querySelector('#goals-mount'), clientId);
  renderLogList(container.querySelector('#behavior-mount'), clientId, 'behavior');
  renderLogList(container.querySelector('#ir-mount'), clientId, 'ir');
}

/* ---- Goals ---- */

function renderGoalsList(mount, clientId) {
  const goals = getGoals(clientId);

  if (!goals.length) {
    mount.innerHTML = `
      <div class="empty-state">
        <div class="glyph">&#127919;</div>
        No goals yet. Tap <strong>+ Goals</strong> to create one.
      </div>`;
    return;
  }

  const today = todayISO();

  mount.innerHTML = `<div class="list">${goals
    .map((g) => {
      const log = getGoalLog(g.id, today);
      const greenOn = log?.status === 'completed';
      const redOn = log?.status === 'not_completed';
      return `
      <div class="goal-row" data-id="${g.id}">
        <div class="goal-num">${escapeHtml(g.number || '—')}</div>
        <div class="goal-body">
          <div class="goal-desc">${escapeHtml(g.description)}</div>
          <div class="goal-tags"><span class="tag">${escapeHtml(g.schedule)}</span></div>
        </div>
        <div class="lights">
          <button class="light-btn green ${greenOn ? 'on' : ''}" data-action="complete" title="Mark completed"></button>
          <button class="light-btn red ${redOn ? 'on' : ''}" data-action="incomplete" title="Mark not completed"></button>
        </div>
        <div class="goal-actions">
          <button class="icon-btn edit" data-action="edit" title="Edit">&#9998;</button>
          <button class="icon-btn danger" data-action="remove" title="Remove">&#10005;</button>
        </div>
      </div>`;
    })
    .join('')}</div>`;

  mount.querySelectorAll('.goal-row').forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('[data-action="complete"]').addEventListener('click', () => {
      setGoalStatus(id, 'completed', today);
      renderGoalsList(mount, clientId);
    });
    row.querySelector('[data-action="incomplete"]').addEventListener('click', () => {
      setGoalStatus(id, 'not_completed', today);
      renderGoalsList(mount, clientId);
    });
    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openGoalForm(clientId, getGoals(clientId).find((g) => g.id === id));
    });
    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      const goal = getGoals(clientId).find((g) => g.id === id);
      openConfirm({
        title: 'Remove goal?',
        message: `This will permanently delete goal "${escapeHtml(goal.description)}" and its completion history.`,
        confirmLabel: 'Remove',
        onConfirm: () => {
          deleteGoal(id);
          showToast('Goal removed');
          renderGoalsList(mount, clientId);
        },
      });
    });
  });
}

function openGoalForm(clientId, existing) {
  const isEdit = !!existing;
  const schedule = existing?.schedule || 'AM';
  openModal(
    `
    <div class="modal-title">${isEdit ? 'Edit Goal' : 'New Goal'}</div>
    <div class="modal-sub">Define the goal details.</div>
    <form id="goal-form">
      <div class="field">
        <label for="goal-number">Goal Number</label>
        <input class="input" id="goal-number" placeholder="e.g. 1" value="${isEdit ? escapeHtml(existing.number) : ''}" required />
      </div>
      <div class="field">
        <label for="goal-desc">Goal Description</label>
        <textarea class="textarea" id="goal-desc" placeholder="Describe the goal..." required>${isEdit ? escapeHtml(existing.description) : ''}</textarea>
      </div>
      <div class="field">
        <label>Schedule</label>
        <div class="segmented" id="schedule-toggle">
          <button type="button" data-value="AM" class="${schedule === 'AM' ? 'active' : ''}">AM</button>
          <button type="button" data-value="PM" class="${schedule === 'PM' ? 'active' : ''}">PM</button>
          <button type="button" data-value="Both" class="${schedule === 'Both' ? 'active' : ''}">Both</button>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-role="cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Add Goal'}</button>
      </div>
    </form>
  `,
    (box) => {
      let selectedSchedule = schedule;
      box.querySelector('[data-role="cancel"]').addEventListener('click', closeModal);
      box.querySelectorAll('#schedule-toggle button').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedSchedule = btn.dataset.value;
          box.querySelectorAll('#schedule-toggle button').forEach((b) => b.classList.toggle('active', b === btn));
        });
      });
      box.querySelector('#goal-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const number = box.querySelector('#goal-number').value;
        const description = box.querySelector('#goal-desc').value;
        if (!number.trim() || !description.trim()) return;
        const payload = { number, description, schedule: selectedSchedule };
        if (isEdit) {
          updateGoal(existing.id, payload);
          showToast('Goal updated');
        } else {
          createGoal(clientId, payload);
          showToast('Goal added');
        }
        closeModal();
        renderClientDetail(document.getElementById('app'), getClient(clientId).houseId, clientId);
      });
    }
  );
}

/* ---- Behavior / IR ---- */

function renderLogList(mount, clientId, type) {
  const entries = getBehaviorEntries(clientId, type);

  if (!entries.length) {
    mount.innerHTML = `<div class="empty-state" style="padding:24px;">No ${type === 'ir' ? 'incident reports' : 'behavior entries'} logged yet.</div>`;
    return;
  }

  mount.innerHTML = entries
    .map(
      (e) => `
    <div class="log-entry" data-id="${e.id}">
      <span class="log-badge ${type}">${type === 'ir' ? 'IR' : 'Behavior'}</span>
      <div class="log-body">
        <div class="log-meta">${formatDateShort(e.date)} &middot; ${formatTime12(e.time)} &middot; ${e.duration ? `${e.duration} min` : 'no duration'}</div>
        <div class="log-desc">${escapeHtml(e.description)}</div>
      </div>
      <div class="log-actions">
        <button class="icon-btn edit" data-action="edit" title="Edit">&#9998;</button>
        <button class="icon-btn danger" data-action="remove" title="Remove">&#10005;</button>
      </div>
    </div>`
    )
    .join('');

  mount.querySelectorAll('.log-entry').forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openBehaviorForm(clientId, type, getBehaviorEntry(id));
    });
    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      openConfirm({
        title: `Remove ${type === 'ir' ? 'incident report' : 'behavior entry'}?`,
        message: 'This entry will be permanently deleted.',
        confirmLabel: 'Remove',
        onConfirm: () => {
          deleteBehaviorEntry(id);
          showToast('Entry removed');
          renderLogList(mount, clientId, type);
        },
      });
    });
  });
}

function openBehaviorForm(clientId, type, existing) {
  const isEdit = !!existing;
  const label = type === 'ir' ? 'Incident Report' : 'Behavior';
  openModal(
    `
    <div class="modal-title">${isEdit ? `Edit ${label}` : `New ${label}`}</div>
    <div class="modal-sub">${type === 'ir' ? 'Document the incident.' : 'Document the observed behavior.'}</div>
    <form id="behavior-form">
      <div class="field">
        <label for="b-date">Date</label>
        <div class="input-with-btn">
          <input class="input" type="date" id="b-date" value="${isEdit ? existing.date : todayISO()}" required />
          <button type="button" id="date-btn" title="Open calendar">&#128197;</button>
        </div>
      </div>
      <div class="field">
        <label for="b-time">Time</label>
        <div class="input-with-btn">
          <input class="input" type="time" id="b-time" value="${isEdit ? existing.time : nowTime24()}" required />
          <button type="button" id="time-btn" title="Open clock">&#128336;</button>
        </div>
      </div>
      <div class="field">
        <label for="b-desc">${label} Description</label>
        <textarea class="textarea" id="b-desc" placeholder="Describe what happened..." required>${isEdit ? escapeHtml(existing.description) : ''}</textarea>
      </div>
      <div class="field">
        <label for="b-duration">Duration (minutes)</label>
        <input class="input" type="number" min="0" step="1" id="b-duration" placeholder="e.g. 15" value="${isEdit && existing.duration != null ? existing.duration : ''}" />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-role="cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Log Entry'}</button>
      </div>
    </form>
  `,
    (box) => {
      box.querySelector('[data-role="cancel"]').addEventListener('click', closeModal);

      const dateInput = box.querySelector('#b-date');
      const timeInput = box.querySelector('#b-time');
      box.querySelector('#date-btn').addEventListener('click', () => {
        if (dateInput.showPicker) dateInput.showPicker();
        else dateInput.focus();
      });
      box.querySelector('#time-btn').addEventListener('click', () => {
        if (timeInput.showPicker) timeInput.showPicker();
        else timeInput.focus();
      });

      box.querySelector('#behavior-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const date = dateInput.value;
        const time = timeInput.value;
        const description = box.querySelector('#b-desc').value;
        const durationRaw = box.querySelector('#b-duration').value;
        const duration = durationRaw === '' ? null : Number(durationRaw);
        if (!date || !time || !description.trim()) return;
        const payload = { date, time, description, duration };
        if (isEdit) {
          updateBehaviorEntry(existing.id, payload);
          showToast(`${label} updated`);
        } else {
          createBehaviorEntry(clientId, type, payload);
          showToast(`${label} logged`);
        }
        closeModal();
        renderClientDetail(document.getElementById('app'), getClient(clientId).houseId, clientId);
      });
    }
  );
}
