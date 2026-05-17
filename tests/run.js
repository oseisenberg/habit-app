// Headless test harness for app.js scheduling / auto-complete logic.
// Loads app.js in a vm sandbox with stubbed DOM/storage and a stable
// settings record (morningStart:0 so getTodayString never rolls back),
// then exercises the pure scheduling functions.
//
// Run: node tests/run.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- recursive no-op DOM element proxy -------------------------------
function makeEl() {
  const el = {
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {}, dataset: {}, value: '', checked: false, innerHTML: '', textContent: '',
    addEventListener() {}, removeEventListener() {}, appendChild() {}, removeChild() {},
    setAttribute() {}, removeAttribute() {}, focus() {}, blur() {}, click() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; },
    closest() { return null; }, remove() {}, scrollIntoView() {},
  };
  return el;
}

const localStore = new Map();
const localStorage = {
  getItem: k => (localStore.has(k) ? localStore.get(k) : null),
  setItem: (k, v) => localStore.set(k, String(v)),
  removeItem: k => localStore.delete(k),
  clear: () => localStore.clear(),
};

// Stable settings: morningStart 0 means getEffectiveDate never subtracts
// a day, so getTodayString() == real local calendar date all run long.
localStorage.setItem('habit_settings', JSON.stringify({
  sortMethod: 'default', morningStart: 0, nightStart: 18,
  separateBedtimeSection: false, notificationsEnabled: false,
}));
localStorage.setItem('habits_v3', '[]'); // skip default seeding at load

const documentStub = {
  getElementById: () => makeEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener: () => {},
  removeEventListener: () => {},
  body: makeEl(),
  documentElement: makeEl(),
  visibilityState: 'visible',
};

const sandbox = {
  console,
  Date, Math, JSON, Set, Map, Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {},
  setInterval: () => 0, clearInterval: () => {},
  localStorage,
  document: documentStub,
  navigator: {},
  location: { href: '', pathname: '/' },
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.window.scrollTo = () => {};
sandbox.window.scrollY = 0;
sandbox.window.matchMedia = () => ({ matches: false, addEventListener() {} });

vm.createContext(sandbox);

// default-habits.js defines getDefaultHabits(); load it first so app.js
// has it even though we pre-seed storage (defensive).
const defaults = fs.readFileSync(path.join(__dirname, '..', 'default-habits.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInContext(defaults + '\n' + appSrc, sandbox, { filename: 'app.bundle.js' });

// --- test helpers ----------------------------------------------------
const F = sandbox; // function declarations land on the context
let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; fails.push(name); console.log('  FAIL', name, extra != null ? '-> ' + JSON.stringify(extra) : ''); }
}
function eq(name, got, want) { ok(name, got === want, { got, want }); }

const today = F.getTodayString();
// date string N days from today, via the app's own toDateString
function dayOff(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return F.toDateString(d);
}
function mkHabit(over) {
  return Object.assign({
    id: 1, name: 'H', icon: '✅', timeOfDay: null,
    frequency: { type: 'everyXDays', everyXDays: 2 },
    completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [],
    subtasks: [], createdAt: dayOff(-60), momentumScore: 0, lastScoreUpdate: today,
  }, over);
}
function seed(habits) {
  localStorage.setItem('habits_v3', JSON.stringify(habits));
  F.invalidateHabitsCache(); // loadHabits() memoizes; clear it after seeding
}

console.log('today =', today, '\n');

// === A. everyXDays due cadence ("delay" between appearances) =========
console.log('A. everyXDays(2) due cadence');
{
  const h0 = mkHabit({ completions: [{ date: today }] });
  eq('completed today -> status.due false', F.getCompletionStatus(h0).due, false);
  // isDueToday returns due||completed for everyXDays by design (so a
  // habit done today still occupies its slot as "done"), so it's true.
  eq('completed today -> isDueToday true (by design)', F.isDueToday(h0), true);

  const h1 = mkHabit({ completions: [{ date: dayOff(-1) }] });
  eq('1 day ago -> not due (delay not short)', F.getCompletionStatus(h1).due, false);

  const h2 = mkHabit({ completions: [{ date: dayOff(-2) }] });
  eq('2 days ago -> due (exactly interval)', F.getCompletionStatus(h2).due, true);

  const h3 = mkHabit({ completions: [{ date: dayOff(-3) }] });
  const s3 = F.getCompletionStatus(h3);
  ok('3 days ago -> due & 1 overdue', s3.due === true && s3.daysOverdue === 1, s3);
}

// === B. auto-complete records linked habit with correct delay ========
console.log('\nB. auto-complete delay');
{
  const A = mkHabit({ id: 10, name: 'Shampoo', frequency: { type: 'everyXDays', everyXDays: 2 }, autoCompletes: '20' });
  const B = mkHabit({ id: 20, name: 'Shower', frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [{ date: dayOff(-5) }] });
  const habits = [A, B];
  seed(habits);
  eq('B due before trigger', F.getCompletionStatus(B).due, true);
  F.triggerAutoComplete(habits, A);
  const bC = B.completions.filter(c => c.date === today);
  ok('B got exactly one completion dated today', bC.length === 1, B.completions);
  eq('B completion flagged autoCompleted', !!(bC[0] && bC[0].autoCompleted), true);
  eq('B.autoCompletedToday == today', B.autoCompletedToday, today);
  eq('B no longer due (delay starts today)', F.getCompletionStatus(B).due, false);
  // Delay must be exactly the interval, not off by one:
  eq('B not due +1 day', F.wasHabitDueOnDate(B, dayOff(1)), false);
  eq('B due again +2 days', F.wasHabitDueOnDate(B, dayOff(2)), true);
  // Idempotent: triggering again same day must not double-record.
  F.triggerAutoComplete(habits, A);
  eq('no duplicate completion on re-trigger', B.completions.filter(c => c.date === today).length, 1);
}

// === C. auto-complete when trigger fires more often than target =====
console.log('\nC. daily trigger auto-completing a 3-day target');
{
  const A = mkHabit({ id: 30, name: 'Daily', frequency: { type: 'daily' }, autoCompletes: '40' });
  const B = mkHabit({ id: 40, name: 'Every3', frequency: { type: 'everyXDays', everyXDays: 3 }, completions: [{ date: dayOff(-9) }] });
  const habits = [A, B];
  F.triggerAutoComplete(habits, A);
  // Whether this is desired is a design question; the test documents it.
  const dueNextDay = F.wasHabitDueOnDate(B, dayOff(1));
  console.log('  NOTE B(every3) due the day after a daily auto-complete? ->', dueNextDay,
    '(false means a daily trigger keeps resetting B so it never comes due)');
  ok('C scenario executed', true);
}

// === D. momentum sanity for everyXDays (kept vs missed) =============
console.log('\nD. momentum direction');
{
  const kept = mkHabit({ id: 50, lastScoreUpdate: dayOff(-10), momentumScore: 0,
    completions: [dayOff(-8), dayOff(-6), dayOff(-4), dayOff(-2), today].map(d => ({ date: d })) });
  const missed = mkHabit({ id: 51, lastScoreUpdate: dayOff(-10), momentumScore: 0,
    completions: [{ date: dayOff(-30) }] });
  const ks = F.calculateMomentumScore(kept).raw;
  const ms = F.calculateMomentumScore(missed).raw;
  ok('kept everyXDays momentum >= 0', ks >= 0, ks);
  ok('long-missed everyXDays momentum < 0', ms < 0, ms);
  ok('kept > missed', ks > ms, { ks, ms });
}

// === E. Conflicts tag suppresses on partner-due days ================
console.log('\nE. Conflicts tag (serum hidden on shampoo-due days)');
{
  // Shampoo every 2 days, last done 2 days ago -> due today.
  const shampoo = mkHabit({ id: 60, name: 'Shampoo', frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [{ date: dayOff(-2) }] });
  const serum = mkHabit({ id: 61, name: 'Serum', frequency: { type: 'daily' }, conflictsWith: '60' });
  seed([shampoo, serum]);
  eq('shampoo due today', F.isDueToday(shampoo), true);
  eq('serum suppressed when shampoo due', F.isConflictSuppressed(serum), true);
  eq('serum cannot-do-now when shampoo due', F.canDoNow(serum), false);

  // Shampoo done today is still a "shampoo day" -> serum stays suppressed
  // (don't use serum on a day you did shampoo).
  const shampoo2 = mkHabit({ id: 62, name: 'Shampoo2', frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [{ date: today }] });
  const serum2 = mkHabit({ id: 63, name: 'Serum2', frequency: { type: 'daily' }, conflictsWith: '62' });
  seed([shampoo2, serum2]);
  eq('serum2 still suppressed on the day shampoo was done', F.isConflictSuppressed(serum2), true);

  // No conflict partner set -> never suppressed.
  const lone = mkHabit({ id: 64, name: 'Lone', frequency: { type: 'daily' } });
  seed([lone]);
  eq('habit with no conflictsWith not suppressed', F.isConflictSuppressed(lone), false);
}

// === F. timesPerDay (Daily x N) completion semantics ================
console.log('\nF. timesPerDay completion');
{
  const h = mkHabit({ id: 70, frequency: { type: 'timesPerDay', timesPerDay: 3 },
    completions: [{ date: today }, { date: today }] });
  const s = F.getCompletionStatus(h);
  ok('2/3 today -> not complete, due', s.completed === false && F.isDueToday(h) === true, s);
  const h2 = mkHabit({ id: 71, frequency: { type: 'timesPerDay', timesPerDay: 3 },
    completions: [{ date: today }, { date: today }, { date: today }] });
  eq('3/3 today -> complete', F.getCompletionStatus(h2).completed, true);
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail) { console.log('FAILED:', fails.join(', ')); process.exit(1); }
