        // Get a single habit by ID (returns habit object or undefined)
        function getHabitById(id) {
            return loadHabits().find(h => h.id === id);
        }

        // Check if habit has a completion entry for a specific date
        function hasCompletionOnDate(habit, dateStr) {
            return habit.completions.some(c => c.date === dateStr);
        }

        // Get all completion entries for a specific date
        function getCompletionsForDate(habit, dateStr) {
            return habit.completions.filter(c => c.date === dateStr);
        }

        // ========================================
        // UI HELPERS
        // ========================================

        function handleOverlayClick(e, id, closeFn) { if (e.target === document.getElementById(id)) closeFn(); }

        function syncBodyScrollLock() {
            const anyOpen = document.querySelector('.modal-overlay.active, .popup-overlay.active');
            document.body.classList.toggle('modal-open', !!anyOpen);
        }
        function showOverlay(id) { document.getElementById(id).classList.add('active'); syncBodyScrollLock(); }
        function hideOverlay(id) { document.getElementById(id).classList.remove('active'); syncBodyScrollLock(); }
        function isOverlayActive(id) { return !!document.getElementById(id)?.classList.contains('active'); }

        // One header for every overlay (sheets + popups): optional icon,
        // title, and a close (×) shown by default. Pass showClose:false to
        // omit it (e.g. action-only popups).
        function popupHeader({ icon, title, onClose, showClose = true }) {
            return `<div class="modal-header">
                    ${icon ? `<span class="modal-icon">${icon}</span>` : ''}
                    <span class="modal-title">${escapeHtml(title || '')}</span>
                    ${showClose && onClose ? `<button class="modal-close" onclick="${onClose}">&times;</button>` : ''}
                </div>`;
        }

        // Shared centered-popup renderer: pinned header, scrolling body,
        // optional pinned footer. Differences (title/icon, close button,
        // body content, footer buttons) are all params.
        function renderPopup(targetId, { icon, title, onClose, showClose = true, bodyHtml = '', footerHtml = '' }) {
            document.getElementById(targetId).innerHTML =
                `<div class="overlay-fixed-header">${popupHeader({ icon, title, onClose, showClose })}</div>`
              + `<div class="overlay-scroll">${bodyHtml}</div>`
              + (footerHtml || '');
        }

        // --- Shared dialogs (replace native confirm/alert) -----------------
        let _dialogButtons = [];
        function openDialog({ title = '', message = '', buttons = [] }) {
            _dialogButtons = buttons;
            const btns = buttons.map((b, i) => {
                const cls = b.secondary ? 'submit-btn secondary' : 'submit-btn';
                const style = `flex:1${b.danger ? ';background:#dc2626' : ''}`;
                return `<button class="${cls}" style="${style}" onclick="dialogButton(${i})">${escapeHtml(b.label)}</button>`;
            }).join('');
            renderPopup('dialogPopup', {
                title,
                onClose: 'closeDialog()',
                bodyHtml: message ? `<div style="color:#ccc;font-size:0.9rem;line-height:1.45;white-space:pre-line">${escapeHtml(message)}</div>` : '',
                footerHtml: `<div style="display:flex;gap:8px;padding:12px 16px">${btns}</div>`
            });
            showOverlay('dialogOverlay');
            // Focus the first (safe / non-destructive) action so keyboard
            // users can act and Esc/tap-outside still cancels. Native
            // confirm()/alert() had this for free.
            setTimeout(() => {
                const b = document.querySelector('#dialogPopup button:not(.modal-close)');
                if (b && b.focus) b.focus();
            }, 0);
        }
        function dialogButton(i) {
            const b = _dialogButtons[i];
            closeDialog();
            if (b && typeof b.onClick === 'function') b.onClick();
        }
        function closeDialog() { hideOverlay('dialogOverlay'); _dialogButtons = []; }

        // Destructive/decision gate. onConfirm runs only on the confirm button.
        function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = false, onConfirm }) {
            openDialog({ title, message, buttons: [
                { label: 'Cancel', secondary: true },
                { label: confirmLabel, danger, onClick: onConfirm }
            ]});
        }
        // Blocking notice (errors). One acknowledge button.
        function alertDialog(message, title = 'Notice') {
            openDialog({ title, message, buttons: [{ label: 'OK', secondary: true }] });
        }
        // Lightweight, auto-dismissing success/info toast (non-blocking).
        function notify(message) {
            const t = document.createElement('div');
            t.className = 'notice-toast';
            t.textContent = message;
            document.body.appendChild(t);
            requestAnimationFrame(() => t.classList.add('visible'));
            setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 250); }, 2600);
        }

        function openModal() {
            // Reset state for create mode
            formMode = 'create';
            formHabitId = null;
            resetFormState();
            newHabitSubtasks = [];
            // Select first unused emoji
            const usedIcons = getUsedIcons();
            formState.icon = HABIT_EMOJIS.find(e => !usedIcons.has(e)) || HABIT_EMOJIS[0];
            // Render the form
            document.getElementById('createModal').innerHTML = renderHabitForm();
            showOverlay('modalOverlay');
            fitOptionsToTwoLines();
            growSubtaskInputs();
            document.getElementById('habitInput').focus();
        }

        function closeModal() {
            hideOverlay('modalOverlay');
            // Reset state
            formMode = 'create';
            formHabitId = null;
            resetFormState();
            newHabitSubtasks = [];
        }

        // Settings renders through the shared sheet base like every other
        // bottom-sheet modal (Create/Details/Edit/All Habits).
        // Hybrid model: every change persists immediately — toggles/selects
        // on change, number fields on change (i.e. blur/Enter), tag chips on
        // tap. No draft and no Save button; ×/back just close.
        let settingsView = 'main';

        // Read whatever fields are present in the current view and persist
        // them merged over stored settings (absent fields keep their value).
        function commitSettings() {
            const prev = getSettings();
            const num = (id, def) => { const e = document.getElementById(id); return e ? (parseInt(e.value) || def) : prev[id]; };
            const chk = (id) => { const e = document.getElementById(id); return e ? e.checked : prev[id]; };
            const s = {
                ...prev,
                morningStart: num('morningStart', 5),
                nightStart: num('nightStart', 18),
                showDebug: chk('showDebugIcon'),
                notificationsEnabled: chk('notificationsEnabled'),
                morningReminderTime: num('morningReminderTime', 5),
                nightReminderTime: num('nightReminderTime', 18),
                momentumAlertEnabled: chk('momentumAlertEnabled'),
                momentumAlertTime: num('momentumAlertTime', 18),
                momentumAlertThreshold: num('momentumAlertThreshold', -20),
            };
            try {
                localStorage.setItem('habit_settings', JSON.stringify(s));
            } catch (e) {
                console.error('Failed to save settings:', e);
                alertDialog('Failed to save settings. Changes may not persist.');
            }
            if (s.notificationsEnabled) scheduleNotifications();
            updateDisplay();
        }

        function populateSettingsFields() {
            const s = getSettings();
            const set = (id, v) => { const e = document.getElementById(id); if (e) { if (e.type === 'checkbox') e.checked = !!v; else e.value = v; } };
            set('morningStart', s.morningStart);
            set('nightStart', s.nightStart);
            set('showDebugIcon', s.showDebug);
            set('notificationsEnabled', s.notificationsEnabled);
            set('morningReminderTime', s.morningReminderTime);
            set('nightReminderTime', s.nightReminderTime);
            set('momentumAlertEnabled', s.momentumAlertEnabled);
            set('momentumAlertTime', s.momentumAlertTime);
            set('momentumAlertThreshold', s.momentumAlertThreshold);
            const ms = document.getElementById('momentumAlertSettings');
            if (ms) ms.style.display = s.momentumAlertEnabled ? 'block' : 'none';
            updateInstallPromptVisibility();
        }

        // Navigate between settings views (current view already persisted).
        function settingsNavigate(view) {
            commitSettings();
            settingsView = view;
            renderSettings();
            populateSettingsFields();
        }

        // Move a tag between Active/Inactive and persist immediately.
        function toggleTagEnabled(id) {
            commitSettings();
            const cur = (getSettings().disabledTags || []).slice();
            const i = cur.indexOf(id);
            if (i >= 0) cur.splice(i, 1); else cur.push(id);
            try {
                localStorage.setItem('habit_settings', JSON.stringify({ ...getSettings(), disabledTags: cur }));
            } catch (e) {}
            renderSettings();
            populateSettingsFields();
        }

        // Body for Settings → Tags: active vs. inactive tag chips, toggled
        // via the saved disabledTags list.
        function buildTagsSettingsBody() {
            const disabled = getSettings().disabledTags || [];
            const chip = t => `<label class="option-pill ${disabled.includes(t.id) ? '' : 'active'}" onclick="toggleTagEnabled('${t.id}')">
                        <span class="option-pill-check">✓</span><span>${t.label}</span>
                    </label>`;
            const activeChips = TAG_LIST.filter(t => !disabled.includes(t.id)).map(chip).join('');
            const inactiveChips = TAG_LIST.filter(t => disabled.includes(t.id)).map(chip).join('');
            const sectionLabel = txt => `<div style="font-size:0.7rem;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:4px 0 8px">${txt}</div>`;
            return sectionLabel('Active')
                + `<div class="task-options">${activeChips || '<span style="color:#666;font-size:0.85rem">None</span>'}</div>`
                + `<div style="margin-top:16px">${sectionLabel('Inactive')}</div>`
                + `<div class="task-options">${inactiveChips || '<span style="color:#666;font-size:0.85rem">None</span>'}</div>`;
        }

        // Static markup blocks for the Settings sheet. Pure constants —
        // split out so renderSettings is just the view switch.
        function settingsGeneralRowsHtml() {
            return `
                <div class="settings-row">
                    <span class="settings-label">Morning starts at</span>
                    <div class="settings-value">
                        <input type="number" class="settings-input" id="morningStart" min="0" max="23" value="5" onchange="commitSettings()">
                        <span style="color:#666">:00</span>
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Bedtime starts at</span>
                    <div class="settings-value">
                        <input type="number" class="settings-input" id="nightStart" min="0" max="23" value="18" onchange="commitSettings()">
                        <span style="color:#666">:00</span>
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Show debug icon</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="showDebugIcon" onchange="commitSettings()">
                        <span class="toggle-slider"></span>
                    </label>
                </div>`;
        }
        function settingsNotificationsHtml() {
            return `
                <div class="settings-row">
                    <span class="settings-label">Notifications</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="notificationsEnabled" onchange="toggleNotifications()">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div id="notificationSettings">
                    <div class="settings-row">
                        <span class="settings-label">Morning reminder</span>
                        <div class="settings-value">
                            <input type="number" class="settings-input" id="morningReminderTime" min="0" max="23" value="5" onchange="commitSettings()">
                            <span style="color:#666">:00</span>
                        </div>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Night reminder</span>
                        <div class="settings-value">
                            <input type="number" class="settings-input" id="nightReminderTime" min="0" max="23" value="18" onchange="commitSettings()">
                            <span style="color:#666">:00</span>
                        </div>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Momentum alerts</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="momentumAlertEnabled" onchange="toggleMomentumSettings()">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div id="momentumAlertSettings" style="display:none;">
                        <div class="settings-row">
                            <span class="settings-label" style="padding-left:12px">Alert time</span>
                            <div class="settings-value">
                                <input type="number" class="settings-input" id="momentumAlertTime" min="0" max="23" value="18" onchange="commitSettings()">
                                <span style="color:#666">:00</span>
                            </div>
                        </div>
                        <div class="settings-row">
                            <span class="settings-label" style="padding-left:12px">Threshold</span>
                            <div class="settings-value">
                                <input type="number" class="settings-input" id="momentumAlertThreshold" min="-100" max="0" value="-20" onchange="commitSettings()">
                            </div>
                        </div>
                    </div>
                </div>`;
        }
        // #2: one Export (scope chosen by a "tasks only" toggle) paired
        // with Import on a single row, instead of two Export buttons.
        function settingsDataSectionHtml() {
            return `
                <div style="display:flex;gap:8px">
                    <button class="submit-btn secondary" style="flex:1;font-size:0.85rem" onclick="chooseExport()">Export</button>
                    <button class="submit-btn secondary" style="flex:1;font-size:0.85rem" onclick="triggerImport()">Import</button>
                </div>
                <input type="file" id="importFileInput" accept=".json" style="display:none" onchange="importData(event)">
                <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin:22px 0 8px">Danger zone</div>
                <div style="display:flex;gap:8px">
                    <button class="danger-zone-btn" onclick="resetAllMomentum()">Reset All Momentum</button>
                    <button class="danger-zone-btn" onclick="reloadDefaultTasks()">Reload Default Tasks</button>
                </div>`;
        }
        function settingsNavRow(label, view) {
            return `<div class="settings-row settings-nav" onclick="settingsNavigate('${view}')" style="cursor:pointer;margin-top:8px;padding-top:10px">
                    <span class="settings-label">${label}</span>
                    <span style="color:#666;font-size:1.2rem;line-height:1">›</span>
                </div>`;
        }
        function settingsSubHeader(title) {
            return `<div class="modal-header">
                    <button class="modal-close" onclick="settingsNavigate('main')" aria-label="Back" style="font-size:1.5rem;line-height:1">‹</button>
                    <span class="modal-title">${title}</span>
                    <button class="modal-close" onclick="closeSettings()">&times;</button>
                </div>`;
        }

        function renderSettings() {
            let headerHtml, bodyHtml;
            if (settingsView === 'notifications') {
                headerHtml = settingsSubHeader('Notifications');
                bodyHtml = settingsNotificationsHtml();
            } else if (settingsView === 'data') {
                headerHtml = settingsSubHeader('Data & Backup');
                bodyHtml = settingsDataSectionHtml();
            } else if (settingsView === 'tags') {
                headerHtml = settingsSubHeader('Tags');
                bodyHtml = buildTagsSettingsBody();
            } else {
                headerHtml = popupHeader({ title: 'Settings', onClose: 'closeSettings()' });
                bodyHtml = settingsGeneralRowsHtml()
                    + settingsNavRow('Notifications', 'notifications')
                    + settingsNavRow('Tags', 'tags')
                    + settingsNavRow('Data & Backup', 'data');
            }
            document.getElementById('settingsModal').innerHTML = renderSheet({ headerHtml, bodyHtml });
        }

        function openSettings() {
            settingsView = 'main';
            renderSettings();
            populateSettingsFields();
            showOverlay('settingsOverlay');
        }
        function closeSettings() { commitSettings(); hideOverlay('settingsOverlay'); }
        function toggleMomentumSettings() {
            const enabled = document.getElementById('momentumAlertEnabled').checked;
            document.getElementById('momentumAlertSettings').style.display = enabled ? 'block' : 'none';
            commitSettings();
        }
        function toggleQuietHoursSettings() {
            const enabled = document.getElementById('quietHoursEnabled').checked;
            document.getElementById('quietHoursSettings').style.display = enabled ? 'block' : 'none';
        }
        // (Hybrid model — no Save button; commitSettings() persists on every
        // change. The notification permission prompt now lives in
        // toggleNotifications, fired when the toggle is switched on.)

        // ========================================
        // NOTIFICATIONS
        // ========================================

        let notificationTimers = [];
        let swRegistration = null;

        function isStandalone() {
            return window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone === true;
        }

        function updateInstallPromptVisibility() {
            const prompt = document.getElementById('installPrompt');
            if (!prompt) return; // install prompt UI removed
            const notifEnabled = document.getElementById('notificationsEnabled').checked;
            // Show install prompt if notifications enabled but not installed as PWA
            if (notifEnabled && !isStandalone()) {
                prompt.style.display = 'block';
            } else {
                prompt.style.display = 'none';
            }
        }

        async function toggleNotifications() {
            const checkbox = document.getElementById('notificationsEnabled');
            // The notification fields stay visible (dedicated sub-view now);
            // the toggle only gates permission/scheduling, not visibility.
            if (checkbox && checkbox.checked) {
                const permission = await requestNotificationPermission();
                if (permission !== 'granted') {
                    checkbox.checked = false;
                    alertDialog('Notification permission denied. Enable it in your browser settings.');
                    commitSettings();
                    updateInstallPromptVisibility();
                    return;
                }
            } else {
                clearNotificationTimers();
            }
            updateInstallPromptVisibility();
            commitSettings();
        }

        async function requestNotificationPermission() {
            if (window.AppPlatform && AppPlatform.isNative()) {
                return await AppPlatform.requestNotificationPermission();
            }
            if (!('Notification' in window)) {
                return 'denied';
            }
            if (Notification.permission === 'granted') {
                return 'granted';
            }
            if (Notification.permission !== 'denied') {
                return await Notification.requestPermission();
            }
            return Notification.permission;
        }

        function clearNotificationTimers() {
            notificationTimers.forEach(timer => clearTimeout(timer));
            notificationTimers = [];
            if (window.AppPlatform && AppPlatform.isNative()) AppPlatform.cancelNotifications();
        }

        // Track last notification to prevent duplicates
        let lastNotificationKey = localStorage.getItem('lastNotificationKey') || '';

        // Check if notification should be shown now (on app open)
        function checkNotificationOnOpen() {
            const settings = getSettings();
            if (!settings.notificationsEnabled) return;
            if (!('Notification' in window) || Notification.permission !== 'granted') return;

            const now = new Date();
            const hour = now.getHours();
            const today = getTodayString();

            // Helper: send notification once per day/kind
            const sendOnce = (kind, fn) => {
                const key = `${today}-${kind}`;
                if (lastNotificationKey === key) return;
                // Track multiple keys across a day
                const seen = (localStorage.getItem('notifSeenToday') || '').split(',');
                if (seen.includes(key)) return;
                seen.push(key);
                localStorage.setItem('notifSeenToday', seen.join(','));
                localStorage.setItem('notifSeenDate', today);
                lastNotificationKey = key;
                localStorage.setItem('lastNotificationKey', key);
                fn();
            };

            // Reset seen-today list if date changed
            if (localStorage.getItem('notifSeenDate') !== today) {
                localStorage.setItem('notifSeenToday', '');
                localStorage.setItem('notifSeenDate', today);
            }

            // Morning window (between morning reminder and night start)
            if (hour >= settings.morningReminderTime && hour < settings.nightStart) {
                sendOnce('morning', () => showHabitNotification('morning'));
            }
            // Night window (after night reminder)
            if (hour >= settings.nightReminderTime) {
                sendOnce('night', () => showHabitNotification('night'));
            }
            // Momentum alert window
            if (settings.momentumAlertEnabled && hour >= settings.momentumAlertTime) {
                sendOnce('momentum', () => showMomentumAlert());
            }
            // Weekly summary on Sunday (day 0) at or after 10am
            if (settings.weeklySummaryEnabled && now.getDay() === 0 && hour >= 10) {
                sendOnce('weekly', () => showWeeklySummary());
            }
        }

        function scheduleNotifications() {
            clearNotificationTimers();

            const settings = getSettings();
            // In the Capacitor iOS app, schedule native local
            // notifications (they fire in the background) and skip the
            // web setTimeout path entirely.
            if (window.AppPlatform && AppPlatform.isNative()) {
                AppPlatform.scheduleNotifications(settings);
                return;
            }
            if (!settings.notificationsEnabled) return;

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Schedule morning reminder
            const morningTime = new Date(today);
            morningTime.setHours(settings.morningReminderTime, 0, 0, 0);
            if (morningTime > now) {
                const delay = morningTime - now;
                const timer = setTimeout(() => showHabitNotification('morning'), delay);
                notificationTimers.push(timer);
            }

            // Schedule night reminder
            const nightTime = new Date(today);
            nightTime.setHours(settings.nightReminderTime, 0, 0, 0);
            if (nightTime > now) {
                const delay = nightTime - now;
                const timer = setTimeout(() => showHabitNotification('night'), delay);
                notificationTimers.push(timer);
            }

            // Schedule momentum alert
            if (settings.momentumAlertEnabled) {
                const momentumTime = new Date(today);
                momentumTime.setHours(settings.momentumAlertTime, 0, 0, 0);
                if (momentumTime > now) {
                    const delay = momentumTime - now;
                    const timer = setTimeout(() => showMomentumAlert(), delay);
                    notificationTimers.push(timer);
                }
            }

            // Schedule weekly summary for Sunday at 10am
            if (settings.weeklySummaryEnabled) {
                const sunday = new Date(today);
                sunday.setDate(sunday.getDate() + (7 - sunday.getDay()) % 7);
                sunday.setHours(10, 0, 0, 0);
                if (sunday > now) {
                    const delay = sunday - now;
                    const timer = setTimeout(() => showWeeklySummary(), delay);
                    notificationTimers.push(timer);
                }
            }
        }

        function showHabitNotification(period) {
            const habits = loadHabits().filter(h => !h.archived);
            const todayStr = getTodayString();

            // Check for incomplete habits for this period
            const incompleteHabits = habits.filter(h => {
                if (h.timeOfDay && h.timeOfDay !== period) return false;
                if (h.isReminder || h.frequency.type === FREQ.REMINDER) return false;
                return !isCompletedForPeriod(h, todayStr, period);
            });

            if (incompleteHabits.length === 0) return;

            const title = period === 'morning' ? '🌅 Morning Habits' : '🌙 Bedtime Habits';
            const names = incompleteHabits.slice(0, 5).map(h => `${h.icon || '📌'} ${h.name}`).join(', ');
            const body = incompleteHabits.length > 5
                ? `${names} +${incompleteHabits.length - 5} more`
                : names;
            sendNotification(title, body, `habit-${period}`);
        }

        function showMomentumAlert() {
            const habits = loadHabits().filter(h => !h.archived);
            const settings = getSettings();
            const threshold = settings.momentumAlertThreshold || -20;

            // Find habits with low momentum (below threshold)
            const strugglingHabits = habits.filter(h => {
                if (h.isReminder || h.frequency.type === FREQ.REMINDER) return false;
                const score = h.momentumScore || 0;
                return score < threshold;
            });

            if (strugglingHabits.length === 0) return;

            const icons = strugglingHabits.slice(0, 5).map(h => h.icon || '📌').join(' ');
            const names = strugglingHabits.slice(0, 3).map(h => h.name).join(', ');
            const body = strugglingHabits.length > 3
                ? `${names} +${strugglingHabits.length - 3} more need attention`
                : `${names} need${strugglingHabits.length === 1 ? 's' : ''} attention`;
            sendNotification(`Momentum Alert ${icons}`, body, 'momentum-alert');
        }

        function showWeeklySummary() {
            const habits = loadHabits();
            const weeklyHabits = habits.filter(h =>
                h.frequency.type === 'timesPerWeek' || h.frequency.type === 'pointsPerWeek'
            );

            if (weeklyHabits.length === 0) return;

            let onTrack = 0;
            weeklyHabits.forEach(h => {
                const progress = getWeeklyProgress(h);
                if (progress.current >= progress.target) onTrack++;
            });

            sendNotification(`📊 ${onTrack}/${weeklyHabits.length} weekly goals`, '', 'weekly-summary');
        }

        function getWeeklyProgress(habit) {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - dayOfWeek);
            weekStart.setHours(0, 0, 0, 0);

            const completionsThisWeek = habit.completions.filter(c => {
                const cDate = new Date(c.date);
                return cDate >= weekStart;
            });

            const target = habit.frequency.timesPerWeek || habit.frequency.pointsPerWeek || 1;
            const current = habit.usePoints
                ? completionsThisWeek.reduce((sum, c) => sum + (c.points || 0), 0)
                : completionsThisWeek.length;

            return { current, target };
        }

        function isQuietHours() {
            const settings = getSettings();
            if (!settings.quietHoursEnabled) return false;
            const hour = new Date().getHours();
            const start = settings.quietHoursStart;
            const end = settings.quietHoursEnd;
            // Handle overnight quiet hours (e.g., 22:00 to 07:00)
            if (start > end) {
                return hour >= start || hour < end;
            }
            return hour >= start && hour < end;
        }

        async function sendNotification(title, body, tag, ignoreQuietHours = false) {
            if (!ignoreQuietHours && isQuietHours()) return;
            // In the Capacitor app the web Notification/SW APIs don't
            // deliver — fire an immediate native local notification.
            if (window.AppPlatform && AppPlatform.isNative()) {
                AppPlatform.notifyNow(title, body);
                return;
            }
            if (!('Notification' in window) || Notification.permission !== 'granted') return;

            // Try service worker first (works when app is in background)
            try {
                if (swRegistration && swRegistration.active) {
                    swRegistration.active.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        title,
                        body,
                        tag,
                        data: { url: '/' }
                    });
                    return;
                }
                // Try showNotification on the registration
                if (swRegistration) {
                    await swRegistration.showNotification(title, { body, tag, data: { url: '/' } });
                    return;
                }
            } catch (e) {
                // Service worker failed, fall through to basic notification
            }
            // Fallback to basic Notification API
            try {
                new Notification(title, { body, tag });
            } catch (e) {
                // Notification failed completely
            }
        }

        // Register service worker
        async function registerServiceWorker() {
            if ('serviceWorker' in navigator) {
                try {
                    swRegistration = await navigator.serviceWorker.register('./sw.js');
                    await navigator.serviceWorker.ready;
                } catch (err) {
                    // Service worker registration failed
                }
            }
        }

        // Scope is chosen on the action (like Import's Merge/Replace),
        // not a separate setting-looking toggle.
        function chooseExport() {
            openDialog({
                title: 'Export',
                message: 'What should the backup file include?',
                buttons: [
                    { label: 'All data', onClick: () => exportData(false) },
                    { label: 'Tasks only', onClick: () => exportData(true) },
                ]
            });
        }

        function exportData(noHistory = false) {
            let habits = loadHabits();
            if (noHistory) {
                const today = getTodayString();
                habits = habits.map(h => ({
                    ...h,
                    completions: [],
                    skippedDates: [],
                    snoozedUntil: null,
                    snoozeHistory: [],
                    momentumScore: 0,
                    lastScoreUpdate: today,
                    momentumResetDate: undefined,
                    createdAt: today,
                    subtasks: h.subtasks?.map(s => ({ ...s, completedPeriods: {} })) || []
                }));
            }
            const data = {
                exportedAt: new Date().toISOString(),
                version: 'habits_v3',
                settings: getSettings(),
                habits
            };
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const suffix = noHistory ? '-tasks-only' : '';
            a.download = `habits-export${suffix}-${getTodayString()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function triggerImport() {
            document.getElementById('importFileInput').click();
        }

        function importData(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                let data;
                try {
                    data = JSON.parse(e.target.result);
                } catch (err) {
                    alertDialog('Failed to import: ' + err.message);
                    return;
                }
                if (!data.habits || !Array.isArray(data.habits)) {
                    alertDialog('Invalid file format: missing habits array.');
                    return;
                }
                const finish = () => { invalidateHabitsCache(); updateDisplay(); closeSettings(); notify('Import successful'); };
                const doReplace = () => {
                    try {
                        saveHabits(data.habits);
                        if (data.settings) localStorage.setItem('habit_settings', JSON.stringify(data.settings));
                        finish();
                    } catch (err) { alertDialog('Failed to import: ' + err.message); }
                };
                const doMerge = () => {
                    try {
                        const currentHabits = loadHabits();
                        const maxId = Math.max(0, ...currentHabits.map(h => h.id));
                        const newHabits = data.habits.map((h, i) => ({ ...h, id: maxId + i + 1 }));
                        saveHabits([...currentHabits, ...newHabits]);
                        finish();
                    } catch (err) { alertDialog('Failed to import: ' + err.message); }
                };
                openDialog({
                    title: 'Import data',
                    message: 'Merge the file with your current data, or replace everything?',
                    buttons: [
                        { label: 'Merge', onClick: doMerge },
                        { label: 'Replace', danger: true, onClick: () => confirmDialog({
                            title: 'Replace all data?',
                            message: 'This permanently deletes all current data and cannot be undone.',
                            confirmLabel: 'Replace', danger: true, onConfirm: doReplace
                        }) },
                    ]
                });
            };
            reader.readAsText(file);

            // Reset the input so the same file can be imported again
            event.target.value = '';
        }

        function resetAllMomentum() {
            confirmDialog({ title: 'Reset all momentum?', message: 'Momentum scores for every habit reset to zero. This cannot be undone.', confirmLabel: 'Reset', danger: true, onConfirm: () => {
                const habits = loadHabits();
                const today = getTodayString();
                habits.forEach(h => {
                    h.momentumScore = 0;
                    h.lastScoreUpdate = today; // Set to today to prevent recalculation
                    h.momentumResetDate = today; // For reminders: use this as reference point for neglect calculation
                });
                saveHabits(habits);
                updateDisplay();
                closeSettings();
            } });
        }

        function reloadDefaultTasks() {
            confirmDialog({ title: 'Reload default tasks?', message: 'This deletes all your current tasks and replaces them with the defaults. This cannot be undone.', confirmLabel: 'Replace', danger: true, onConfirm: () => {
                saveHabits(getDefaultHabits());
                updateDisplay();
                closeSettings();
            } });
        }

        // Subtask functions for new habit creation
        function addNewHabitSubtask() {
            const input = document.getElementById('newHabitSubtaskInput');
            const name = input.value.trim();
            if (!name) return;
            newHabitSubtasks.push({ id: Date.now(), name, completedPeriods: {} });
            rerenderForm();
            setTimeout(() => document.getElementById('newHabitSubtaskInput')?.focus(), 0);
        }

        function removeNewHabitSubtask(id) {
            newHabitSubtasks = newHabitSubtasks.filter(s => s.id !== id);
            rerenderForm();
        }

        function updateNewHabitSubtask(id, newName) {
            const subtask = newHabitSubtasks.find(s => s.id === id);
            if (subtask && newName.trim()) {
                subtask.name = newName.trim();
            }
        }

        // Drag and drop for subtask reordering
        let draggedSubtaskId = null;
        let draggedSubtaskMode = null;
        let draggedSubtaskHabitId = null;

        function handleSubtaskDragStart(event, mode, habitId = null) {
            // dragstart fires on the ⋮⋮ handle now (so the editable field
            // isn't trapped inside a draggable ancestor); resolve the row.
            const row = event.target.closest('.subtask-item');
            if (!row) return;
            draggedSubtaskId = parseInt(row.dataset.subtaskId);
            draggedSubtaskMode = mode;
            draggedSubtaskHabitId = habitId;
            row.classList.add('dragging');
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', draggedSubtaskId);
        }

        function handleSubtaskDragOver(event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            const item = event.target.closest('.subtask-item');
            if (item && parseInt(item.dataset.subtaskId) !== draggedSubtaskId) {
                item.classList.add('drag-over');
            }
        }

        function handleSubtaskDragLeave(event) {
            const item = event.target.closest('.subtask-item');
            if (item) item.classList.remove('drag-over');
        }

        function performSubtaskReorder(mode, habitId, fromId, toId) {
            if (!fromId || !toId || fromId === toId) return;
            if (mode === 'new') {
                const fromIndex = newHabitSubtasks.findIndex(s => s.id === fromId);
                const toIndex = newHabitSubtasks.findIndex(s => s.id === toId);
                if (fromIndex !== -1 && toIndex !== -1) {
                    const [moved] = newHabitSubtasks.splice(fromIndex, 1);
                    newHabitSubtasks.splice(toIndex, 0, moved);
                    rerenderForm();
                }
            } else if (mode === 'edit' && habitId) {
                const allHabits = loadHabits();
                const habit = allHabits.find(h => h.id === habitId);
                if (habit && habit.subtasks) {
                    const fromIndex = habit.subtasks.findIndex(s => s.id === fromId);
                    const toIndex = habit.subtasks.findIndex(s => s.id === toId);
                    if (fromIndex !== -1 && toIndex !== -1) {
                        const [moved] = habit.subtasks.splice(fromIndex, 1);
                        habit.subtasks.splice(toIndex, 0, moved);
                        saveHabits(allHabits);
                        rerenderForm();
                    }
                }
            }
        }

        function handleSubtaskDrop(event, mode, habitId = null) {
            event.preventDefault();
            const item = event.target.closest('.subtask-item');
            if (item) item.classList.remove('drag-over');

            const targetId = parseInt(item?.dataset.subtaskId);
            performSubtaskReorder(mode, habitId, draggedSubtaskId, targetId);
            draggedSubtaskId = null;
            draggedSubtaskMode = null;
            draggedSubtaskHabitId = null;
        }

        // Touch-based subtask reordering for mobile (HTML5 drag-drop doesn't work on touch)
        let touchDragSubtaskId = null;
        let touchDragMode = null;
        let touchDragHabitId = null;
        let touchDragElement = null;
        let touchDragStartY = 0;
        let touchDragCurrentTarget = null;

        function handleSubtaskTouchStart(event, mode, habitId = null) {
            const item = event.target.closest('.subtask-item');
            if (!item) return;
            touchDragSubtaskId = parseInt(item.dataset.subtaskId);
            touchDragMode = mode;
            touchDragHabitId = habitId;
            touchDragElement = item;
            touchDragStartY = event.touches[0].clientY;
            item.classList.add('dragging');
            event.stopPropagation();
        }

        function handleSubtaskTouchMove(event) {
            if (!touchDragElement) return;
            event.preventDefault();
            event.stopPropagation();
            const touch = event.touches[0];
            const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetItem = elementUnderTouch?.closest('.subtask-item');

            // Clear previous target highlight
            if (touchDragCurrentTarget && touchDragCurrentTarget !== targetItem) {
                touchDragCurrentTarget.classList.remove('drag-over');
            }

            if (targetItem && parseInt(targetItem.dataset.subtaskId) !== touchDragSubtaskId) {
                targetItem.classList.add('drag-over');
                touchDragCurrentTarget = targetItem;
            } else {
                touchDragCurrentTarget = null;
            }
        }

        function handleSubtaskTouchEnd(event) {
            if (!touchDragElement) return;
            touchDragElement.classList.remove('dragging');
            if (touchDragCurrentTarget) {
                touchDragCurrentTarget.classList.remove('drag-over');
                const targetId = parseInt(touchDragCurrentTarget.dataset.subtaskId);
                performSubtaskReorder(touchDragMode, touchDragHabitId, touchDragSubtaskId, targetId);
            }
            touchDragSubtaskId = null;
            touchDragMode = null;
            touchDragHabitId = null;
            touchDragElement = null;
            touchDragCurrentTarget = null;
        }

        // Determine the final frequency type based on form state
        function getFrequencyType() {
            // Reminder is now a modifier, not a frequency type
            if (formState.isPointsMode) {
                if (formState.frequency === FREQ.TIMES_PER_PERIOD) {
                    if (formState.pointsPeriod === PERIOD.DAY) return FREQ.POINTS_PER_DAY;
                    if (formState.pointsPeriod === PERIOD.MONTH) return FREQ.POINTS_PER_MONTH;
                    return FREQ.POINTS_PER_WEEK;
                }
                return formState.frequency; // everyXDays with points
            }
            // Normal completion mode
            if (formState.frequency === FREQ.TIMES_PER_PERIOD) {
                if (formState.timesPeriod === PERIOD.DAY) return FREQ.TIMES_PER_DAY;
                if (formState.timesPeriod === PERIOD.MONTH) return FREQ.TIMES_PER_MONTH;
                return FREQ.TIMES_PER_WEEK;
            }
            // Daily with an inline count > 1 becomes X-times-per-day.
            if (formState.frequency === FREQ.DAILY) {
                const el = document.getElementById('dailyTimes') || document.getElementById('editDailyTimes');
                const n = el ? (parseInt(el.value) || 1) : (formState.dailyTimesValue || 1);
                return n > 1 ? FREQ.TIMES_PER_DAY : FREQ.DAILY;
            }
            return formState.frequency;
        }

        // ========================================
        // HABIT CRUD OPERATIONS
        // ========================================

        function addHabit() {
            const name = document.getElementById('habitInput').value.trim();
            if (!name) return;
            const description = document.getElementById('habitDesc')?.value.trim() || '';
            const habits = loadHabits();
            const freqType = getFrequencyType();
            // Validate frequency values (minimum 1)
            const timesVal = Math.max(1, parseInt(document.getElementById('timesPerPeriod')?.value) || parseInt(document.getElementById('dailyTimes')?.value) || DEFAULTS.TIMES_PER_PERIOD);
            const pointsVal = Math.max(1, parseInt(document.getElementById('pointsPerPeriod')?.value) || DEFAULTS.POINTS_PER_PERIOD);
            const pointsTargetVal = Math.max(1, parseInt(document.getElementById('pointsTarget')?.value) || DEFAULTS.POINTS_TARGET);
            const reminderDaysVal = Math.max(1, parseInt(document.getElementById('reminderDays')?.value) || DEFAULTS.REMINDER_DAYS);
            const everyXVal = Math.max(1, parseInt(document.getElementById('everyXPeriod')?.value) || DEFAULTS.EVERY_X_DAYS);
            habits.push({
                id: Date.now(), name, description,
                icon: formState.icon,
                timeOfDay: formState.time,
                frequency: {
                    type: freqType,
                    timesPerDay: timesVal,
                    timesPerWeek: timesVal,
                    timesPerMonth: timesVal,
                    everyXDays: formState.afterPeriod === PERIOD.DAY ? everyXVal : null,
                    everyXWeeks: formState.afterPeriod === PERIOD.WEEK ? everyXVal : null,
                    everyXMonths: formState.afterPeriod === PERIOD.MONTH ? everyXVal : null,
                    pointsPerDay: pointsVal,
                    pointsPerWeek: pointsVal,
                    pointsPerMonth: pointsVal,
                    pointsTarget: pointsTargetVal,
                    reminderDays: reminderDaysVal,
                    delayHours: Math.max(0, parseInt(document.getElementById('delayHours')?.value) || 0)
                },
                usePoints: formState.isPointsMode,
                isReminder: formState.isReminderMode,
                allowOptional: formState.allowOptional,
                noMomentum: formState.noMomentum,
                confirmDescription: formState.confirmDescription,
                autoCompletes: document.getElementById('autoCompletes')?.value.trim() || '',
                linkedHabit: '',
                conflictsWith: document.getElementById('conflictsWith')?.value.trim() || '',
                sequentialSubtasks: formState.sequentialSubtasks,
                completions: [], skippedDates: [], snoozedUntil: null, subtasks: [...newHabitSubtasks], createdAt: getTodayString()
            });
            const newId = habits[habits.length - 1].id;
            const linkedRaw = document.getElementById('linkedHabit')?.value.trim() || '';
            if (linkedRaw) syncLinkedHabit(habits, newId, linkedRaw);
            saveHabits(habits);
            closeModal();
            renderHabits();
        }

        function deleteHabit(id) {
            confirmDialog({ title: 'Delete habit?', message: 'This permanently removes the habit and all its history.', confirmLabel: 'Delete', danger: true, onConfirm: () => {
                const habits = loadHabits().filter(h => h.id !== id);
                // Clear any companion back-references to the deleted habit.
                habits.forEach(h => {
                    if (Number(h.linkedHabit) === id) h.linkedHabit = '';
                });
                saveHabits(habits);
                closeDetails();
                renderHabits();
            } });
        }

        function archiveHabit(id) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            if (habit) {
                habit.archived = true;
                saveHabits(habits);
                closeDetails();
                renderHabits();
            }
        }

        function unarchiveHabit(id) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            if (habit) {
                habit.archived = false;
                saveHabits(habits);
                renderDetails();
                renderAllHabitsGrid();
            }
        }

        function skipHabit(id) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            const today = getTodayString();
            if (habit && !habit.skippedDates.includes(today)) {
                habit.skippedDates.push(today);
                saveHabits(habits);
                closeSnoozePopup();
                closeDetails();
                renderHabits();
            }
        }

        let snoozePopupHabitId = null;
        // true = Snooze (pause momentum during the delay), false = Ignore
        // (let momentum keep running while delayed). Set by whichever
        // details button opened the (otherwise identical) date popup.
        let snoozePauseMomentum = true;

        function getHabitCycleDays(habit) {
            const freq = habit.frequency;
            const freqType = freq.type;
            if (freqType === FREQ.DAILY || freqType === FREQ.TWICE_DAILY || freqType === FREQ.TIMES_PER_DAY || freqType === FREQ.POINTS_PER_DAY) return 1;
            if (freqType === FREQ.REMINDER) return freq.reminderDays || DEFAULTS.REMINDER_DAYS;
            if (freqType === FREQ.TIMES_PER_WEEK) return Math.round(7 / (freq.timesPerWeek || DEFAULTS.TIMES_PER_PERIOD));
            if (freqType === FREQ.TIMES_PER_MONTH) return Math.round(30 / (freq.timesPerMonth || DEFAULTS.TIMES_PER_PERIOD));
            if (freqType === FREQ.POINTS_PER_WEEK) return Math.round(7 / (freq.pointsPerWeek || DEFAULTS.POINTS_PER_PERIOD));
            if (freqType === FREQ.POINTS_PER_MONTH) return Math.round(30 / (freq.pointsPerMonth || DEFAULTS.POINTS_PER_PERIOD));
            if (freqType === FREQ.EVERY_X_DAYS) {
                if (freq.everyXWeeks) return freq.everyXWeeks * 7;
                if (freq.everyXMonths) return freq.everyXMonths * 30;
                return freq.everyXDays || DEFAULTS.EVERY_X_DAYS;
            }
            return 1;
        }

        function formatCycleDays(days) {
            if (days === 1) return '1 day';
            if (days < 7) return `${days} days`;
            if (days === 7) return '1 week';
            if (days < 30 && days % 7 === 0) return `${days / 7} weeks`;
            if (days === 30) return '1 month';
            return `${days} days`;
        }

        function openSnoozePopup(id, pauseMomentum = true) {
            snoozePopupHabitId = id;
            snoozePauseMomentum = pauseMomentum;
            const habit = loadHabits().find(h => h.id === id);
            const cycleDays = habit ? getHabitCycleDays(habit) : 1;

            // Calculate tomorrow relative to the app's effective "today" so the
            // snooze date min/value match what the rest of the app considers today.
            const today = getTodayString();
            const [ty, tm, td] = today.split('-').map(Number);
            const tomorrow = new Date(ty, tm - 1, td);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = toDateString(tomorrow);
            // Prefill with existing snooze date if already set to a specific day,
            // otherwise leave empty so the native picker opens on tomorrow via min.
            const currentSnooze = (habit && habit.snoozedUntil && habit.snoozedUntil !== PERIOD.NIGHT && habit.snoozedUntil > today)
                ? habit.snoozedUntil : '';

            renderPopup('snoozePopup', {
                title: pauseMomentum ? 'Snooze' : 'Ignore',
                onClose: 'closeSnoozePopup()',
                bodyHtml: `
                    <div style="color:#888;font-size:0.8rem;line-height:1.4;margin:0 0 12px;text-align:center">${pauseMomentum
                        ? 'Hides this habit and pauses momentum — no penalty for the skipped days.'
                        : 'Hides this habit but momentum keeps running — missed days still count against you.'}</div>
                    <div class="snooze-section">
                        <div class="snooze-section-label">Today</div>
                        <div class="snooze-options" style="grid-template-columns: repeat(2, 1fr);">
                            <button class="snooze-option" onclick="snoozeUntilTonight()">
                                <span class="snooze-option-icon">🌙</span>
                                <span>Tonight</span>
                            </button>
                            <button class="snooze-option" onclick="snoozeUntilMorning()">
                                <span class="snooze-option-icon">☀️</span>
                                <span>Tomorrow AM</span>
                            </button>
                        </div>
                    </div>
                    <div class="snooze-section">
                        <div class="snooze-section-label">Days</div>
                        <div class="snooze-options">
                            <button class="snooze-option" onclick="snoozeHabit(1)">1</button>
                            <button class="snooze-option" onclick="snoozeHabit(2)">2</button>
                            <button class="snooze-option" onclick="snoozeHabit(3)">3</button>
                            <button class="snooze-option" onclick="snoozeHabit(7)">7</button>
                            <button class="snooze-option" onclick="snoozeHabit(14)">14</button>
                            <button class="snooze-option" onclick="snoozeHabit(30)">30</button>
                        </div>
                    </div>
                    <div class="snooze-section">
                        <div class="snooze-section-label">Pick date</div>
                        <div class="snooze-date-row">
                            <input type="date" id="snoozeCustomDate" class="snooze-date-input" min="${tomorrowStr}" value="${currentSnooze}" onchange="snoozeToDate()">
                        </div>
                    </div>`,
                footerHtml: `<div style="display:flex;gap:6px;padding:10px 14px">
                    <button class="snooze-option skip-cycle-btn" onclick="snoozeHabit(${cycleDays})" style="flex:1;margin:0">
                        <span class="snooze-option-icon">⏭️</span>
                        <span>Skip cycle</span>
                    </button>
                    <button class="snooze-cancel" onclick="closeSnoozePopup()" style="flex:1;margin:0">Cancel</button>
                </div>`
            });
            showOverlay('snoozePopupOverlay');
        }

        function closeSnoozePopup() {
            hideOverlay('snoozePopupOverlay');
            snoozePopupHabitId = null;
        }

        function snoozeHabit(days) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === snoozePopupHabitId);
            if (habit) {
                const today = getTodayString();
                // Parse date string in local timezone (not UTC)
                const [year, month, day] = today.split('-').map(Number);
                const snoozeUntil = new Date(year, month - 1, day);
                snoozeUntil.setDate(snoozeUntil.getDate() + days);
                const untilStr = toDateString(snoozeUntil);
                habit.snoozedUntil = untilStr;
                // Track snooze history for momentum pausing (only if checkbox is checked)
                const pauseMomentum = snoozePauseMomentum;
                if (pauseMomentum) {
                    if (!habit.snoozeHistory) habit.snoozeHistory = [];
                    habit.snoozeHistory.push({ from: today, until: untilStr });
                }
                saveHabits(habits);
                closeSnoozePopup();
                closeDetails();
                renderHabits();
            }
        }

        function snoozeToDate() {
            // Guard against null habitId (fires again after popup closed) and
            // against the input firing with an invalid or incomplete value.
            if (snoozePopupHabitId == null) return;
            const dateInput = document.getElementById('snoozeCustomDate');
            if (!dateInput || !dateInput.value) return;
            // Require full YYYY-MM-DD so partial typing in desktop browsers does
            // not trigger a save mid-edit.
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) return;
            const today = getTodayString();
            if (dateInput.value <= today) return; // Must be in the future
            const habits = loadHabits();
            const habit = habits.find(h => h.id === snoozePopupHabitId);
            if (habit) {
                habit.snoozedUntil = dateInput.value;
                delete habit.snoozedUntilPeriod;
                // Track snooze history for momentum pausing (only if checkbox is checked)
                const pauseMomentum = snoozePauseMomentum;
                if (pauseMomentum) {
                    if (!habit.snoozeHistory) habit.snoozeHistory = [];
                    habit.snoozeHistory.push({ from: today, until: dateInput.value });
                }
                saveHabits(habits);
                closeSnoozePopup();
                closeDetails();
                renderHabits();
            }
        }

        function snoozeUntilTonight() {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === snoozePopupHabitId);
            if (habit) {
                habit.snoozedUntil = 'night'; // Special value for "until tonight"
                saveHabits(habits);
                closeSnoozePopup();
                closeDetails();
                renderHabits();
            }
        }

        function snoozeUntilMorning() {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === snoozePopupHabitId);
            if (habit) {
                const today = getTodayString();
                // If it's currently night, snooze until tomorrow morning
                // If it's currently morning, snooze until tomorrow morning
                // Parse date string in local timezone (not UTC)
                const [year, month, day] = today.split('-').map(Number);
                const tomorrow = new Date(year, month - 1, day);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const untilStr = toDateString(tomorrow);
                habit.snoozedUntil = untilStr;
                habit.snoozedUntilPeriod = 'morning'; // Mark that it should appear in morning
                // Track snooze history for momentum pausing (only if checkbox is checked)
                const pauseMomentum = snoozePauseMomentum;
                if (pauseMomentum) {
                    if (!habit.snoozeHistory) habit.snoozeHistory = [];
                    habit.snoozeHistory.push({ from: today, until: untilStr });
                }
                saveHabits(habits);
                closeSnoozePopup();
                closeDetails();
                renderHabits();
            }
        }

        function unsnoozeHabit(id) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            if (habit) {
                habit.snoozedUntil = null;
                saveHabits(habits);
                closeDetails();
                renderHabits();
            }
        }

        // ========================================
        // COMPLETION STATUS & CALCULATIONS
        // ========================================

        function isCompletedForPeriod(habit, date, period) {
            const comps = getCompletionsForDate(habit, date);
            return habit.frequency.type === FREQ.TWICE_DAILY ? comps.some(c => c.period === period) : comps.length > 0;
        }

        function getMonthStart(d) {
            const dt = new Date(d);
            dt.setDate(1);
            return toDateString(dt);
        }

        function getMonthEnd(d) {
            const dt = new Date(d);
            dt.setMonth(dt.getMonth() + 1);
            dt.setDate(0);
            return toDateString(dt);
        }

        function getCompletionStatus(habit) {
            const today = getTodayString();
            const freqType = habit.frequency.type;

            if (freqType === FREQ.TWICE_DAILY) {
                const m = isCompletedForPeriod(habit, today, PERIOD.MORNING);
                const n = isCompletedForPeriod(habit, today, PERIOD.NIGHT);
                return { completed: m && n, morningDone: m, nightDone: n };
            }
            if (freqType === FREQ.TIMES_PER_DAY) {
                // Count raw completions today (multiple per day are the point);
                // countCompletionsInRange dedupes by date so can't be used here.
                const count = habit.completions.filter(c => c.date === today).length;
                const target = habit.frequency.timesPerDay || DEFAULTS.TIMES_PER_PERIOD;
                return { completed: count >= target, count, target, text: `${count}/${target}`, isDaily: true };
            }
            if (freqType === FREQ.TIMES_PER_WEEK) {
                const ws = getWeekStart(today), count = countCompletionsInRange(habit, ws, today);
                const target = habit.frequency.timesPerWeek || DEFAULTS.TIMES_PER_PERIOD;
                return { completed: count >= target, count, target, text: `${count}/${target}` };
            }
            if (freqType === FREQ.TIMES_PER_MONTH) {
                const ms = getMonthStart(today), me = getMonthEnd(today);
                const count = countCompletionsInRange(habit, ms, me);
                const target = habit.frequency.timesPerMonth || DEFAULTS.TIMES_PER_PERIOD;
                return { completed: count >= target, count, target, text: `${count}/${target}` };
            }
            if (freqType === FREQ.EVERY_X_DAYS || freqType === FREQ.REMINDER) {
                const last = getLastCompletionDate(habit);
                let target;
                if (freqType === FREQ.REMINDER) {
                    target = habit.frequency.reminderDays || DEFAULTS.REMINDER_DAYS;
                } else if (habit.frequency.everyXWeeks) {
                    target = habit.frequency.everyXWeeks * 7;
                } else if (habit.frequency.everyXMonths) {
                    target = habit.frequency.everyXMonths * 30;
                } else {
                    target = habit.frequency.everyXDays || DEFAULTS.EVERY_X_DAYS;
                }
                if (!last) return { completed: false, due: true, daysOverdue: 0 };
                const since = daysBetween(last, today);
                return { completed: since === 0, due: since >= target, daysOverdue: Math.max(0, since - target) };
            }
            if (freqType === FREQ.POINTS_PER_WEEK) {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 6);
                const ws = toDateString(weekAgo);
                const points = countPointsInRange(habit, ws, today);
                const target = habit.frequency.pointsPerWeek || DEFAULTS.POINTS_PER_PERIOD;
                return { completed: points >= target, points, target, text: `${points}/${target} pts`, isPoints: true };
            }
            if (freqType === FREQ.POINTS_PER_MONTH) {
                const monthAgo = new Date(today);
                monthAgo.setDate(monthAgo.getDate() - 29);
                const ms = toDateString(monthAgo);
                const points = countPointsInRange(habit, ms, today);
                const target = habit.frequency.pointsPerMonth || DEFAULTS.POINTS_PER_PERIOD;
                return { completed: points >= target, points, target, text: `${points}/${target} pts`, isPoints: true };
            }
            if (freqType === FREQ.POINTS_PER_DAY) {
                const points = countPointsInRange(habit, today, today);
                const target = habit.frequency.pointsPerDay || DEFAULTS.POINTS_PER_PERIOD;
                return { completed: points >= target, points, target, text: `${points}/${target}`, isPoints: true, isDaily: true };
            }
            return { completed: getCompletionsForDate(habit, today).length > 0 };
        }

        function isDueToday(habit) {
            const today = getTodayString();
            if (habit.skippedDates && habit.skippedDates.includes(today)) return false;
            const status = getCompletionStatus(habit);
            const freqType = habit.frequency.type;

            if (freqType === FREQ.TWICE_DAILY) return true;
            if (freqType === FREQ.TIMES_PER_DAY || freqType === FREQ.TIMES_PER_WEEK || freqType === FREQ.TIMES_PER_MONTH) return !status.completed;
            if (freqType === FREQ.POINTS_PER_DAY || freqType === FREQ.POINTS_PER_WEEK || freqType === FREQ.POINTS_PER_MONTH) return !status.completed;
            if (freqType === FREQ.EVERY_X_DAYS || freqType === FREQ.REMINDER) return status.due || status.completed;
            return true;
        }

        // Resolve a habit's "conflicts with" partner (by id), if any.
        function getConflictPartner(habit) {
            if (!habit.conflictsWith) return null;
            const cid = Number(habit.conflictsWith);
            if (!cid || cid === habit.id) return null;
            return loadHabits().find(h => h.id === cid && !h.archived) || null;
        }

        // A habit tagged "Conflicts with X" is suppressed (hidden, not
        // momentum-penalized) on any day X is due — e.g. don't use serum
        // on shampoo days.
        function isConflictSuppressed(habit) {
            const partner = getConflictPartner(habit);
            return !!partner && isDueToday(partner);
        }

        function getDaysOverdue(habit) {
            const today = getTodayString();
            if (habit.frequency.type === FREQ.EVERY_X_DAYS) {
                const last = getLastCompletionDate(habit);
                if (!last) return 0;
                let target;
                if (habit.frequency.everyXWeeks) target = habit.frequency.everyXWeeks * 7;
                else if (habit.frequency.everyXMonths) target = habit.frequency.everyXMonths * 30;
                else target = habit.frequency.everyXDays || DEFAULTS.EVERY_X_DAYS;
                return Math.max(0, daysBetween(last, today) - target);
            }
            return 0;
        }

        function getWeekStart(d) { const dt = new Date(d); dt.setDate(dt.getDate() - dt.getDay()); return toDateString(dt); }
        function countCompletionsInRange(habit, start, end) {
            // Use string comparison for YYYY-MM-DD dates to avoid timezone issues
            const dates = new Set();
            habit.completions.forEach(c => { if (c.date >= start && c.date <= end) dates.add(c.date); });
            return dates.size;
        }
        function countPointsInRange(habit, start, end) {
            // Sum points for completions in date range
            let total = 0;
            habit.completions.forEach(c => {
                if (c.date >= start && c.date <= end) {
                    total += c.points || 1; // Default to 1 if no points specified
                }
            });
            return total;
        }
        function getLastCompletionDate(habit) {
            if (!habit.completions.length) return null;
            return [...habit.completions].sort((a, b) => b.date.localeCompare(a.date))[0].date;
        }
        function daysBetween(d1, d2) { return Math.floor((new Date(d2) - new Date(d1)) / 86400000); }

        // Check if a date was snoozed (for pausing momentum during snooze)
        function wasDateSnoozed(habit, dateStr) {
            if (!habit.snoozeHistory || !habit.snoozeHistory.length) return false;
            return habit.snoozeHistory.some(range => dateStr >= range.from && dateStr < range.until);
        }

        // ========================================
        // MOMENTUM SCORING
        // ========================================

        function calculateMomentumScore(habit) {
            // "Untracked" (noMomentum) habits are always neutral — never
            // rewarded or penalized — but otherwise behave like any habit.
            if (habit.noMomentum) return { raw: 0, display: 0 };
            const today = getTodayString();
            const freq = habit.frequency;
            const freqType = freq.type;

            // Determine the cycle length for this habit type (expected days between completions)
            let cycleDays = 1;
            if (freqType === FREQ.DAILY || freqType === FREQ.TWICE_DAILY || freqType === FREQ.TIMES_PER_DAY) cycleDays = 1;
            else if (freqType === FREQ.POINTS_PER_DAY) cycleDays = 1;
            else if (freqType === FREQ.REMINDER) cycleDays = freq.reminderDays || DEFAULTS.REMINDER_DAYS;
            else if (freqType === FREQ.TIMES_PER_WEEK) cycleDays = 7 / (freq.timesPerWeek || DEFAULTS.TIMES_PER_PERIOD);
            else if (freqType === FREQ.TIMES_PER_MONTH) cycleDays = 30 / (freq.timesPerMonth || DEFAULTS.TIMES_PER_PERIOD);
            else if (freqType === FREQ.POINTS_PER_WEEK) cycleDays = 7 / (freq.pointsPerWeek || DEFAULTS.POINTS_PER_PERIOD);
            else if (freqType === FREQ.POINTS_PER_MONTH) cycleDays = 30 / (freq.pointsPerMonth || DEFAULTS.POINTS_PER_PERIOD);
            else if (freqType === FREQ.EVERY_X_DAYS) {
                if (freq.everyXWeeks) cycleDays = freq.everyXWeeks * 7;
                else if (freq.everyXMonths) cycleDays = freq.everyXMonths * 30;
                else cycleDays = freq.everyXDays || DEFAULTS.EVERY_X_DAYS;
            }

            // Frequency scale factor: for types that are "due" every day, scale by cycle length
            // This ensures missing a weekly task for a week has similar impact to missing a daily for a day
            const dueEveryDay = freqType === FREQ.TIMES_PER_WEEK || freqType === FREQ.TIMES_PER_MONTH ||
                                freqType === FREQ.POINTS_PER_WEEK || freqType === FREQ.POINTS_PER_MONTH;
            const frequencyScale = dueEveryDay ? (1 / cycleDays) : 1;

            // Time window is 2-3x the cycle length, minimum 14 days
            const windowDays = Math.max(14, Math.round(cycleDays * 2.5));

            // Get completions and expected completions within window
            const windowStart = new Date(today);
            windowStart.setDate(windowStart.getDate() - windowDays);
            const windowStartStr = toDateString(windowStart);

            let score = habit.momentumScore || 0;

            // Use lastScoreUpdate, or createdAt as fallback for new habits
            const lastUpdate = habit.lastScoreUpdate || habit.createdAt;
            if (!lastUpdate) {
                return { raw: 0, display: 0 };
            }

            // Calculate days since last score update
            const daysSinceUpdate = daysBetween(lastUpdate, today);
            // If 0 days or negative (lastUpdate is in the future due to date adjustment), return current score
            if (daysSinceUpdate <= 0) {
                return { raw: score, display: getDisplayScore(score) };
            }

            // Apply decay and calculate new score
            const completionDates = new Set(habit.completions.map(c => c.date));
            const createdAt = habit.createdAt;
            const conflictPartner = getConflictPartner(habit);

            for (let i = 1; i <= daysSinceUpdate; i++) {
                const checkDate = new Date(lastUpdate);
                checkDate.setDate(checkDate.getDate() + i);
                const checkDateStr = toDateString(checkDate);

                // Skip dates before habit was created
                if (createdAt && checkDateStr < createdAt) continue;

                // Skip dates when habit was snoozed (momentum pauses during snooze)
                if (wasDateSnoozed(habit, checkDateStr)) continue;

                // Skip days the conflict partner was due — the habit was
                // intentionally suppressed, so don't penalize the gap.
                if (conflictPartner && wasHabitDueOnDate(conflictPartner, checkDateStr)) continue;

                const wasDue = wasHabitDueOnDate(habit, checkDateStr);
                let wasCompleted = completionDates.has(checkDateStr);

                // For points per day, check if target was met (not just any completion)
                if (freqType === FREQ.POINTS_PER_DAY && wasCompleted) {
                    const dayPoints = countPointsInRange(habit, checkDateStr, checkDateStr);
                    const target = freq.pointsPerDay || DEFAULTS.POINTS_PER_PERIOD;
                    wasCompleted = dayPoints >= target;
                }

                if (wasDue) {
                    if (wasCompleted) {
                        const reward = 15 * frequencyScale;
                        score = Math.min(100, score + reward);
                    } else {
                        // Missing = penalty with acceleration (worse when already negative)
                        const basePenalty = score < 0 ? Math.min(45, 25 - score * 0.2) : 25;
                        const isReminder = habit.isReminder || freqType === FREQ.REMINDER;
                        const penalty = (isReminder ? basePenalty * 0.5 : basePenalty) * frequencyScale;
                        score = Math.max(-100, score - penalty);
                    }
                }

                score = score * 0.85; // Daily decay (15% - faster decline toward zero)
            }

            return { raw: Math.round(score), display: getDisplayScore(score) };
        }

        function wasHabitDueOnDate(habit, dateStr) {
            const freq = habit.frequency;
            const freqType = freq.type;
            if (freqType === FREQ.DAILY || freqType === FREQ.TWICE_DAILY || freqType === FREQ.POINTS_PER_DAY || freqType === FREQ.TIMES_PER_DAY) return true;
            if (freqType === FREQ.TIMES_PER_WEEK || freqType === FREQ.TIMES_PER_MONTH) return true;
            if (freqType === FREQ.EVERY_X_DAYS || freqType === FREQ.REMINDER) {
                let interval;
                if (freqType === FREQ.REMINDER) {
                    interval = freq.reminderDays || DEFAULTS.REMINDER_DAYS;
                } else if (freq.everyXWeeks) {
                    interval = freq.everyXWeeks * 7;
                } else if (freq.everyXMonths) {
                    interval = freq.everyXMonths * 30;
                } else {
                    interval = freq.everyXDays || DEFAULTS.EVERY_X_DAYS;
                }
                const last = getLastCompletionBefore(habit, dateStr);
                if (!last) return true;
                const since = daysBetween(last, dateStr);
                return since >= interval;
            }
            return true;
        }

        function getLastCompletionBefore(habit, dateStr) {
            const before = habit.completions.filter(c => c.date < dateStr);
            if (!before.length) return null;
            return before.sort((a, b) => b.date.localeCompare(a.date))[0].date;
        }

        function getDisplayScore(rawScore) {
            // Map -100 to +100 to -5 to +5
            return Math.round(rawScore / 20);
        }

        function updateHabitScore(habit) {
            const today = getTodayString();
            const scoreData = calculateMomentumScore(habit);
            habit.momentumScore = scoreData.raw;
            habit.lastScoreUpdate = today;
            return scoreData;
        }

        // Update all habit scores on page load (persists momentum changes for missed days)
        function updateAllHabitScores() {
            const habits = loadHabits();
            let changed = false;
            const today = getTodayString();

            habits.forEach(habit => {
                // Initialize momentum for habits that don't have lastScoreUpdate yet
                // (e.g., habits created before momentum tracking, or fresh PWA installs)
                if (!habit.lastScoreUpdate) {
                    habit.momentumScore = 0;
                    habit.lastScoreUpdate = today;
                    changed = true;
                    return;
                }

                // Update if habit has history and hasn't been updated today
                if (habit.lastScoreUpdate !== today) {
                    const scoreData = calculateMomentumScore(habit);
                    habit.momentumScore = scoreData.raw;
                    habit.lastScoreUpdate = today;
                    changed = true;
                }
            });

            if (changed) {
                saveHabits(habits);
            }
        }

        function renderScoreBadge(habit) {
            // Don't show badge for new habits with no tracking history
            if (!habit.lastScoreUpdate) return '';

            const scoreData = calculateMomentumScore(habit);
            const display = scoreData.display;

            // Only show if negative (use exclamation marks, max 3)
            if (display >= 0) return '';
            const exclamationCount = Math.min(3, Math.abs(display));
            return `<span class="score-badge red">${'!'.repeat(exclamationCount)}</span>`;
        }

        function renderOverdueBadge(daysOverdue) {
            // Convert overdue days to exclamation points for consistency
            if (daysOverdue <= 0) return '';
            const exclamationCount = Math.min(3, Math.ceil(daysOverdue / 2));
            return `<span class="score-badge red">${'!'.repeat(exclamationCount)}</span>`;
        }

        function freshStartHabit(id) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            if (habit) {
                const today = getTodayString();
                habit.momentumScore = 0;
                habit.lastScoreUpdate = today;
                habit.momentumResetDate = today; // For reminders: use this as reference point for neglect calculation
                saveHabits(habits);
                renderDetails();
                renderHabits();
            }
        }

        function resetHabitStats(id) {
            confirmDialog({ title: 'Reset stats?', message: 'Clears all completion history, subtask progress, and momentum for this habit. This cannot be undone.', confirmLabel: 'Reset', danger: true, onConfirm: () => {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            if (habit) {
                const today = getTodayString();
                habit.completions = [];
                habit.momentumScore = 0;
                habit.lastScoreUpdate = today;
                habit.momentumResetDate = today;
                habit.skippedDates = [];
                habit.snoozedUntil = null;
                delete habit.snoozedUntilPeriod;
                habit.snoozeHistory = [];
                delete habit.autoCompletedToday;
                if (habit.subtasks) {
                    habit.subtasks.forEach(s => { s.completedPeriods = {}; });
                }
                saveHabits(habits);
                renderDetails();
                renderHabits();
            }
            } });
        }

        function undoHabitCompletion(id) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            if (!habit) return;

            const today = getTodayString();
            const isTwiceDaily = habit.frequency.type === FREQ.TWICE_DAILY;

            // Remove today's completions
            if (isTwiceDaily) {
                // For twice daily, remove the most recent completion from today
                const todayCompletions = habit.completions.filter(c => c.date === today);
                if (todayCompletions.length > 0) {
                    const lastCompletion = todayCompletions[todayCompletions.length - 1];
                    habit.completions = habit.completions.filter(c => c !== lastCompletion);
                }
            } else {
                // For regular habits, remove all completions from today
                habit.completions = habit.completions.filter(c => c.date !== today);
            }

            // Also reset subtask completions for today
            if (habit.subtasks) {
                const periodKey = getSubtaskPeriodKey(habit);
                habit.subtasks.forEach(s => {
                    if (s.completedPeriods) {
                        delete s.completedPeriods[periodKey];
                    }
                });
            }

            saveHabits(habits);
            renderDetails();
            renderHabits();
        }

        function moveCompletionToToday(id) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            if (!habit || habit.completions.length === 0) return;

            const today = getTodayString();
            // Find the most recent completion that is NOT today
            const pastCompletions = habit.completions.filter(c => c.date !== today);
            if (pastCompletions.length === 0) return;

            // Sort by date descending, move the most recent one to today
            pastCompletions.sort((a, b) => b.date.localeCompare(a.date));
            const mostRecent = pastCompletions[0];
            mostRecent.date = today;
            mostRecent.timestamp = Date.now();

            saveHabits(habits);
            renderDetails();
            renderHabits();
        }

        // For habits scheduled for a future day (already completed in the
        // past, not yet due today): drop the most recent past completion so
        // today becomes due, but don't mark it complete. The user then taps
        // the green Complete button to actually complete it.
        function moveScheduleToToday(id) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            if (!habit || habit.completions.length === 0) return;

            const today = getTodayString();
            const pastCompletions = habit.completions.filter(c => c.date !== today);
            if (pastCompletions.length === 0) return;

            pastCompletions.sort((a, b) => b.date.localeCompare(a.date));
            const mostRecent = pastCompletions[0];
            habit.completions = habit.completions.filter(c => c !== mostRecent);

            saveHabits(habits);
            renderDetails();
            renderHabits();
        }

        // Description confirmation popup
        let confirmDescHabitId = null;
        let confirmDescPeriod = null;

        function openConfirmDescPopup(id, period = null) {
            const habit = loadHabits().find(h => h.id === id);
            if (!habit) return;
            confirmDescHabitId = id;
            confirmDescPeriod = period;

            // Render the description exactly like the subtask popup does
            // (same popupSection + formatDescription) so the two completion
            // popups are visually consistent — this one just has no subtask
            // rows and a Cancel/Complete footer.
            const descSection = popupDescriptionSection(habit);

            renderChecklistPopup('confirmDescPopup', {
                icon: habit.icon || '📌',
                title: habit.name,
                onClose: 'closeConfirmDescPopup()',
                items: [],
                marker: 'bullet',
                preamble: descSection + linkedAutoInfoHtml(habit),
                footer: `<div style="display:flex;gap:8px;margin-top:12px">
                    <button class="submit-btn secondary" onclick="closeConfirmDescPopup()" style="flex:1">Cancel</button>
                    <button class="submit-btn" onclick="confirmAndCompleteHabit()" style="flex:1;background:#4ade80">Complete</button>
                </div>`
            });
            showOverlay('confirmDescPopupOverlay');
        }

        function closeConfirmDescPopup() {
            hideOverlay('confirmDescPopupOverlay');
            confirmDescHabitId = null;
            confirmDescPeriod = null;
        }

        function confirmAndCompleteHabit() {
            const id = confirmDescHabitId;
            const period = confirmDescPeriod;
            closeConfirmDescPopup();
            doCompleteHabit(id, period, true);
            if (isOverlayActive('detailsOverlay')) closeDetails();
        }

        function completeHabit(id, period = null) {
            const habits = loadHabits(), habit = habits.find(h => h.id === id), today = getTodayString();
            if (!habit) return;

            // If habit has subtasks, show popup instead of completing directly
            if (habit.subtasks && habit.subtasks.length > 0) {
                openSubtaskPopup(id);
                return;
            }

            // If habit requires description confirmation and is not already completed, show popup
            const freqType = habit.frequency.type;
            const checkPeriod = (freqType === FREQ.TWICE_DAILY && !period) ? (getTimeOfDayNow() === PERIOD.MORNING ? PERIOD.MORNING : PERIOD.NIGHT) : period;
            const existing = habit.completions.find(c => c.date === today && (freqType !== FREQ.TWICE_DAILY || c.period === checkPeriod));
            if (habit.confirmDescription && habit.description && !existing) {
                openConfirmDescPopup(id, period);
                return;
            }

            doCompleteHabit(id, period);
        }

        // If `habit` has an autoCompletes link, mark the linked habit
        // complete for today (and hide it via autoCompletedToday).
        function triggerAutoComplete(habits, habit) {
            if (!habit.autoCompletes) return;
            const today = getTodayString();
            const autoId = Number(habit.autoCompletes);
            const linkedHabit = habits.find(h =>
                (autoId ? h.id === autoId : h.name.toLowerCase() === String(habit.autoCompletes).toLowerCase())
                && h.id !== habit.id);
            if (!linkedHabit) return;
            if (linkedHabit.completions.find(c => c.date === today)) return;
            linkedHabit.completions.push({ date: today, period: null, timestamp: Date.now(), autoCompleted: true });
            linkedHabit.autoCompletedToday = today;
            if (linkedHabit.snoozedUntil) {
                linkedHabit.snoozedUntil = null;
                delete linkedHabit.snoozedUntilPeriod;
            }
        }

        // Record a habit completion driven by finishing its subtasks.
        // Pushes the completion, applies the +15 momentum boost, arms
        // undo (rolling back today's subtask ticks), and fires any
        // auto-complete link once the habit is fully done. `period` is
        // the twice-daily period or null. Mutates `habits`; caller saves.
        function recordCompletion(habits, habit, period, periodKey) {
            const today = getTodayString();
            const timestamp = Date.now();
            const completion = { date: today, timestamp };
            if (period) completion.period = period;
            habit.completions.push(completion);
            habit.momentumScore = (habit.momentumScore || 0) + 15;
            habit.lastScoreUpdate = today;
            lastCompletion = { habitId: habit.id, date: today, period: period || null, timestamp, type: 'complete', resetSubtasks: true, periodKey };
            showUndoToast();
            if (isCompletedToday(habit)) triggerAutoComplete(habits, habit);
        }

        function doCompleteHabit(id, period = null, skipSubtaskCheck = false) {
            const habits = loadHabits(), habit = habits.find(h => h.id === id), today = getTodayString();
            if (!habit) return;

            // If habit has subtasks, show popup instead of completing directly
            if (!skipSubtaskCheck && habit.subtasks && habit.subtasks.length > 0) {
                openSubtaskPopup(id);
                return;
            }

            const freqType = habit.frequency.type;
            if (freqType === FREQ.TWICE_DAILY && !period) {
                period = getTimeOfDayNow() === PERIOD.MORNING ? PERIOD.MORNING : PERIOD.NIGHT;
            }
            // X-times-per-day accumulates: each tap adds another completion
            // rather than toggling today's single one off (undo via toast).
            const existing = freqType === FREQ.TIMES_PER_DAY
                ? null
                : habit.completions.find(c => c.date === today && (freqType !== FREQ.TWICE_DAILY || c.period === period));
            if (existing) {
                habit.completions = habit.completions.filter(c => c !== existing);
                hideUndoToast(); // Hide toast if uncompleting
            } else {
                const timestamp = Date.now();
                habit.completions.push({ date: today, period, timestamp });
                hapticFeedback();
                // Clear snooze when completed so habit follows normal cycle
                if (habit.snoozedUntil) {
                    habit.snoozedUntil = null;
                    delete habit.snoozedUntilPeriod;
                }
                // Track for undo
                lastCompletion = { habitId: id, date: today, period, timestamp, type: 'complete' };
                showUndoToast();
                // Reset momentum to neutral for reminders when completed
                if (habit.isReminder || freqType === FREQ.REMINDER) {
                    habit.momentumScore = 0;
                    habit.lastScoreUpdate = today;
                } else if (!habit.lastScoreUpdate) {
                    habit.lastScoreUpdate = today;
                    habit.momentumScore = 0;
                }

                triggerAutoComplete(habits, habit);
            }
            saveHabits(habits);
            renderHabits();
        }

        function completeHabitFromDetails(id) {
            const habits = loadHabits(), habit = habits.find(h => h.id === id);
            if (!habit) return;

            // If habit has subtasks, show popup instead
            if (habit.subtasks && habit.subtasks.length > 0) {
                openSubtaskPopup(id);
                return;
            }

            // For twice daily, complete the appropriate period
            if (habit.frequency.type === FREQ.TWICE_DAILY) {
                completeTwiceDaily(id);
            } else {
                completeHabit(id);
            }
            closeDetails();
        }

        function greyDetailsCompleteButton() {
            const btn = document.getElementById('detailsCompleteBtn');
            if (!btn || btn.dataset.greyed === '1') return;
            // Save originals so undo can restore them
            btn.dataset.greyed = '1';
            btn.dataset.originalOnclick = btn.getAttribute('onclick') || '';
            btn.dataset.originalBackground = btn.style.background;
            btn.dataset.originalColor = btn.style.color;
            btn.dataset.originalOpacity = btn.style.opacity;
            btn.dataset.originalCursor = btn.style.cursor;
            btn.disabled = true;
            btn.style.background = '#2a2a3e';
            btn.style.color = '#666';
            btn.style.opacity = '0.6';
            btn.style.cursor = 'default';
            btn.removeAttribute('onclick');
        }

        function ungreyDetailsCompleteButton() {
            const btn = document.getElementById('detailsCompleteBtn');
            if (!btn || btn.dataset.greyed !== '1') return;
            btn.disabled = false;
            btn.style.background = btn.dataset.originalBackground || '#4ade80';
            btn.style.color = btn.dataset.originalColor || '';
            btn.style.opacity = btn.dataset.originalOpacity || '';
            btn.style.cursor = btn.dataset.originalCursor || '';
            if (btn.dataset.originalOnclick) btn.setAttribute('onclick', btn.dataset.originalOnclick);
            delete btn.dataset.greyed;
            delete btn.dataset.originalOnclick;
            delete btn.dataset.originalBackground;
            delete btn.dataset.originalColor;
            delete btn.dataset.originalOpacity;
            delete btn.dataset.originalCursor;
        }

        // ========================================
        // HABIT STATE FUNCTIONS
        // ========================================

        let collapsedSections = {};

        function canDoNow(habit) {
            const today = getTodayString();
            const timeOfDay = getTimeOfDayNow();
            if (habit.skippedDates?.includes(today)) return false;
            if (isConflictSuppressed(habit)) return false;

            // Track if snooze just expired (snoozedUntil is today or in the past)
            let snoozeExpiredToday = false;
            if (habit.snoozedUntil) {
                if (habit.snoozedUntil === PERIOD.NIGHT && timeOfDay !== PERIOD.NIGHT) return false;
                if (habit.snoozedUntil !== PERIOD.NIGHT && habit.snoozedUntil > today) return false;
                // Snooze expired - habit should show regardless of natural frequency
                // (snoozedUntilPeriod was just about when to first show it, once that time passed it stays available)
                if (habit.snoozedUntil !== PERIOD.NIGHT && habit.snoozedUntil <= today) {
                    snoozeExpiredToday = true;
                }
            }

            const status = getCompletionStatus(habit);
            const freqType = habit.frequency.type;

            // Twice daily: only show in Morning and Bedtime periods
            if (freqType === FREQ.TWICE_DAILY) {
                if (timeOfDay === PERIOD.MORNING && !status.morningDone) return true;
                if (timeOfDay === PERIOD.NIGHT && !status.nightDone) return true;
                return false;
            }

            // Times/points per week/month: if target met, goes to Optional section
            if (freqType === FREQ.TIMES_PER_WEEK || freqType === FREQ.TIMES_PER_MONTH ||
                freqType === FREQ.POINTS_PER_WEEK || freqType === FREQ.POINTS_PER_MONTH) {
                const completedToday = habit.completions.some(c => c.date === today);
                if (completedToday) return false;
                if (status.completed) return false;
            } else if (status.completed) {
                return false;
            }
            // If snooze expired today, show habit regardless of natural due date
            if (!snoozeExpiredToday && !isDueToday(habit)) return false;
            // If snooze just expired, allow showing regardless of habit.timeOfDay
            // (e.g., a bedtime habit snoozed until tomorrow morning should appear in the morning)
            if (!snoozeExpiredToday && habit.timeOfDay === PERIOD.NIGHT && timeOfDay !== PERIOD.NIGHT) return false;
            return true;
        }

        function isCompletedToday(habit) {
            const today = getTodayString();
            // For twice daily, only fully completed (both periods) counts as "completed"
            if (habit.frequency.type === FREQ.TWICE_DAILY) {
                const status = getCompletionStatus(habit);
                return status.morningDone && status.nightDone;
            }
            // For points/times per day, only completed when daily target is met
            if (habit.frequency.type === FREQ.POINTS_PER_DAY || habit.frequency.type === FREQ.TIMES_PER_DAY) {
                const status = getCompletionStatus(habit);
                return status.completed;
            }
            // For habits with subtasks, completed means all subtasks done
            if (habit.subtasks && habit.subtasks.length > 0) {
                const progress = getSubtaskProgress(habit);
                return progress.completed === progress.total;
            }
            return habit.completions.some(c => c.date === today);
        }

        function isOptional(habit) {
            // Habits that can have extra completions after meeting their target
            // Only if allowOptional is true (default is true for backward compatibility)
            if (habit.allowOptional === false) return false;

            const freqType = habit.frequency.type;
            const today = getTodayString();
            const completedToday = habit.completions.some(c => c.date === today);

            // Twice daily and reminders don't support Allow Extra
            if (freqType === FREQ.TWICE_DAILY || freqType === FREQ.REMINDER) return false;

            // Daily/everyXDays: goes to Optional after completed today (can do extra)
            if (freqType === FREQ.DAILY || freqType === FREQ.EVERY_X_DAYS) {
                return completedToday;
            }

            // Points/times per day: goes to Optional when daily target met (can add more)
            if (freqType === FREQ.POINTS_PER_DAY || freqType === FREQ.TIMES_PER_DAY) {
                const status = getCompletionStatus(habit);
                return status.completed;
            }

            // Weekly/monthly/points: goes to Optional when target met (stays there for extra completions)
            if (freqType === FREQ.TIMES_PER_WEEK || freqType === FREQ.TIMES_PER_MONTH ||
                freqType === FREQ.POINTS_PER_WEEK || freqType === FREQ.POINTS_PER_MONTH) {
                const status = getCompletionStatus(habit);
                return status.completed; // Target met = optional (can do more)
            }

            return false;
        }

        function isForLater(habit) {
            const today = getTodayString();
            const timeOfDay = getTimeOfDayNow();
            if (habit.skippedDates?.includes(today)) return false;

            const status = getCompletionStatus(habit);

            // Twice daily: special handling - only fully done if BOTH periods complete
            if (habit.frequency.type === FREQ.TWICE_DAILY) {
                if (status.morningDone && status.nightDone) return false; // Fully done
                // Morning done, waiting for bedtime (during morning period)
                if (status.morningDone && !status.nightDone && timeOfDay === PERIOD.MORNING) return true;
                return false;
            }

            // For other habits: if fully completed, not for later
            if (status.completed) return false;

            // Night habits during non-night = tonight
            if (habit.timeOfDay === PERIOD.NIGHT && timeOfDay !== PERIOD.NIGHT) return true;
            // Only snoozed until tonight goes here (future snoozes are hidden entirely)
            if (habit.snoozedUntil === PERIOD.NIGHT && timeOfDay !== PERIOD.NIGHT) return true;
            return false;
        }

