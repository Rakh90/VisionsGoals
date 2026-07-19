import { uid, todayISO } from './utils.js';

const DB_KEY = 'visions-tracking-db-v1';

const DEFAULT_HOUSES = ['House 1', 'House 2', 'House 3', 'House 4', 'House 6'].map((name) => ({
  id: uid(),
  name,
}));

function defaultDb() {
  return {
    version: 1,
    houses: DEFAULT_HOUSES,
    clients: [],       // { id, houseId, initials, createdAt }
    goals: [],          // { id, clientId, number, description, schedule: AM|PM|Both, createdAt }
    goalLogs: [],        // { id, goalId, date, status: completed|not_completed, updatedAt }
    behaviorEntries: [],  // { id, clientId, type: behavior|ir, date, time, description, duration, createdAt }
  };
}

let db = load();

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return defaultDb();
    const parsed = JSON.parse(raw);
    if (!parsed.houses || !parsed.houses.length) return defaultDb();
    return parsed;
  } catch (e) {
    console.error('Failed to load Visions Tracking data, starting fresh.', e);
    return defaultDb();
  }
}

function persist() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/* ---------------------------------------------------------------------- */
/* Houses */
/* ---------------------------------------------------------------------- */

export function getHouses() {
  return [...db.houses];
}

export function getHouse(id) {
  return db.houses.find((h) => h.id === id) || null;
}

/* ---------------------------------------------------------------------- */
/* Clients */
/* ---------------------------------------------------------------------- */

export function getClients(houseId) {
  return db.clients
    .filter((c) => c.houseId === houseId)
    .sort((a, b) => a.initials.localeCompare(b.initials));
}

export function getClient(id) {
  return db.clients.find((c) => c.id === id) || null;
}

export function createClient(houseId, initials) {
  const client = { id: uid(), houseId, initials: initials.trim().toUpperCase(), createdAt: Date.now() };
  db.clients.push(client);
  persist();
  return client;
}

export function updateClient(id, initials) {
  const c = getClient(id);
  if (!c) return null;
  c.initials = initials.trim().toUpperCase();
  persist();
  return c;
}

export function deleteClient(id) {
  db.clients = db.clients.filter((c) => c.id !== id);
  const goalIds = db.goals.filter((g) => g.clientId === id).map((g) => g.id);
  db.goals = db.goals.filter((g) => g.clientId !== id);
  db.goalLogs = db.goalLogs.filter((l) => !goalIds.includes(l.goalId));
  db.behaviorEntries = db.behaviorEntries.filter((b) => b.clientId !== id);
  persist();
}

/* ---------------------------------------------------------------------- */
/* Goals */
/* ---------------------------------------------------------------------- */

export function getGoals(clientId) {
  return db.goals
    .filter((g) => g.clientId === clientId)
    .sort((a, b) => (a.number || '').localeCompare(b.number || '', undefined, { numeric: true }));
}

export function getGoal(id) {
  return db.goals.find((g) => g.id === id) || null;
}

export function createGoal(clientId, { number, description, schedule }) {
  const goal = { id: uid(), clientId, number: number.trim(), description: description.trim(), schedule, createdAt: Date.now() };
  db.goals.push(goal);
  persist();
  return goal;
}

export function updateGoal(id, { number, description, schedule }) {
  const g = getGoal(id);
  if (!g) return null;
  g.number = number.trim();
  g.description = description.trim();
  g.schedule = schedule;
  persist();
  return g;
}

export function deleteGoal(id) {
  db.goals = db.goals.filter((g) => g.id !== id);
  db.goalLogs = db.goalLogs.filter((l) => l.goalId !== id);
  persist();
}

/* ---------------------------------------------------------------------- */
/* Goal completion logs (one status per goal per day) */
/* ---------------------------------------------------------------------- */

export function getGoalLog(goalId, date = todayISO()) {
  return db.goalLogs.find((l) => l.goalId === goalId && l.date === date) || null;
}

export function getGoalLogsForGoal(goalId) {
  return db.goalLogs.filter((l) => l.goalId === goalId);
}

export function getAllGoalLogs() {
  return [...db.goalLogs];
}

/** Sets/toggles a goal's status for a given day. Passing the same status again clears it. */
export function setGoalStatus(goalId, status, date = todayISO()) {
  const existing = getGoalLog(goalId, date);
  if (existing) {
    if (existing.status === status) {
      db.goalLogs = db.goalLogs.filter((l) => l.id !== existing.id);
      persist();
      return null;
    }
    existing.status = status;
    existing.updatedAt = Date.now();
    persist();
    return existing;
  }
  const entry = { id: uid(), goalId, date, status, updatedAt: Date.now() };
  db.goalLogs.push(entry);
  persist();
  return entry;
}

/* ---------------------------------------------------------------------- */
/* Behavior / IR entries */
/* ---------------------------------------------------------------------- */

export function getBehaviorEntries(clientId, type) {
  return db.behaviorEntries
    .filter((b) => b.clientId === clientId && (!type || b.type === type))
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

export function getBehaviorEntry(id) {
  return db.behaviorEntries.find((b) => b.id === id) || null;
}

export function createBehaviorEntry(clientId, type, { date, time, description, duration }) {
  const entry = { id: uid(), clientId, type, date, time, description: description.trim(), duration, createdAt: Date.now() };
  db.behaviorEntries.push(entry);
  persist();
  return entry;
}

export function updateBehaviorEntry(id, { date, time, description, duration }) {
  const e = getBehaviorEntry(id);
  if (!e) return null;
  e.date = date;
  e.time = time;
  e.description = description.trim();
  e.duration = duration;
  persist();
  return e;
}

export function deleteBehaviorEntry(id) {
  db.behaviorEntries = db.behaviorEntries.filter((b) => b.id !== id);
  persist();
}

/* ---------------------------------------------------------------------- */
/* Aggregate helpers for calendar / summary views */
/* ---------------------------------------------------------------------- */

export function getGoalWithContext(goalId) {
  const goal = getGoal(goalId);
  if (!goal) return null;
  const client = getClient(goal.clientId);
  const house = client ? getHouse(client.houseId) : null;
  return { goal, client, house };
}
