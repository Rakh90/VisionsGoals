import { route, startRouter, navigateTo, goBack } from './router.js';
import { getHouse, getClient } from './storage.js';
import { renderHouses } from './views/houses.js';
import { renderClientsList, renderClientDetail } from './views/client.js';
import { renderCalendar } from './views/calendar.js';
import { renderSummary } from './views/summary.js';
import { escapeHtml } from './utils.js';

const app = document.getElementById('app');
const backBtn = document.getElementById('back-btn');
const breadcrumb = document.getElementById('breadcrumb');
const tabbar = document.getElementById('tabbar');

function setHeader({ showBack = false, crumbs = [], activeTab = 'dashboard' }) {
  backBtn.classList.toggle('hidden', !showBack);
  breadcrumb.innerHTML = crumbs
    .map((c, i) => (i === crumbs.length - 1 ? `<strong>${escapeHtml(c)}</strong>` : escapeHtml(c)))
    .join(' &rsaquo; ');
  tabbar.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });
  window.scrollTo({ top: 0 });
}

backBtn.addEventListener('click', goBack);
tabbar.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === 'dashboard') navigateTo('/');
    if (tab === 'calendar') navigateTo('/calendar');
    if (tab === 'summary') navigateTo('/summary');
  });
});

route('/', () => {
  setHeader({ showBack: false, crumbs: ['Facilities'], activeTab: 'dashboard' });
  renderHouses(app);
});

route('/house/:houseId', ({ houseId }) => {
  const house = getHouse(houseId);
  setHeader({ showBack: true, crumbs: ['Facilities', house ? house.name : ''], activeTab: 'dashboard' });
  renderClientsList(app, houseId);
});

route('/house/:houseId/client/:clientId', ({ houseId, clientId }) => {
  const house = getHouse(houseId);
  const client = getClient(clientId);
  setHeader({
    showBack: true,
    crumbs: ['Facilities', house ? house.name : '', client ? client.initials : ''],
    activeTab: 'dashboard',
  });
  renderClientDetail(app, houseId, clientId);
});

route('/calendar', () => {
  setHeader({ showBack: false, crumbs: ['Calendar'], activeTab: 'calendar' });
  renderCalendar(app);
});

route('/summary', () => {
  setHeader({ showBack: false, crumbs: ['Weekly Summary'], activeTab: 'summary' });
  renderSummary(app);
});

startRouter();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
