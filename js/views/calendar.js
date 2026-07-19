import { getHouses, getClients, getAllGoalLogs, getGoalWithContext } from '../storage.js';
import { escapeHtml, isoFromDate, pad2, formatDateLong } from '../utils.js';

let viewMonth = new Date().getMonth();
let viewYear = new Date().getFullYear();
let filterHouseId = '';
let filterClientId = '';
let selectedDateIso = null;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function renderCalendar(container) {
  const houses = getHouses();
  const clientsForHouse = filterHouseId ? getClients(filterHouseId) : [];

  container.innerHTML = `
    <h1 class="screen-title">Calendar</h1>
    <p class="screen-sub">Goal completion history across facilities.</p>

    <div class="filters-row">
      <select class="select" id="house-filter">
        <option value="">All Facilities</option>
        ${houses.map((h) => `<option value="${h.id}" ${filterHouseId === h.id ? 'selected' : ''}>${escapeHtml(h.name)}</option>`).join('')}
      </select>
      <select class="select" id="client-filter" ${filterHouseId ? '' : 'disabled'}>
        <option value="">All Clients</option>
        ${clientsForHouse.map((c) => `<option value="${c.id}" ${filterClientId === c.id ? 'selected' : ''}>${escapeHtml(c.initials)}</option>`).join('')}
      </select>
    </div>

    <div class="cal-header">
      <div class="cal-title">${MONTH_NAMES[viewMonth]} ${viewYear}</div>
      <div class="cal-nav">
        <button class="icon-btn" id="prev-month" style="width:36px;height:36px;">&#8592;</button>
        <button class="icon-btn" id="next-month" style="width:36px;height:36px;">&#8594;</button>
      </div>
    </div>

    <div class="cal-grid" id="cal-grid"></div>
    <div id="day-detail" class="day-detail-list"></div>
  `;

  container.querySelector('#house-filter').addEventListener('change', (e) => {
    filterHouseId = e.target.value;
    filterClientId = '';
    selectedDateIso = null;
    renderCalendar(container);
  });
  container.querySelector('#client-filter').addEventListener('change', (e) => {
    filterClientId = e.target.value;
    selectedDateIso = null;
    renderCalendar(container);
  });
  container.querySelector('#prev-month').addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderCalendar(container);
  });
  container.querySelector('#next-month').addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderCalendar(container);
  });

  renderGrid(container);
  if (selectedDateIso) renderDayDetail(container, selectedDateIso);
}

function matchesFilters(ctx) {
  if (!ctx || !ctx.client || !ctx.house) return false;
  if (filterHouseId && ctx.house.id !== filterHouseId) return false;
  if (filterClientId && ctx.client.id !== filterClientId) return false;
  return true;
}

function renderGrid(container) {
  const grid = container.querySelector('#cal-grid');
  const logs = getAllGoalLogs();

  const byDate = {};
  logs.forEach((log) => {
    const ctx = getGoalWithContext(log.goalId);
    if (!matchesFilters(ctx)) return;
    (byDate[log.date] ||= []).push({ log, ctx });
  });

  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = isoFromDate(new Date());

  let cells = DOW.map((d) => `<div class="cal-dow">${d}</div>`).join('');

  for (let i = 0; i < startOffset; i++) {
    cells += `<div class="cal-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
    const dayLogs = byDate[iso] || [];
    const hasGreen = dayLogs.some((x) => x.log.status === 'completed');
    const hasRed = dayLogs.some((x) => x.log.status === 'not_completed');
    const isToday = iso === todayIso;
    cells += `
      <div class="cal-day ${isToday ? 'today' : ''}" data-date="${iso}">
        <span>${day}</span>
        <span class="cal-dots">
          ${hasGreen ? '<span class="cal-dot green"></span>' : ''}
          ${hasRed ? '<span class="cal-dot red"></span>' : ''}
        </span>
      </div>`;
  }

  grid.innerHTML = cells;

  grid.querySelectorAll('.cal-day[data-date]').forEach((el) => {
    el.addEventListener('click', () => {
      selectedDateIso = el.dataset.date;
      renderDayDetail(container, selectedDateIso);
    });
  });
}

function renderDayDetail(container, iso) {
  const mount = container.querySelector('#day-detail');
  const logs = getAllGoalLogs().filter((l) => l.date === iso);
  const items = logs
    .map((log) => ({ log, ctx: getGoalWithContext(log.goalId) }))
    .filter((x) => matchesFilters(x.ctx));

  if (!items.length) {
    mount.innerHTML = `<div class="empty-state">No goal activity recorded on ${formatDateLong(iso)}.</div>`;
    return;
  }

  mount.innerHTML = `
    <div class="modal-sub" style="margin-top:6px;">${formatDateLong(iso)}</div>
    ${items
      .map(
        ({ log, ctx }) => `
      <div class="day-detail-item">
        <span class="status-dot ${log.status === 'completed' ? 'green' : 'red'}"></span>
        <span style="flex:1;margin:0 10px;">
          <strong>${escapeHtml(ctx.house.name)}</strong> &middot; ${escapeHtml(ctx.client.initials)} &middot; ${escapeHtml(ctx.goal.description)}
        </span>
        <span class="tag">${log.status === 'completed' ? 'Completed' : 'Not Completed'}</span>
      </div>`
      )
      .join('')}
  `;
}
