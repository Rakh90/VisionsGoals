import { getHouses, getClients, getAllGoalLogs, getGoalWithContext } from '../storage.js';
import { escapeHtml, weekRange, isoInRange, isoFromDate, formatDateShort } from '../utils.js';

let weekAnchor = new Date();
let filterHouseId = '';
let filterClientId = '';

export function renderSummary(container) {
  const houses = getHouses();
  const clientsForHouse = filterHouseId ? getClients(filterHouseId) : [];
  const { start, end } = weekRange(weekAnchor);

  container.innerHTML = `
    <h1 class="screen-title">Weekly Summary</h1>
    <p class="screen-sub">Goal performance analysis for the selected week.</p>

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
      <div class="week-range" style="margin:0;">${formatDateShort(isoFromDate(start))} &ndash; ${formatDateShort(isoFromDate(end))}</div>
      <div class="cal-nav">
        <button class="icon-btn" id="prev-week" style="width:36px;height:36px;">&#8592;</button>
        <button class="icon-btn" id="next-week" style="width:36px;height:36px;">&#8594;</button>
      </div>
    </div>

    <div id="summary-body"></div>
  `;

  container.querySelector('#house-filter').addEventListener('change', (e) => {
    filterHouseId = e.target.value;
    filterClientId = '';
    renderSummary(container);
  });
  container.querySelector('#client-filter').addEventListener('change', (e) => {
    filterClientId = e.target.value;
    renderSummary(container);
  });
  container.querySelector('#prev-week').addEventListener('click', () => {
    weekAnchor = new Date(start);
    weekAnchor.setDate(weekAnchor.getDate() - 7);
    renderSummary(container);
  });
  container.querySelector('#next-week').addEventListener('click', () => {
    weekAnchor = new Date(start);
    weekAnchor.setDate(weekAnchor.getDate() + 7);
    renderSummary(container);
  });

  renderBody(container, start, end);
}

function statusFor(rate) {
  if (rate === null) return 'nodata';
  if (rate >= 0.7) return 'ontrack';
  if (rate >= 0.4) return 'watch';
  return 'struggling';
}

const STATUS_LABEL = { ontrack: 'On Track', watch: 'Needs Attention', struggling: 'Struggling', nodata: 'No Data' };
const STATUS_NOTE = {
  ontrack: (c, t) => `Completed ${c} of ${t} logged sessions this week — trending well.`,
  watch: (c, t) => `Completed ${c} of ${t} logged sessions this week — keep an eye on this one.`,
  struggling: (c, t) => `Completed ${c} of ${t} logged sessions this week — needs additional support.`,
  nodata: () => `No check-ins recorded yet this week.`,
};

function renderBody(container, start, end) {
  const mount = container.querySelector('#summary-body');
  const logs = getAllGoalLogs().filter((l) => isoInRange(l.date, start, end));

  const byGoal = {};
  logs.forEach((log) => {
    const ctx = getGoalWithContext(log.goalId);
    if (!ctx || !ctx.client || !ctx.house) return;
    if (filterHouseId && ctx.house.id !== filterHouseId) return;
    if (filterClientId && ctx.client.id !== filterClientId) return;
    (byGoal[log.goalId] ||= { ctx, completed: 0, total: 0 });
    byGoal[log.goalId].total += 1;
    if (log.status === 'completed') byGoal[log.goalId].completed += 1;
  });

  const rows = Object.values(byGoal).map(({ ctx, completed, total }) => {
    const rate = total > 0 ? completed / total : null;
    const status = statusFor(rate);
    return { ctx, completed, total, rate, status };
  });

  const order = { struggling: 0, watch: 1, ontrack: 2, nodata: 3 };
  rows.sort((a, b) => order[a.status] - order[b.status] || (b.total - a.total));

  const counts = { ontrack: 0, watch: 0, struggling: 0 };
  rows.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status] += 1; });

  const statStrip = `
    <div class="stat-strip">
      <div class="stat-box green"><div class="num">${counts.ontrack}</div><div class="lbl">On Track</div></div>
      <div class="stat-box amber"><div class="num">${counts.watch}</div><div class="lbl">Needs Attention</div></div>
      <div class="stat-box red"><div class="num">${counts.struggling}</div><div class="lbl">Struggling</div></div>
    </div>`;

  if (!rows.length) {
    mount.innerHTML = statStrip + `
      <div class="empty-state">
        <div class="glyph">&#128202;</div>
        No goal check-ins recorded for this week yet.
      </div>`;
    return;
  }

  mount.innerHTML = statStrip + rows
    .map(({ ctx, completed, total, rate, status }) => `
      <div class="summary-card">
        <div class="summary-top">
          <div>
            <div class="summary-goal">${escapeHtml(ctx.goal.description)}</div>
            <div class="summary-loc">${escapeHtml(ctx.house.name)} &middot; ${escapeHtml(ctx.client.initials)} &middot; Goal ${escapeHtml(ctx.goal.number)}</div>
          </div>
          <span class="status-pill ${status}">${STATUS_LABEL[status]}</span>
        </div>
        <div class="progress-track"><div class="progress-fill ${status}" style="width:${rate === null ? 0 : Math.round(rate * 100)}%"></div></div>
        <div class="summary-note">${STATUS_NOTE[status](completed, total)}</div>
      </div>
    `)
    .join('');
}
