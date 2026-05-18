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
  requestAnimationFrame: () => 0,
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
// app.js was split into ordered global scripts; concatenate in the same
// order the browser loads them (constants/state → logic → render →
// bootstrap) so the vm sandbox sees an identical single program.
const appSrc = ['app-core.js', 'app-logic.js', 'app-render.js', 'app-bootstrap.js']
    .map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))
    .join('\n');
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

// === B & C. auto-complete tests — DISABLED ===========================
// The auto-complete feature is commented out in app.js (triggerAutoComplete
// is a no-op). These tests are kept commented for future re-enable.
/*
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
*/

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

// === G. No-momentum tag ============================================
console.log('\nG. No-momentum tag');
{
  const m = mkHabit({ id: 80, noMomentum: true, lastScoreUpdate: dayOff(-30),
    completions: [{ date: dayOff(-30) }] }); // long-missed would normally be very negative
  const sd = F.calculateMomentumScore(m);
  ok('no-momentum -> raw 0', sd.raw === 0, sd);
  ok('no-momentum -> display 0', sd.display === 0, sd);
  // Still schedulable like a normal habit (everyXDays cadence intact).
  const m2 = mkHabit({ id: 81, noMomentum: true, completions: [{ date: dayOff(-2) }] });
  eq('no-momentum still due on schedule', F.getCompletionStatus(m2).due, true);
}

// === H. Daily×N post-completion delay (isDelayHidden) ================
console.log('\nH. Daily×N delay-after-completion');
{
  const now = Date.now();
  const HOUR = 3600000;
  // 3×/day, hide 4h after each completion.
  const base = { id: 90, frequency: { type: 'timesPerDay', timesPerDay: 3, delayHours: 4 } };

  // No completions today -> visible.
  eq('no completions -> not hidden',
    F.isDelayHidden(mkHabit({ ...base, completions: [] })), false);

  // Completed 1h ago (within 4h window) -> hidden.
  eq('within delay window -> hidden',
    F.isDelayHidden(mkHabit({ ...base, completions: [{ date: today, timestamp: now - 1 * HOUR }] })), true);

  // Completed 5h ago (delay elapsed) -> visible again.
  eq('after delay elapsed -> not hidden',
    F.isDelayHidden(mkHabit({ ...base, completions: [{ date: today, timestamp: now - 5 * HOUR }] })), false);

  // Daily target met (3/3) -> never hidden (normal Done flow).
  eq('target met -> not hidden',
    F.isDelayHidden(mkHabit({ ...base, completions: [
      { date: today, timestamp: now - 1 * HOUR },
      { date: today, timestamp: now - 1 * HOUR },
      { date: today, timestamp: now - 1 * HOUR },
    ] })), false);

  // delayHours unset -> never hidden (legacy / opt-in only).
  eq('no delayHours -> not hidden',
    F.isDelayHidden(mkHabit({ id: 91, frequency: { type: 'timesPerDay', timesPerDay: 3 },
      completions: [{ date: today, timestamp: now }] })), false);

  // Non-timesPerDay habit -> feature does not apply.
  eq('daily (1x) habit -> not hidden',
    F.isDelayHidden(mkHabit({ id: 92, frequency: { type: 'daily', delayHours: 4 },
      completions: [{ date: today, timestamp: now }] })), false);

  // Optional status param: a passed-in completed status short-circuits
  // to "not hidden" (same result as the internal compute path).
  eq('passed completed status -> not hidden',
    F.isDelayHidden(mkHabit({ ...base, completions: [{ date: today, timestamp: now - 1 * HOUR }] }),
      { completed: true }), false);
}

// === I. auto-complete & linked-habit re-enabled, inactive by default ==
console.log('\nI. auto-complete & linked-habit (re-enabled, opt-in)');
{
  // Inactive by default: both tags start in disabledTags so they don't
  // appear as form pills until enabled in Settings → Tags. (The harness
  // settings record has no disabledTags key, so the default applies.)
  const dt = F.getSettings().disabledTags || [];
  ok('autoComplete disabled by default', dt.includes('autoComplete'), dt);
  ok('linkedHabit disabled by default', dt.includes('linkedHabit'), dt);
  const defs = F.getDefaultHabits();
  eq('no seed habit carries autoCompletes', defs.some(h => 'autoCompletes' in h), false);
  eq('no seed habit carries linkedHabit', defs.some(h => 'linkedHabit' in h), false);

  // triggerAutoComplete works: A(autoCompletes -> 20) marks B done today.
  const A = mkHabit({ id: 10, name: 'Trigger', frequency: { type: 'everyXDays', everyXDays: 2 }, autoCompletes: '20' });
  const B = mkHabit({ id: 20, name: 'Target', frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [{ date: dayOff(-5) }] });
  const arr = [A, B];
  seed(arr);
  F.triggerAutoComplete(arr, A);
  eq('triggerAutoComplete records one completion today', B.completions.filter(c => c.date === today).length, 1);
  eq('triggerAutoComplete flags autoCompletedToday', B.autoCompletedToday, today);
  // Idempotent within the day.
  F.triggerAutoComplete(arr, A);
  eq('triggerAutoComplete is idempotent same day', B.completions.filter(c => c.date === today).length, 1);

  // syncLinkedHabit wires both sides bidirectionally.
  const L1 = mkHabit({ id: 30, linkedHabit: '' });
  const L2 = mkHabit({ id: 31, linkedHabit: '' });
  const larr = [L1, L2];
  F.syncLinkedHabit(larr, 30, '31');
  eq('syncLinkedHabit sets source link', Number(L1.linkedHabit), 31);
  eq('syncLinkedHabit sets partner link back', Number(L2.linkedHabit), 30);
}

// === J. Delay feature extra edges ====================================
console.log('\nJ. Daily×N delay edges');
{
  const HOUR = 3600000, now = Date.now();
  const base = { frequency: { type: 'timesPerDay', timesPerDay: 3, delayHours: 4 } };

  // Exactly at the boundary (elapsed >= window) -> not hidden.
  eq('elapsed == delay window -> not hidden',
    F.isDelayHidden(mkHabit({ id: 40, ...base, completions: [{ date: today, timestamp: now - 4 * HOUR }] })), false);

  // Multiple completions today: the LATEST timestamp decides.
  eq('latest completion still within window -> hidden',
    F.isDelayHidden(mkHabit({ id: 41, ...base, completions: [
      { date: today, timestamp: now - 10 * HOUR }, { date: today, timestamp: now - 1 * HOUR }] })), true);
  eq('latest completion past window -> not hidden',
    F.isDelayHidden(mkHabit({ id: 42, ...base, completions: [
      { date: today, timestamp: now - 10 * HOUR }, { date: today, timestamp: now - 5 * HOUR }] })), false);

  // anyDelayPending() reflects seeded state.
  ok('anyDelayPending is a function', typeof F.anyDelayPending === 'function');
  seed([mkHabit({ id: 43, ...base, completions: [{ date: today, timestamp: now - 1 * HOUR }] })]);
  eq('anyDelayPending true when a habit is hidden', F.anyDelayPending(), true);
  seed([mkHabit({ id: 44, frequency: { type: 'daily' } })]);
  eq('anyDelayPending false with no delay habits', F.anyDelayPending(), false);
}

// === K. categorizeHabits integration =================================
console.log('\nK. categorizeHabits buckets');
{
  const allIds = c => new Set([...c.now, ...c.optional, ...c.later, ...c.done].map(h => h.id));

  // A plain due daily habit is visible in the Now bucket.
  const daily = mkHabit({ id: 50, frequency: { type: 'daily' }, completions: [] });
  seed([daily]);
  let cat = F.categorizeHabits(F.loadHabits());
  ok('due daily habit lands in Now', cat.now.some(h => h.id === 50), [...allIds(cat)]);

  // A delay-hidden Daily×N habit is absent from every bucket.
  const HOUR = 3600000, now = Date.now();
  const hidden = mkHabit({ id: 51, frequency: { type: 'timesPerDay', timesPerDay: 3, delayHours: 4 },
    completions: [{ date: today, timestamp: now - 1 * HOUR }] });
  seed([hidden]);
  cat = F.categorizeHabits(F.loadHabits());
  eq('delay-hidden habit absent from all buckets', allIds(cat).has(51), false);

  // Skipped-today habit is not offered in Now.
  const skipped = mkHabit({ id: 52, frequency: { type: 'daily' }, skippedDates: [today] });
  seed([skipped]);
  cat = F.categorizeHabits(F.loadHabits());
  eq('skipped habit not in Now', cat.now.some(h => h.id === 52), false);
}

// === L. Core frequency-type regressions ==============================
console.log('\nL. twiceDaily / reminder / timesPerWeek status');
{
  // twiceDaily: morning-only is partial, both periods completes.
  const tdPartial = mkHabit({ id: 60, frequency: { type: 'twiceDaily' },
    completions: [{ date: today, period: 'morning' }] });
  const sp = F.getCompletionStatus(tdPartial);
  ok('twiceDaily morning-only: not completed, morningDone',
    sp.completed === false && sp.morningDone === true && sp.nightDone === false, sp);
  eq('twiceDaily morning-only -> isCompletedToday false', F.isCompletedToday(tdPartial), false);
  const tdFull = mkHabit({ id: 61, frequency: { type: 'twiceDaily' },
    completions: [{ date: today, period: 'morning' }, { date: today, period: 'night' }] });
  eq('twiceDaily both periods -> completed', F.getCompletionStatus(tdFull).completed, true);
  eq('twiceDaily both periods -> isCompletedToday true', F.isCompletedToday(tdFull), true);

  // reminder cadence (reminderDays interval drives due).
  const remDue = mkHabit({ id: 62, frequency: { type: 'reminder', reminderDays: 3 },
    completions: [{ date: dayOff(-3) }] });
  eq('reminder 3d ago -> due', F.getCompletionStatus(remDue).due, true);
  const remNot = mkHabit({ id: 63, frequency: { type: 'reminder', reminderDays: 3 },
    completions: [{ date: dayOff(-1) }] });
  eq('reminder 1d ago -> not due', F.getCompletionStatus(remNot).due, false);

  // timesPerWeek: fresh habit not completed, count 0, target carried.
  const tpw = mkHabit({ id: 64, frequency: { type: 'timesPerWeek', timesPerWeek: 3 }, completions: [] });
  const tw = F.getCompletionStatus(tpw);
  ok('timesPerWeek fresh: 0/3 not completed',
    tw.completed === false && tw.count === 0 && tw.target === 3, tw);
}

// === M. Shared UI factories + dialog wiring (regression smoke) =======
console.log('\nM. shared overlay factories & dialogs');
{
  // renderSheet: pinned header + single scroll body with footer inside it
  eq('renderSheet structure',
    F.renderSheet({ headerHtml: 'H', bodyHtml: 'B', footerHtml: 'F' }),
    '<div class="overlay-fixed-header">H</div><div class="overlay-scroll">BF</div>');

  // popupHeader: × shown only with onClose and showClose !== false
  ok('popupHeader shows close with onClose',
    /modal-close/.test(F.popupHeader({ title: 'T', onClose: 'x()' })));
  ok('popupHeader no close without onClose',
    !/modal-close/.test(F.popupHeader({ title: 'T' })));
  ok('popupHeader showClose:false hides close',
    !/modal-close/.test(F.popupHeader({ title: 'T', onClose: 'x()', showClose: false })));

  // Memoize getElementById so dialog/popup innerHTML is observable.
  const realGEI = F.document.getElementById;
  const els = {};
  F.document.getElementById = id => (els[id] || (els[id] = makeEl()));

  // confirmDialog renders Cancel + a danger confirm; wiring fires the
  // right callback and Cancel is a no-op.
  let confirmed = 0;
  F.confirmDialog({ title: 't', message: 'm', confirmLabel: 'Del', danger: true, onConfirm: () => confirmed++ });
  const dlg = els['dialogPopup'].innerHTML;
  // (button label text is escaped via a DOM element → empty under the
  // stub, so assert on the non-escaped wiring instead.)
  ok('confirmDialog has header close', /modal-close/.test(dlg), dlg.slice(0, 80));
  ok('confirmDialog wires Cancel (btn 0)', /dialogButton\(0\)/.test(dlg));
  ok('confirmDialog wires Confirm (btn 1)', /dialogButton\(1\)/.test(dlg));
  ok('confirmDialog has × + 2 actions', (dlg.match(/<button/g) || []).length === 3, (dlg.match(/<button/g) || []).length);
  ok('confirmDialog danger styling', /background:#dc2626/.test(dlg));
  F.dialogButton(0);                       // Cancel
  eq('Cancel does not confirm', confirmed, 0);
  F.confirmDialog({ title: 't', message: 'm', confirmLabel: 'Del', danger: true, onConfirm: () => confirmed++ });
  F.dialogButton(1);                       // Confirm
  eq('Confirm fires onConfirm', confirmed, 1);

  // alertDialog: single acknowledge button
  F.alertDialog('something failed');
  const al = els['dialogPopup'].innerHTML;
  ok('alertDialog wires single action (btn 0)', /dialogButton\(0\)/.test(al) && !/dialogButton\(1\)/.test(al));
  ok('alertDialog has × + 1 action', (al.match(/<button/g) || []).length === 2, (al.match(/<button/g) || []).length);

  // notify: must not throw under the harness
  let threw = false;
  try { F.notify('hi'); } catch (e) { threw = true; }
  ok('notify does not throw', !threw);

  F.document.getElementById = realGEI;
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail) { console.log('FAILED:', fails.join(', ')); process.exit(1); }
