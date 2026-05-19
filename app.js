        // ========================================
        // CONSTANTS
        // ========================================

        const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Frequency types
        const FREQ = {
            DAILY: 'daily',
            TWICE_DAILY: 'twiceDaily',
            EVERY_X_DAYS: 'everyXDays',
            TIMES_PER_PERIOD: 'timesPerPeriod',
            TIMES_PER_DAY: 'timesPerDay',
            TIMES_PER_WEEK: 'timesPerWeek',
            TIMES_PER_MONTH: 'timesPerMonth',
            POINTS_PER_DAY: 'pointsPerDay',
            POINTS_PER_WEEK: 'pointsPerWeek',
            POINTS_PER_MONTH: 'pointsPerMonth',
            REMINDER: 'reminder'
        };

        // Time periods
        const PERIOD = {
            DAY: 'day',
            WEEK: 'week',
            MONTH: 'month',
            MORNING: 'morning',
            NIGHT: 'night'
        };

        // Default values
        const DEFAULTS = {
            TIMES_PER_PERIOD: 3,
            POINTS_PER_PERIOD: 12,
            EVERY_X_DAYS: 2,
            REMINDER_DAYS: 3,
            POINTS_TARGET: 5,
            MORNING_START: 5,
            NIGHT_START: 18
        };

        const EMOJI_CATEGORIES = {
            'Health & Fitness': ['💪', '🏃', '🚴', '🏊', '🧘', '🤸', '⚽', '🏀', '🎾', '🏋️', '🏈', '⛳', '🥊', '🏄', '🧗', '🚶'],
            'Self-care': ['🦷', '💊', '💉', '🧴', '🛁', '💅', '💇', '😴', '🛌', '☀️', '🧖', '💆', '🩺', '🩹', '👁️', '🧘‍♀️'],
            'Food & Drink': ['🥗', '🍎', '🥤', '💧', '☕', '🍵', '🥛', '🥕', '🥦', '🍳', '🥑', '🍌', '🫐', '🥜', '🍽️', '🧊'],
            'Productivity': ['📚', '✍️', '💼', '📝', '💻', '📧', '📱', '🗂️', '📊', '🎯', '📈', '🗓️', '⏱️', '📋', '✅', '🔔'],
            'Creative': ['🎨', '🎵', '🎸', '🎹', '📷', '✏️', '🖌️', '🎭', '🎬', '🎤', '🎻', '📺', '🎮', '🎲', '📖', '🖼️'],
            'Home': ['🧹', '🧺', '🍳', '🛒', '🌱', '🪴', '🐕', '🐈', '🏠', '🛠️', '🗑️', '🧽', '🪥', '🛏️', '🚿', '🔧'],
            'Social & Spiritual': ['🙏', '📿', '❤️', '👨‍👩‍👧', '📞', '💬', '🤝', '😊', '🧠', '💭', '🫂', '👋', '💝', '🕯️', '✝️', '☮️'],
            'Nature & Weather': ['🌅', '🌙', '⏰', '📅', '🌤️', '🌧️', '❄️', '🔥', '⭐', '✨', '🌳', '🌻', '🦋', '🐝', '🌈', '🍂'],
            'Finance & Goals': ['💰', '💵', '🏦', '📉', '🎖️', '🏆', '🥇', '💎', '🎁', '🛍️', '💳', '🧾', '📑', '🔐', '🚀', '🌟']
        };
        // Flat array for compatibility
        const HABIT_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

        // ========================================
        // APPLICATION STATE
        // ========================================

        // Global app state
        let selectedHabitId = null;
        let detailsOpenedFromAllHabits = false; // Track if details was opened from All Habits view
        let debugDayOffset = 0;
        let debugHourOverride = null;
        let emojiPopupMode = null; // 'new' or habit id for edit
        let editModeHabitId = null; // Track which habit is being edited for emoji exclusion
        let newHabitSubtasks = []; // Subtasks for new habit creation

        // Habits cache for performance
        let habitsCache = null;

        // Undo state
        let lastCompletion = null; // { habitId, date, period, timestamp, type: 'complete'|'subtask' }
        let undoTimeout = null;

        // Unified form state - used by both Create and Edit modes
        let formMode = 'create'; // 'create' or 'edit'
        let formHabitId = null; // Habit ID when editing

        // Form state object - single source of truth for form data
        const formState = {
            name: '',                            // habit name
            description: '',                     // habit description
            showDescription: false,              // show description field
            time: null,                          // null = anytime, 'morning', 'night'
            frequency: FREQ.DAILY,               // dropdown value
            isReminderMode: false,               // task type: reminder vs regular
            isPointsMode: false,                 // measurement: points vs completions
            allowOptional: false,                // allow extra completions
            showSubtasks: false,                 // show subtasks input area
            icon: null,                          // selected emoji
            timesPeriod: PERIOD.WEEK,            // 'day', 'week' or 'month' for times
            pointsPeriod: PERIOD.WEEK,           // 'day', 'week' or 'month' for points
            afterPeriod: PERIOD.DAY,             // 'day', 'week' or 'month' for after completion
            // --- DISABLED: negative-habit feature (kept commented) ---
            // isNegative: false,                   // negative habit (track avoiding)
            noMomentum: false,                   // never track momentum (always neutral)
            confirmDescription: false,           // show description popup before completing
            autoCompletes: '',                   // habit ID to auto-complete when this is done
            showAutoCompletes: false,            // show auto-completes field
            linkedHabit: '',                     // habit ID of a companion habit (visual link only, bidirectional, no auto-completion)
            showLinkedHabit: false,              // show linked-habit field
            conflictsWith: '',                   // habit ID this conflicts with: hidden on days that habit is due
            showConflictsWith: false,            // show conflicts-with field
            sequentialSubtasks: false,           // subtasks must be completed in order; popup shows "Complete Next" instead of "Complete All"
            showAllPills: false,                 // expand the options list to show all pills (default hides least-used)
            everyXValue: null,                   // number value for "every X days/weeks/months"
            timesValue: null,                    // number value for "X times per period"
            pointsValue: null,                   // number value for "X points per period"
            dailyTimesValue: null,               // X times per day when frequency is Daily (1/null = once)
            delayHoursValue: null                // hours to hide a Daily×N habit after each completion (0/null = no delay)
        };

        // ========================================
        // FORM STATE MANAGEMENT
        // ========================================

        // Reset form state to defaults
        function resetFormState() {
            formState.name = '';
            formState.description = '';
            formState.showDescription = false;
            formState.time = null;
            formState.frequency = FREQ.DAILY;
            formState.isReminderMode = false;
            formState.isPointsMode = false;
            formState.allowOptional = false;
            formState.showSubtasks = false;
            formState.icon = null;
            formState.timesPeriod = PERIOD.WEEK;
            formState.pointsPeriod = PERIOD.WEEK;
            formState.afterPeriod = PERIOD.DAY;
            // --- DISABLED: negative-habit feature ---
            // formState.isNegative = false;
            formState.noMomentum = false;
            formState.confirmDescription = false;
            formState.autoCompletes = '';
            formState.showAutoCompletes = false;
            formState.linkedHabit = '';
            formState.showLinkedHabit = false;
            formState.conflictsWith = '';
            formState.showConflictsWith = false;
            formState.sequentialSubtasks = false;
            formState.showAllPills = false;
            formState.everyXValue = null;
            formState.timesValue = null;
            formState.pointsValue = null;
            formState.dailyTimesValue = null;
            formState.delayHoursValue = null;
        }

        // Initialize form state from habit (for edit mode)
        function initFormStateFromHabit(habit) {
            formState.name = habit.name || '';
            formState.description = habit.description || '';
            formState.showDescription = !!(habit.description);
            formState.icon = habit.icon || HABIT_EMOJIS[0];
            formState.allowOptional = habit.allowOptional !== false;
            formState.showSubtasks = (habit.subtasks?.length > 0); // Show if habit has existing subtasks

            // Determine mode based on frequency type and flags
            const freqType = habit.frequency.type;
            // Reminder is now a modifier - check both new flag and old frequency type for backward compat
            formState.isReminderMode = habit.isReminder || freqType === FREQ.REMINDER;
            formState.isPointsMode = freqType === FREQ.POINTS_PER_DAY || freqType === FREQ.POINTS_PER_WEEK || freqType === FREQ.POINTS_PER_MONTH;

            if (freqType === FREQ.REMINDER) {
                // Old reminder habits: map to Every X days
                formState.frequency = FREQ.EVERY_X_DAYS;
                formState.time = habit.timeOfDay;
            } else if (freqType === FREQ.TIMES_PER_DAY) {
                // X-times-per-day shows as Daily with an inline count.
                formState.frequency = FREQ.DAILY;
                formState.time = habit.timeOfDay;
            } else if (freqType === FREQ.POINTS_PER_DAY || freqType === FREQ.POINTS_PER_WEEK || freqType === FREQ.POINTS_PER_MONTH ||
                       freqType === FREQ.TIMES_PER_WEEK || freqType === FREQ.TIMES_PER_MONTH) {
                formState.frequency = FREQ.TIMES_PER_PERIOD;
                formState.time = habit.timeOfDay;
            } else {
                formState.frequency = freqType;
                formState.time = habit.timeOfDay;
            }

            formState.timesPeriod = (freqType === FREQ.TIMES_PER_DAY) ? PERIOD.DAY : ((freqType === FREQ.TIMES_PER_MONTH) ? PERIOD.MONTH : PERIOD.WEEK);
            formState.pointsPeriod = (freqType === FREQ.POINTS_PER_DAY) ? PERIOD.DAY : ((freqType === FREQ.POINTS_PER_MONTH) ? PERIOD.MONTH : PERIOD.WEEK);
            // Determine after period from habit frequency
            if (habit.frequency.everyXWeeks) formState.afterPeriod = PERIOD.WEEK;
            else if (habit.frequency.everyXMonths) formState.afterPeriod = PERIOD.MONTH;
            else formState.afterPeriod = PERIOD.DAY;

            // --- DISABLED: negative-habit feature ---
            // formState.isNegative = habit.isNegative || false;
            formState.noMomentum = habit.noMomentum || false;
            formState.confirmDescription = habit.confirmDescription || false;
            formState.autoCompletes = habit.autoCompletes || '';
            formState.showAutoCompletes = !!habit.autoCompletes;
            formState.linkedHabit = habit.linkedHabit || '';
            formState.showLinkedHabit = !!habit.linkedHabit;
            formState.conflictsWith = habit.conflictsWith || '';
            formState.showConflictsWith = !!habit.conflictsWith;
            formState.sequentialSubtasks = !!habit.sequentialSubtasks;
            formState.showAllPills = false;

            // Initialize number values from habit
            formState.everyXValue = habit.frequency.everyXDays || habit.frequency.everyXWeeks || habit.frequency.everyXMonths || null;
            formState.timesValue = habit.frequency.timesPerDay || habit.frequency.timesPerWeek || habit.frequency.timesPerMonth || null;
            formState.pointsValue = habit.frequency.pointsPerDay || habit.frequency.pointsPerWeek || habit.frequency.pointsPerMonth || null;
            formState.dailyTimesValue = (freqType === FREQ.TIMES_PER_DAY) ? (habit.frequency.timesPerDay || null) : null;
            formState.delayHoursValue = habit.frequency.delayHours || null;
        }

        // Get current form state (for compatibility with renderHabitForm)
        function getFormState(habit = null) {
            return formState;
        }

        // Wrap details-modal content so the header pins to the top while
        // everything else (body + action bar) scrolls beneath it (mirrors
        // the All Habits fixed-header pattern, scoped via the .details-*
        // classes to #detailsOverlay so other modals are unaffected).
        // Used by the edit form and the details view.
        // Shared bottom-sheet shell: pinned header + a single scrolling body
        // (the footer scrolls within the body for sheets). All sheets —
        // Create, Details, Edit, Settings, All Habits — use this structure.
        function renderSheet({ headerHtml, bodyHtml, footerHtml = '' }) {
            return `<div class="overlay-fixed-header">${headerHtml}</div>`
                 + `<div class="overlay-scroll">${bodyHtml}${footerHtml}</div>`;
        }
        // Back-compat alias used by the habit form / details view.
        function detailsShell(headerHtml, bodyHtml, footerHtml = '') {
            return renderSheet({ headerHtml, bodyHtml, footerHtml });
        }

        // Render the habit form (shared between Create and Edit modes)
        function renderHabitForm(habit = null) {
            const isEdit = formMode === 'edit';
            const state = getFormState(habit);
            const currentIcon = state.icon || (habit?.icon) || '📌';
            const habitName = escapeHtml(formState.name || '');
            const habitDesc = escapeHtml(formState.description || '');
            // Points only applies to the "Goal" schedule
            // (points per day/week/month) — disabled for every other type.
            const isTwiceDaily = state.frequency === FREQ.TWICE_DAILY;
            // Allow Extra is now compatible with all frequencies

            // Build frequency inputs (use lowercase IDs for create, camelCase with 'edit' prefix for edit)
            const idPrefix = isEdit ? 'edit' : '';
            let freqInputsHtml = '';
            if (state.frequency === FREQ.EVERY_X_DAYS) {
                const afterVal = state.everyXValue ?? habit?.frequency?.everyXDays ?? habit?.frequency?.everyXWeeks ?? habit?.frequency?.everyXMonths ?? DEFAULTS.EVERY_X_DAYS;
                freqInputsHtml = `<input type="number" class="frequency-input" id="${idPrefix}${isEdit ? 'E' : 'e'}veryXPeriod" value="${afterVal}" min="1">
                    <select class="period-select" onchange="setFormPeriod('after', this.value)">
                        <option value="${PERIOD.DAY}" ${state.afterPeriod === PERIOD.DAY ? 'selected' : ''}>day</option>
                        <option value="${PERIOD.WEEK}" ${state.afterPeriod === PERIOD.WEEK ? 'selected' : ''}>wk</option>
                        <option value="${PERIOD.MONTH}" ${state.afterPeriod === PERIOD.MONTH ? 'selected' : ''}>mo</option>
                    </select>`;
            } else if (state.frequency === FREQ.TIMES_PER_PERIOD) {
                const isP = state.isPointsMode;
                const numVal = isP
                    ? (state.pointsValue ?? habit?.frequency?.pointsPerDay ?? habit?.frequency?.pointsPerWeek ?? habit?.frequency?.pointsPerMonth ?? DEFAULTS.POINTS_PER_PERIOD)
                    : (state.timesValue ?? habit?.frequency?.timesPerDay ?? habit?.frequency?.timesPerWeek ?? habit?.frequency?.timesPerMonth ?? DEFAULTS.TIMES_PER_PERIOD);
                const numId = `${idPrefix}${isP ? (isEdit ? 'P' : 'p') + 'ointsPerPeriod' : (isEdit ? 'T' : 't') + 'imesPerPeriod'}`;
                const periodState = isP ? state.pointsPeriod : state.timesPeriod;
                const periodType = isP ? 'points' : 'times';
                freqInputsHtml = `<input type="number" class="frequency-input" id="${numId}" value="${numVal}" min="1"${isP ? '' : ' max="31"'}>
                        <select class="period-select" onchange="toggleFormPointsMode()">
                            <option value="times" ${isP ? '' : 'selected'}>times</option>
                            <option value="points" ${isP ? 'selected' : ''}>points</option>
                        </select>
                        <span style="color:#888">/</span>
                        <select class="period-select" onchange="setFormPeriod('${periodType}', this.value)">
                            <option value="${PERIOD.DAY}" ${periodState === PERIOD.DAY ? 'selected' : ''}>day</option>
                            <option value="${PERIOD.WEEK}" ${periodState === PERIOD.WEEK ? 'selected' : ''}>wk</option>
                            <option value="${PERIOD.MONTH}" ${periodState === PERIOD.MONTH ? 'selected' : ''}>mo</option>
                        </select>`;
            } else if (state.frequency === FREQ.DAILY) {
                const dailyVal = state.dailyTimesValue ?? habit?.frequency?.timesPerDay ?? 1;
                freqInputsHtml = `<input type="number" class="frequency-input" id="${idPrefix}${isEdit ? 'D' : 'd'}ailyTimes" value="${dailyVal}" min="1" max="31" oninput="rerenderForm()"><span style="color:#888">× / day</span>`;
            }

            // Subtasks section (show if toggle is on OR habit has existing subtasks)
            const subtasks = isEdit ? (habit?.subtasks || []) : newHabitSubtasks;
            const showSubtasksArea = state.showSubtasks || subtasks.length > 0;
            let subtasksHtml = '';
            if (showSubtasksArea || subtasks.length > 0) {
                const subtaskItems = isEdit ? subtasks.map((s, i) => `
                    <div class="subtask-item" data-subtask-id="${s.id}" data-index="${i}"
                        ondragover="handleSubtaskDragOver(event)"
                        ondragleave="handleSubtaskDragLeave(event)"
                        ondrop="handleSubtaskDrop(event, 'edit', ${habit.id})">
                        <span class="subtask-drag-handle" draggable="true"
                            ondragstart="handleSubtaskDragStart(event, 'edit', ${habit.id})"
                            ontouchstart="handleSubtaskTouchStart(event, 'edit', ${habit.id})"
                            ontouchmove="handleSubtaskTouchMove(event)"
                            ontouchend="handleSubtaskTouchEnd(event)"
                            ontouchcancel="handleSubtaskTouchEnd(event)">⋮⋮</span>
                        <textarea class="subtask-name-input" rows="1"
                            oninput="autoGrowSubtask(this)"
                            onchange="updateEditSubtask(${habit.id}, ${s.id}, this.value)"
                            onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${escapeHtml(s.name)}</textarea>
                        <span class="subtask-delete" onclick="deleteSubtask(${habit.id}, ${s.id})">✕</span>
                    </div>
                `).join('') : subtasks.map((s, i) => `
                    <div class="subtask-item" data-subtask-id="${s.id}" data-index="${i}"
                        ondragover="handleSubtaskDragOver(event)"
                        ondragleave="handleSubtaskDragLeave(event)"
                        ondrop="handleSubtaskDrop(event, 'new')">
                        <span class="subtask-drag-handle" draggable="true"
                            ondragstart="handleSubtaskDragStart(event, 'new')"
                            ontouchstart="handleSubtaskTouchStart(event, 'new')"
                            ontouchmove="handleSubtaskTouchMove(event)"
                            ontouchend="handleSubtaskTouchEnd(event)"
                            ontouchcancel="handleSubtaskTouchEnd(event)">⋮⋮</span>
                        <textarea class="subtask-name-input" rows="1"
                            oninput="autoGrowSubtask(this)"
                            onchange="updateNewHabitSubtask(${s.id}, this.value)"
                            onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${escapeHtml(s.name)}</textarea>
                        <span class="subtask-delete" onclick="removeNewHabitSubtask(${s.id})">✕</span>
                    </div>
                `).join('');

                // Only show the scroll container if there are subtasks
                const hasSubtasks = subtaskItems.length > 0;
                subtasksHtml = `
                    <div class="form-group" id="${isEdit ? 'editSubtasksArea' : 'subtasksInputArea'}" style="${showSubtasksArea ? '' : 'display:none'}">
                        <label class="form-label">Subtasks</label>
                        <label style="display:flex;align-items:center;gap:8px;margin:2px 0 8px;color:#aaa;font-size:0.82rem;cursor:pointer">
                            <input type="checkbox" ${state.sequentialSubtasks ? 'checked' : ''} onchange="setFormSequentialSubtasks(this.checked)" style="accent-color:#667eea">
                            <span>Complete in order (sequential)</span>
                        </label>
                        ${hasSubtasks ? `<div class="subtasks-scroll-container" id="${isEdit ? 'editSubtasksList' : 'newHabitSubtasksList'}">${subtaskItems}</div>` : `<div id="${isEdit ? 'editSubtasksList' : 'newHabitSubtasksList'}"></div>`}
                        <div class="add-subtask">
                            <input type="text" id="${isEdit ? 'editSubtaskInput' : 'newHabitSubtaskInput'}" placeholder="Add subtask..."
                                onkeypress="if(event.key==='Enter'){event.preventDefault();${isEdit ? `addSubtask(${habit.id})` : 'addNewHabitSubtask()'};}">
                            <button type="button" onclick="${isEdit ? `addSubtask(${habit.id})` : 'addNewHabitSubtask()'}">+</button>
                        </div>
                    </div>`;
            }

            const reminderDays = habit?.frequency?.reminderDays || DEFAULTS.REMINDER_DAYS;

            const _hdr = `
                <div class="modal-header">
                    <h2 class="modal-title">${isEdit ? 'Edit Habit' : 'New Habit'}</h2>
                    <button class="modal-close" onclick="${isEdit ? 'closeDetails' : 'closeModal'}()">&times;</button>
                </div>`;
            const _body = `
                <div class="form-group">
                    <div style="display:flex;gap:10px;margin-bottom:6px">
                        <label class="form-label" style="margin:0;width:52px;flex-shrink:0">Icon</label>
                        <label class="form-label" style="margin:0;flex:1">Name</label>
                        <label class="form-label" style="margin:0;width:86px;flex-shrink:0;${isTwiceDaily ? 'opacity:0.4' : ''}">Time</label>
                    </div>
                    <div style="display:flex;gap:10px;align-items:stretch;height:48px">
                        <div class="emoji-select-btn" onclick="openEmojiPopup('${isEdit ? 'edit' : 'new'}'${isEdit ? `, ${habit.id}` : ''})" style="flex-shrink:0;width:52px;justify-content:center;box-sizing:border-box;font-size:1.3rem">
                            <span class="emoji-select-icon" id="${isEdit ? 'editSelectedEmojiDisplay' : 'selectedEmojiDisplay'}" style="width:auto;height:auto">${currentIcon}</span>
                        </div>
                        <input type="text" class="form-input" id="${isEdit ? 'editHabitName' : 'habitInput'}" value="${habitName}" placeholder="e.g., Brush teeth..." style="flex:1;margin:0;box-sizing:border-box" onkeypress="if(event.key==='Enter')${isEdit ? 'saveHabitEdit' : 'addHabit'}()" />
                        <div class="time-toggle ${isTwiceDaily ? 'disabled' : ''}" id="${isEdit ? 'editTimeToggle' : 'timeToggle'}" style="height:100%">
                            <button type="button" class="time-toggle-btn ${state.time === PERIOD.MORNING ? 'active' : ''}" data-time="morning" onclick="${isTwiceDaily ? '' : `toggleFormTime('${PERIOD.MORNING}')`}">🌅</button>
                            <button type="button" class="time-toggle-btn ${state.time === PERIOD.NIGHT ? 'active' : ''}" data-time="night" onclick="${isTwiceDaily ? '' : `toggleFormTime('${PERIOD.NIGHT}')`}">🌙</button>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" style="display:flex;align-items:center;gap:6px">
                        <span>Options</span>
                        <button type="button" class="tag-glossary-btn" onclick="openTagGlossary()" aria-label="What do these tags do?">?</button>
                    </label>
                    <div class="task-options">
                        ${(() => {
                            // Build the pill list once, then sort the inactive
                            // ones by how often each option is used across the
                            // user's existing habits. The least-used inactive
                            // pills get hidden behind a "More" chip so the
                            // form stays compact for new users while power
                            // users still see the options they reach for most.
                            const allHabits = loadHabits();
                            const count = fn => allHabits.filter(fn).length;
                            const pills = [
                                { id: 'subtasks',    label: 'Subtasks',      active: state.showSubtasks,        domId: isEdit ? 'editSubtasksPill' : 'subtasksPill',           onclick: 'toggleFormSubtasks()',          usage: count(h => h.subtasks?.length > 0) },
                                { id: 'reminder',    label: 'Reminder',      active: state.isReminderMode,      domId: isEdit ? 'editReminderPill' : 'reminderPill',           onclick: 'toggleFormReminderMode()',      usage: count(h => h.isReminder || h.frequency?.type === FREQ.REMINDER) },
                                { id: 'desc',        label: 'Description',   active: state.showDescription,     domId: isEdit ? 'editDescPill' : 'descPill',                   onclick: 'toggleFormDescription()',       usage: count(h => !!h.description) },
                                { id: 'noMomentum',  label: 'Untracked',   active: state.noMomentum,          domId: isEdit ? 'editNoMomentumPill' : 'noMomentumPill',       onclick: 'toggleFormNoMomentum()',        usage: count(h => h.noMomentum) },
                                { id: 'conflicts',   label: 'Conflicts',     active: state.showConflictsWith,   domId: isEdit ? 'editConflictsPill' : 'conflictsPill',         onclick: 'toggleFormConflictsWith()',     usage: count(h => !!h.conflictsWith) },
                                { id: 'autoComplete', label: 'Auto-complete', active: state.showAutoCompletes,   domId: isEdit ? 'editAutoCompletePill' : 'autoCompletePill',   onclick: 'toggleFormAutoCompletes()',     usage: count(h => !!h.autoCompletes) },
                                { id: 'linkedHabit',  label: 'Linked',        active: state.showLinkedHabit,     domId: isEdit ? 'editLinkedPill' : 'linkedPill',               onclick: 'toggleFormLinkedHabit()',       usage: count(h => !!h.linkedHabit) },
                            ].filter(p => !(getSettings().disabledTags || []).includes(p.id));

                            // Render every pill with its usage as data so the
                            // post-render fitter (fitOptionsToTwoLines) can
                            // hide the least-used inactive ones until the
                            // pill row is at most two lines tall. The More
                            // chip starts hidden and only shows if the fitter
                            // had to hide anything.
                            const renderPill = p => {
                                const cls = `option-pill ${p.active ? 'active' : ''} ${p.extraClass || ''}`.trim();
                                const styleAttr = p.active && p.activeStyle ? ` style="${p.activeStyle}"` : '';
                                return `<label class="${cls}" id="${p.domId}" data-usage="${p.usage}" onclick="${p.onclick}"${styleAttr}>
                                    <span class="option-pill-check">✓</span>
                                    <span>${p.label}</span>
                                </label>`;
                            };
                            const moreInitialStyle = state.showAllPills ? 'display:none' : 'display:none';
                            const more = `<label class="option-pill option-pill-more" onclick="toggleFormShowAllPills()" style="${moreInitialStyle}">
                                <span>+ More</span>
                            </label>`;
                            return pills.map(renderPill).join('') + more;
                        })()}
                    </div>
                </div>
                ${state.showDescription ? `<div class="form-group">
                    <label class="form-label">Description</label>
                    <label style="display:flex;align-items:center;gap:8px;margin:2px 0 8px;color:#aaa;font-size:0.82rem;cursor:pointer">
                        <input type="checkbox" ${state.confirmDescription ? 'checked' : ''} onchange="setFormConfirmDescription(this.checked)" style="accent-color:#667eea">
                        <span>Show description before completing</span>
                    </label>
                    <textarea class="form-input" id="${isEdit ? 'editHabitDesc' : 'habitDesc'}" placeholder="Add a description..." rows="2" style="resize:none;font-size:0.85rem">${habitDesc}</textarea>
                </div>` : ''}
                ${state.showAutoCompletes ? `<div class="form-group">
                    <label class="form-label">Auto-completes another habit</label>
                    <select class="form-input" id="${isEdit ? 'editAutoCompletes' : 'autoCompletes'}" style="font-size:0.85rem">
                        <option value="">None</option>
                        ${loadHabits().filter(h => !habit || h.id !== habit.id).map(h =>
                            `<option value="${h.id}" ${String(state.autoCompletes) === String(h.id) ? 'selected' : ''}>${h.icon || '📌'} ${escapeHtml(h.name)}</option>`
                        ).join('')}
                    </select>
                </div>` : ''}
                ${state.showLinkedHabit ? `<div class="form-group">
                    <label class="form-label">Linked with (often done together)</label>
                    <select class="form-input" id="${isEdit ? 'editLinkedHabit' : 'linkedHabit'}" style="font-size:0.85rem">
                        <option value="">None</option>
                        ${loadHabits().filter(h => !habit || h.id !== habit.id).map(h =>
                            `<option value="${h.id}" ${String(state.linkedHabit) === String(h.id) ? 'selected' : ''}>${h.icon || '📌'} ${escapeHtml(h.name)}</option>`
                        ).join('')}
                    </select>
                </div>` : ''}
                ${state.showConflictsWith ? `<div class="form-group">
                    <label class="form-label">Conflicts with (hidden on days that habit is due)</label>
                    <select class="form-input" id="${isEdit ? 'editConflictsWith' : 'conflictsWith'}" style="font-size:0.85rem">
                        <option value="">None</option>
                        ${loadHabits().filter(h => !habit || h.id !== habit.id).map(h =>
                            `<option value="${h.id}" ${String(state.conflictsWith) === String(h.id) ? 'selected' : ''}>${h.icon || '📌'} ${escapeHtml(h.name)}</option>`
                        ).join('')}
                    </select>
                </div>` : ''}
                <div class="form-group" id="${isEdit ? 'editFrequencyGroup' : 'frequencyGroup'}">
                    <label class="form-label">Schedule</label>
                    <div class="frequency-row" id="${isEdit ? 'editFrequencyRow' : 'frequencyRow'}">
                        <select class="form-input" id="${isEdit ? 'editFrequencySelect' : 'frequencySelect'}" onchange="selectFormFrequency(this.value)" style="flex:1">
                            <option value="${FREQ.DAILY}" ${state.frequency === FREQ.DAILY ? 'selected' : ''}>Daily</option>
                            <option value="${FREQ.TWICE_DAILY}" ${state.frequency === FREQ.TWICE_DAILY ? 'selected' : ''}>Morning & Bedtime</option>
                            <option value="${FREQ.EVERY_X_DAYS}" ${state.frequency === FREQ.EVERY_X_DAYS ? 'selected' : ''}>Completion</option>
                            <option value="${FREQ.TIMES_PER_PERIOD}" ${state.frequency === FREQ.TIMES_PER_PERIOD ? 'selected' : ''}>Goal</option>
                        </select>
                        <div id="${isEdit ? 'editFrequencyInputs' : 'frequencyInputs'}">${freqInputsHtml}</div>
                    </div>
                    ${(state.frequency === FREQ.DAILY && (state.dailyTimesValue ?? habit?.frequency?.timesPerDay ?? 1) > 1) ? `<div class="frequency-row" style="justify-content:space-between;margin-top:8px">
                        <span style="color:#aaa;font-size:0.85rem">Hide after each completion</span>
                        <div style="display:flex;align-items:center;gap:6px">
                            <input type="number" class="frequency-input" id="${isEdit ? 'editDelayHours' : 'delayHours'}" value="${state.delayHoursValue ?? habit?.frequency?.delayHours ?? 0}" min="0" max="24">
                            <span style="color:#888">hours</span>
                        </div>
                    </div>` : ''}
                </div>
                ${subtasksHtml}`;
            const _footer = `
                <div class="action-buttons">
                    ${isEdit
                        ? `<div class="action-row">
                            <button class="submit-btn" onclick="saveHabitEdit()">Save Changes</button>
                            <button class="submit-btn secondary" onclick="toggleEditMode()">Cancel</button>
                        </div>`
                        : `<button class="submit-btn" onclick="addHabit()">Add Habit</button>`}
                </div>`;
            // Edit form lives in the details modal → pin header/footer.
            // Create form keeps its single-scroll layout unchanged.
            return renderSheet({ headerHtml: _hdr, bodyHtml: _body, footerHtml: _footer });
        }

        // ========================================
        // UNIFIED FORM FUNCTIONS
        // ========================================

        // Re-render form based on current mode
        function rerenderForm() {
            // Save name and description from inputs before re-rendering
            const nameInputId = formMode === 'edit' ? 'editHabitName' : 'habitInput';
            const descInputId = formMode === 'edit' ? 'editHabitDesc' : 'habitDesc';
            const nameInput = document.getElementById(nameInputId);
            const descInput = document.getElementById(descInputId);
            if (nameInput) {
                formState.name = nameInput.value;
            }
            if (descInput) {
                formState.description = descInput.value;
            }

            // Save number input values before re-rendering
            const isEdit = formMode === 'edit';
            const autoCompletesSelect = document.getElementById(isEdit ? 'editAutoCompletes' : 'autoCompletes');
            if (autoCompletesSelect) formState.autoCompletes = autoCompletesSelect.value;
            const linkedHabitSelect = document.getElementById(isEdit ? 'editLinkedHabit' : 'linkedHabit');
            if (linkedHabitSelect) formState.linkedHabit = linkedHabitSelect.value;
            const conflictsWithSelect = document.getElementById(isEdit ? 'editConflictsWith' : 'conflictsWith');
            if (conflictsWithSelect) formState.conflictsWith = conflictsWithSelect.value;
            const everyXInput = document.getElementById(isEdit ? 'editEveryXPeriod' : 'everyXPeriod');
            const timesInput = document.getElementById(isEdit ? 'editTimesPerPeriod' : 'timesPerPeriod');
            const pointsInput = document.getElementById(isEdit ? 'editPointsPerPeriod' : 'pointsPerPeriod');
            const dailyTimesInput = document.getElementById(isEdit ? 'editDailyTimes' : 'dailyTimes');
            const delayHoursInput = document.getElementById(isEdit ? 'editDelayHours' : 'delayHours');
            if (everyXInput) formState.everyXValue = parseInt(everyXInput.value) || null;
            if (timesInput) formState.timesValue = parseInt(timesInput.value) || null;
            if (pointsInput) formState.pointsValue = parseInt(pointsInput.value) || null;
            if (dailyTimesInput) formState.dailyTimesValue = parseInt(dailyTimesInput.value) || null;
            if (delayHoursInput) formState.delayHoursValue = parseInt(delayHoursInput.value) || null;

            // Remember focused element to restore after re-render
            const focusedId = document.activeElement?.id;
            const focusedSelStart = document.activeElement?.selectionStart;
            const focusedSelEnd = document.activeElement?.selectionEnd;

            if (formMode === 'create') {
                document.getElementById('createModal').innerHTML = renderHabitForm();
            } else {
                const habit = loadHabits().find(h => h.id === formHabitId);
                document.getElementById('detailsModal').innerHTML = renderHabitForm(habit);
            }
            fitOptionsToTwoLines();
            growSubtaskInputs();

            // Restore focus to the same input after re-render. Skip <select>
            // elements — re-focusing them on mobile re-opens the dropdown
            // immediately after the user just picked a value, which feels
            // broken.
            if (focusedId) {
                const el = document.getElementById(focusedId);
                if (el && el.tagName !== 'SELECT') {
                    el.focus();
                    if (typeof focusedSelStart === 'number' && el.setSelectionRange) {
                        try { el.setSelectionRange(focusedSelStart, focusedSelEnd); } catch(e) {}
                    }
                }
            }
        }

        // Unified period setter
        function setFormPeriod(type, period) {
            if (type === 'times') {
                formState.timesPeriod = period;
            } else if (type === 'after') {
                formState.afterPeriod = period;
            } else {
                formState.pointsPeriod = period;
            }
            rerenderForm();
        }

        // Unified toggle functions
        function toggleFormTime(t) {
            formState.time = formState.time === t ? null : t;
            rerenderForm();
        }

        function toggleFormReminderMode() {
            formState.isReminderMode = !formState.isReminderMode;
            rerenderForm();
        }

        function toggleFormPointsMode() {
            // Points only makes sense with the "Goal" schedule.
            if (formState.frequency !== FREQ.TIMES_PER_PERIOD) return;
            formState.isPointsMode = !formState.isPointsMode;
            rerenderForm();
        }

        function toggleFormAllowOptional() {
            formState.allowOptional = !formState.allowOptional;
            rerenderForm();
        }

        function toggleFormDescription() {
            formState.showDescription = !formState.showDescription;
            rerenderForm();
            if (formState.showDescription) {
                const inputId = formMode === 'edit' ? 'editHabitDesc' : 'habitDesc';
                setTimeout(() => document.getElementById(inputId)?.focus(), 0);
            }
        }

        // --- DISABLED: negative-habit feature (orphaned; kept commented) ---
        // function toggleFormNegative() {
        //     formState.isNegative = !formState.isNegative;
        //     rerenderForm();
        // }

        // Confirm is a sub-option of Description (checkbox under the
        // textarea), not a standalone tag — no rerender needed since it
        // doesn't change the form layout.
        function setFormConfirmDescription(checked) {
            formState.confirmDescription = !!checked;
        }

        function toggleFormNoMomentum() {
            formState.noMomentum = !formState.noMomentum;
            rerenderForm();
        }

        function toggleFormAutoCompletes() {
            formState.showAutoCompletes = !formState.showAutoCompletes;
            rerenderForm();
        }

        function toggleFormLinkedHabit() {
            formState.showLinkedHabit = !formState.showLinkedHabit;
            rerenderForm();
        }

        function toggleFormConflictsWith() {
            formState.showConflictsWith = !formState.showConflictsWith;
            rerenderForm();
        }

        function toggleFormShowAllPills() {
            formState.showAllPills = !formState.showAllPills;
            rerenderForm();
        }

        // After the form HTML is in the DOM, walk the option pills and hide
        // the least-used inactive ones until the row is at most two lines
        // tall. The "More" chip is shown only when something was hidden.
        // Skipped entirely when the user has expanded the row via "More".
        function fitOptionsToTwoLines() {
            const container = document.querySelector('.task-options');
            if (!container) return;
            const moreChip = container.querySelector('.option-pill-more');
            const pills = Array.from(container.children).filter(c => c !== moreChip);
            if (!pills.length) return;

            // Reset to a known state: everything visible, More hidden.
            pills.forEach(p => { p.style.display = ''; });
            if (moreChip) moreChip.style.display = 'none';

            if (formState.showAllPills) return; // user opted into see-everything

            const rowCount = () => {
                const tops = new Set();
                Array.from(container.children).forEach(c => {
                    if (c.style.display !== 'none') tops.add(c.offsetTop);
                });
                return tops.size;
            };

            if (rowCount() <= 2) return;

            // Need to hide pills. Show More chip, then hide inactive pills
            // in least-used order until we fit two lines (including More).
            if (moreChip) moreChip.style.display = '';
            const candidates = pills
                .filter(p => !p.classList.contains('active'))
                .sort((a, b) =>
                    parseInt(a.dataset.usage || '0', 10) - parseInt(b.dataset.usage || '0', 10)
                );
            for (const pill of candidates) {
                pill.style.display = 'none';
                if (rowCount() <= 2) return;
            }
        }

        // Subtask name fields are wrapping <textarea>s so long items are
        // fully visible/editable; grow them to fit their content.
        function autoGrowSubtask(el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
        function growSubtaskInputs() {
            document.querySelectorAll('.subtask-name-input').forEach(autoGrowSubtask);
        }

        // Sequential is a sub-option of Subtasks (checkbox in the
        // subtasks area), not a standalone tag — no rerender needed.
        function setFormSequentialSubtasks(checked) {
            formState.sequentialSubtasks = !!checked;
        }

        // Glossary describing every option pill so the user can look up what
        // each tag actually does without having to experiment.
        // Canonical tag/option list (id matches the form pills). Settings →
        // Tags lets the user move each between Active/Inactive; only Active
        // tags appear as option pills in the habit form.
        const TAG_LIST = [
            { id: 'subtasks',   label: 'Subtasks' },
            { id: 'reminder',   label: 'Reminder' },
            { id: 'desc',       label: 'Description' },
            { id: 'noMomentum', label: 'Untracked' },
            { id: 'conflicts',  label: 'Conflicts' },
            { id: 'autoComplete', label: 'Auto-complete' },
            { id: 'linkedHabit',  label: 'Linked' },
        ];

        const TAG_GLOSSARY = [
            { label: 'Subtasks',      desc: 'Break the habit into a checklist; the habit auto-completes when every subtask is done.' },
            { label: 'Reminder',      desc: 'Treat as a recurring nudge rather than a streak — momentum resets to zero on completion instead of building up.' },
            { label: 'Description',   desc: 'Attach freeform notes that show on the details page.' },
            { label: 'Untracked',   desc: 'Never tracks momentum — always neutral, no reward or penalty for skipping. Good for scheduled treats. Still appears on its normal cadence like any habit.' },
            { label: 'Conflicts',     desc: 'Hide this habit on any day the chosen habit is due (e.g. skip serum on shampoo days). One-way; momentum is not penalized for those days.' },
            { label: 'Auto-complete', desc: 'Completing this habit also marks another chosen habit done for the day (one-way). Off by default — enable in Settings → Tags.' },
            { label: 'Linked',        desc: 'Visually pair this habit with a companion you usually do together (bidirectional, no auto-completion). Off by default — enable in Settings → Tags.' },
        ];

        function openTagGlossary() {
            // Only reference the tags that are Active in Settings → Tags.
            const disabled = getSettings().disabledTags || [];
            const disabledLabels = new Set(
                TAG_LIST.filter(t => disabled.includes(t.id)).map(t => t.label));
            const visible = TAG_GLOSSARY.filter(t => !disabledLabels.has(t.label));
            const rows = visible.length ? visible.map(t =>
                `<div style="padding:8px 0;border-bottom:1px solid #2a2a3e">
                    <div style="font-weight:600;color:#e0e0e0;font-size:0.9rem;margin-bottom:2px">${t.label}</div>
                    <div style="color:#aaa;font-size:0.8rem;line-height:1.4">${t.desc}</div>
                </div>`
            ).join('') : `<div style="color:#666;font-size:0.85rem;padding:8px 0">No options are active. Enable some in Settings → Tags.</div>`;
            renderPopup('tagGlossaryPopup', {
                title: 'Options reference', onClose: 'closeTagGlossary()',
                bodyHtml: rows,
                footerHtml: `<div style="padding:10px 14px"><button class="submit-btn" style="width:100%" onclick="closeTagGlossary()">Close</button></div>`
            });
            showOverlay('tagGlossaryOverlay');
        }

        function closeTagGlossary() {
            hideOverlay('tagGlossaryOverlay');
        }

        // Bidirectionally sync the linkedHabit field. When habit A links to
        // B, B's link is set to A — and any previous partner of either is
        // cleared so we never end up with a triangle. Mutates `habits` in
        // place; caller is responsible for saveHabits().
        function syncLinkedHabit(habits, habitId, newLinkedRaw) {
            const habit = habits.find(h => h.id === habitId);
            if (!habit) return;
            const newLinkedId = Number(newLinkedRaw) || null;
            const oldLinkedId = Number(habit.linkedHabit) || null;

            const clearPartnerIfPointsBack = (partnerId, expectedTargetId) => {
                if (!partnerId) return;
                const partner = habits.find(h => h.id === partnerId);
                if (partner && Number(partner.linkedHabit) === expectedTargetId) {
                    partner.linkedHabit = '';
                }
            };

            // Drop the old partner's link to this habit if it pointed back.
            if (oldLinkedId && oldLinkedId !== newLinkedId) {
                clearPartnerIfPointsBack(oldLinkedId, habitId);
            }

            habit.linkedHabit = newLinkedId || '';

            // Wire up the new partner. If the new partner already pointed
            // somewhere else, clear that stale back-link too.
            if (newLinkedId && newLinkedId !== habitId) {
                const newPartner = habits.find(h => h.id === newLinkedId);
                if (newPartner) {
                    const newPartnerOldLink = Number(newPartner.linkedHabit) || null;
                    if (newPartnerOldLink && newPartnerOldLink !== habitId) {
                        clearPartnerIfPointsBack(newPartnerOldLink, newLinkedId);
                    }
                    newPartner.linkedHabit = habitId;
                }
            }
        }

        function toggleFormSubtasks() {
            formState.showSubtasks = !formState.showSubtasks;
            rerenderForm();
            if (formState.showSubtasks) {
                const inputId = formMode === 'edit' ? 'editSubtaskInput' : 'newHabitSubtaskInput';
                setTimeout(() => document.getElementById(inputId)?.focus(), 0);
            }
        }

        function selectFormFrequency(f) {
            formState.frequency = f;
            // Reset time for Twice Daily (it's implicit)
            if (f === FREQ.TWICE_DAILY) {
                formState.time = null;
            }
            // Points only applies to the "Goal" schedule; clear it otherwise.
            if (f !== FREQ.TIMES_PER_PERIOD && formState.isPointsMode) {
                formState.isPointsMode = false;
            }
            rerenderForm();
        }

        function getUsedIcons(excludeId = null) {
            const habits = loadHabits();
            return new Set(habits.filter(h => h.id !== excludeId && h.icon).map(h => h.icon));
        }

        function openEmojiPopup(mode, habitId = null) {
            emojiPopupMode = mode;
            editModeHabitId = habitId;
            renderEmojiPopup();
            showOverlay('emojiPopupOverlay');
        }

        function closeEmojiPopup() {
            hideOverlay('emojiPopupOverlay');
            emojiPopupMode = null;
            editModeHabitId = null;
        }

        function renderEmojiPopup() {
            const excludeId = emojiPopupMode === 'new' ? null : editModeHabitId;
            const usedIcons = getUsedIcons(excludeId);
            let html = '';
            for (const [category, emojis] of Object.entries(EMOJI_CATEGORIES)) {
                html += `<div class="emoji-category">
                    <div class="emoji-category-header">${category}</div>
                    <div class="emoji-category-grid">
                        ${emojis.map(e => {
                            const isUsed = usedIcons.has(e);
                            const isSelected = e === formState.icon;
                            return `<div class="emoji-option ${isSelected ? 'selected' : ''} ${isUsed ? 'used' : ''}"
                                onclick="selectEmojiFromPopup('${e}')">${e}</div>`;
                        }).join('')}
                    </div>
                </div>`;
            }
            renderPopup('emojiPopup', {
                title: 'Choose icon', onClose: 'closeEmojiPopup()',
                bodyHtml: html
            });
        }

        function selectEmojiFromPopup(emoji) {
            formState.icon = emoji;
            // Update display
            const displayId = formMode === 'create' ? 'selectedEmojiDisplay' : 'editSelectedEmojiDisplay';
            document.getElementById(displayId).textContent = emoji;
            closeEmojiPopup();
        }

        function getSettings() {
            const defaults = {
                morningStart: 5,
                nightStart: 18,
                sortMethod: 'default',
                notificationsEnabled: false,
                morningReminderTime: 5,
                nightReminderTime: 18,
                momentumAlertEnabled: true,
                momentumAlertTime: 18,
                momentumAlertThreshold: -20,
                quietHoursEnabled: false,
                quietHoursStart: 22,
                quietHoursEnd: 7,
                weeklySummaryEnabled: false,
                separateBedtimeSection: true,
                showDebug: false,
                disabledTags: ['autoComplete', 'linkedHabit']
            };
            try {
                const s = localStorage.getItem('habit_settings');
                return s ? { ...defaults, ...JSON.parse(s) } : defaults;
            } catch (e) {
                console.error('Failed to load settings:', e);
                return defaults;
            }
        }

        // ========================================
        // DEBUG FUNCTIONS
        // ========================================

        function toggleDebug() {
            document.getElementById('debugToggle').classList.toggle('active');
            const debugPanel = document.getElementById('debugPanel');
            const wasActive = debugPanel.classList.contains('active');
            debugPanel.classList.toggle('active');
            // When closing debug menu, reset section collapse states to defaults
            if (wasActive) {
                collapsedSections = {};
            }
            updateDebugDisplay();
            renderHabits(); // Re-render to expand/collapse sections based on debug mode
        }

        function debugChangePeriod(direction) {
            const s = getSettings();
            const currentPeriod = getTimeOfDayNow();

            if (direction > 0) {
                // Forward: morning → night (same day), night → morning (next day)
                if (currentPeriod === PERIOD.MORNING) {
                    debugHourOverride = s.nightStart + 1;
                } else {
                    debugDayOffset += 1;
                    debugHourOverride = s.morningStart + 1;
                }
            } else {
                // Backward: morning → night (prev day), night → morning (same day)
                if (currentPeriod === PERIOD.MORNING) {
                    debugDayOffset -= 1;
                    debugHourOverride = s.nightStart + 1;
                } else {
                    debugHourOverride = s.morningStart + 1;
                }
            }

            // Update momentum scores for any days that passed (applies penalties for missed days)
            updateAllHabitScores();
            updateDebugDisplay();
            updateDisplay();
        }
        function debugSetTime(p) {
            const s = getSettings();
            if (p === 'morning') {
                debugHourOverride = s.morningStart + 1;
            } else if (p === 'night') {
                debugHourOverride = s.nightStart + 1;
            }
            updateDebugDisplay(); updateDisplay();
        }
        function debugResetTime() {
            debugDayOffset = 0;
            debugHourOverride = null;
            // Reset all momentum scores to beginning value (0)
            const habits = loadHabits();
            const today = getTodayString();
            habits.forEach(h => {
                h.momentumScore = 0;
                h.lastScoreUpdate = today;
            });
            saveHabits(habits);
            updateDebugDisplay();
            updateDisplay();
        }
        async function debugTestAllNotifications() {
            const permission = await requestNotificationPermission();
            if (permission !== 'granted') {
                alertDialog('Notification permission denied. Enable notifications in your browser settings.');
                return;
            }
            // Ensure service worker is ready
            if ('serviceWorker' in navigator) {
                await navigator.serviceWorker.ready;
            }
            // Send all notification types with slight delays (ignore quiet hours for testing)
            sendNotification('🌅 Morning', '', 'debug-morning', true);
            setTimeout(() => sendNotification('🌙 Bedtime', '', 'debug-night', true), 500);
            setTimeout(() => sendNotification('Momentum Alert 🏋️ 🧘', '', 'debug-momentum', true), 1000);
            setTimeout(() => sendNotification('📊 3/5 weekly goals', '', 'debug-weekly', true), 1500);
        }
        function updateDebugDisplay() {
            const s = getSettings();
            const realHour = new Date().getHours();
            const realPeriod = (realHour >= s.morningStart && realHour < s.nightStart) ? 'morning' : 'bedtime';
            document.getElementById('debugRealDate').textContent = new Date().toLocaleDateString();
            document.getElementById('debugRealPeriod').textContent = realPeriod;
            document.getElementById('debugSimDate').textContent = getSimulatedDate().toLocaleDateString();
            const simPeriod = getTimeOfDayNow() === 'night' ? 'bedtime' : 'morning';
            document.getElementById('debugSimPeriod').textContent = simPeriod;
        }

        // ========================================
        // DATE & TIME UTILITIES
        // ========================================

        function getSimulatedDate() {
            const d = new Date();
            d.setDate(d.getDate() + debugDayOffset);
            if (debugHourOverride !== null) d.setHours(debugHourOverride, 0, 0, 0);
            return d;
        }

        function getEffectiveDate() {
            const d = getSimulatedDate();
            const s = getSettings();
            const hour = debugHourOverride !== null ? debugHourOverride : d.getHours();
            if (hour < s.morningStart) d.setDate(d.getDate() - 1);
            return toDateString(d);
        }

        // Format date as YYYY-MM-DD using LOCAL timezone (not UTC)
        function toDateString(d) {
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }

        function getTodayString() { return getEffectiveDate(); }

        function formatDate(date) {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }

        function getTimeOfDayNow() {
            const s = getSettings();
            const hour = debugHourOverride !== null ? debugHourOverride : new Date().getHours();
            // Only two periods: morning (until nightStart) and night/bedtime
            if (hour >= s.morningStart && hour < s.nightStart) return 'morning';
            return 'night';
        }

        function updateDisplay() {
            const simDate = getSimulatedDate();
            const s = getSettings();
            const hour = debugHourOverride !== null ? debugHourOverride : simDate.getHours();
            if (hour < s.morningStart) {
                const prev = new Date(simDate); prev.setDate(prev.getDate() - 1);
                document.getElementById('timeNote').textContent = `Before ${s.morningStart}am — counts as yesterday`;
            } else {
                document.getElementById('timeNote').textContent = '';
            }
            const dbgBtn = document.getElementById('debugToggle');
            if (dbgBtn) dbgBtn.style.display = s.showDebug ? '' : 'none';
            renderHabits();
            // Re-render open panels to update subtask states for new day
            if (selectedHabitId) renderDetails();
            if (subtaskPopupHabitId) renderSubtaskPopup();
            updateBadge();
        }

        function updateBadge() {
            const native = !!(window.AppPlatform && AppPlatform.isNative());
            if (!native && !('setAppBadge' in navigator)) return;
            const habits = loadHabits().filter(h => !h.archived);
            const cat = categorizeHabits(habits);
            // In the morning, badge counts only the morning-tagged tasks
            // (so it reflects what to do before work). At night, the badge
            // counts everything still to do — both bedtime-tagged and anytime.
            // Reminders are excluded from both buckets.
            const count = cat.timeOfDay === PERIOD.MORNING
                ? cat.morning.length
                : cat.bedtime.length + cat.anytime.length;
            if (native) {
                AppPlatform.setBadge(count);
            } else if (count > 0) {
                navigator.setAppBadge(count).catch(() => {});
            } else {
                navigator.clearAppBadge().catch(() => {});
            }
        }

        function hapticFeedback() {
            if ('vibrate' in navigator) {
                navigator.vibrate(10);
            }
        }

        // ========================================
        // DATA ACCESS HELPERS
        // ========================================

        // Default habits are defined in default-habits.js (getDefaultHabits).

        function loadHabits() {
            if (habitsCache) return habitsCache;
            try {
                const h = localStorage.getItem('habits_v3');
                habitsCache = h ? JSON.parse(h) : [];
            } catch (e) {
                console.error('Failed to load habits:', e);
                habitsCache = [];
                // Show error to user on next tick to avoid blocking
                setTimeout(() => alertDialog('Failed to load habits. Data may be corrupted — your habits have been reset.'), 0);
            }
            return habitsCache;
        }
        function saveHabits(h) {
            habitsCache = h; // Update cache
            try {
                localStorage.setItem('habits_v3', JSON.stringify(h));
            } catch (e) {
                console.error('Failed to save habits:', e);
                if (e.name === 'QuotaExceededError') {
                    alertDialog('Storage is full. Unable to save habits — try clearing some browser data.');
                } else {
                    alertDialog('Failed to save habits. Changes may not persist.');
                }
            }
        }
        function invalidateHabitsCache() { habitsCache = null; }

        // Undo toast functionality
        function showUndoToast() {
            const toast = document.getElementById('undoToast');
            toast.classList.add('visible');
            document.body.classList.add('undo-toast-active');

            // Clear existing timeout
            if (undoTimeout) clearTimeout(undoTimeout);

            // Auto-hide after 5 seconds
            undoTimeout = setTimeout(() => {
                hideUndoToast();
            }, 5000);
        }

        function hideUndoToast() {
            const toast = document.getElementById('undoToast');
            toast.classList.remove('visible');
            document.body.classList.remove('undo-toast-active');
            if (undoTimeout) {
                clearTimeout(undoTimeout);
                undoTimeout = null;
            }
        }

        function undoLastCompletion() {
            if (!lastCompletion) return;

            const habits = loadHabits();
            const habit = habits.find(h => h.id === lastCompletion.habitId);
            if (!habit) {
                hideUndoToast();
                return;
            }

            // Remove the completion
            if (lastCompletion.type === 'complete') {
                habit.completions = habit.completions.filter(c =>
                    !(c.date === lastCompletion.date && c.timestamp === lastCompletion.timestamp)
                );
                // Roll back the bulk subtask ticks that were applied with
                // this completion (Complete-All button, or last-subtask-
                // completes-the-habit path).
                if (lastCompletion.resetSubtasks && habit.subtasks) {
                    habit.subtasks.forEach(s => {
                        if (s.completedPeriods && lastCompletion.periodKey) {
                            delete s.completedPeriods[lastCompletion.periodKey];
                        }
                    });
                }
                // Cascade: if this completion auto-completed a linked target,
                // un-mark the linked target too.
                if (habit.autoCompletes) {
                    const linkedId = Number(habit.autoCompletes);
                    const linked = habits.find(h => h.id === linkedId);
                    if (linked && linked.autoCompletedToday === lastCompletion.date) {
                        linked.completions = linked.completions.filter(c => !(c.date === lastCompletion.date && c.autoCompleted));
                        delete linked.autoCompletedToday;
                    }
                }
            } else if (lastCompletion.type === 'subtask' && lastCompletion.subtaskId) {
                const subtask = habit.subtasks?.find(s => s.id === lastCompletion.subtaskId);
                if (subtask && subtask.completedPeriods) {
                    delete subtask.completedPeriods[lastCompletion.periodKey];
                }
            }

            saveHabits(habits);
            const undoneHabitId = lastCompletion.habitId;
            lastCompletion = null;
            hideUndoToast();
            // If the details modal is open for the same habit, restore the
            // Complete button (it was greyed when the user completed from
            // the details screen).
            if (selectedHabitId === undoneHabitId) ungreyDetailsCompleteButton();
            renderHabits();
        }

        // Only initialize with default habits if no habits exist
        if (!localStorage.getItem('habits_v3')) {
            saveHabits(getDefaultHabits());
        }

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
                footerHtml: `<div style="display:flex;gap:8px;padding:10px 14px">${btns}</div>`
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

        function renderSettings() {
            const generalRows = `
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
            const notificationsBlock = `
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
            const navRow = (label, view) => `<div class="settings-row settings-nav" onclick="settingsNavigate('${view}')" style="cursor:pointer;margin-top:8px;padding-top:10px">
                    <span class="settings-label">${label}</span>
                    <span style="color:#666;font-size:1.2rem;line-height:1">›</span>
                </div>`;
            const subHeader = (title) => `<div class="modal-header">
                    <button class="modal-close" onclick="settingsNavigate('main')" aria-label="Back" style="font-size:1.5rem;line-height:1">‹</button>
                    <span class="modal-title">${title}</span>
                    <button class="modal-close" onclick="closeSettings()">&times;</button>
                </div>`;
            // #2: one Export (scope chosen by a "tasks only" toggle) paired
            // with Import on a single row, instead of two Export buttons.
            const dataSection = `
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

            let headerHtml, bodyHtml;
            if (settingsView === 'notifications') {
                headerHtml = subHeader('Notifications');
                bodyHtml = notificationsBlock;
            } else if (settingsView === 'data') {
                headerHtml = subHeader('Data & Backup');
                bodyHtml = dataSection;
            } else if (settingsView === 'tags') {
                const disabled = getSettings().disabledTags || [];
                const chip = t => `<label class="option-pill ${disabled.includes(t.id) ? '' : 'active'}" onclick="toggleTagEnabled('${t.id}')">
                        <span class="option-pill-check">✓</span><span>${t.label}</span>
                    </label>`;
                const activeChips = TAG_LIST.filter(t => !disabled.includes(t.id)).map(chip).join('');
                const inactiveChips = TAG_LIST.filter(t => disabled.includes(t.id)).map(chip).join('');
                const sectionLabel = txt => `<div style="font-size:0.7rem;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:4px 0 8px">${txt}</div>`;
                headerHtml = subHeader('Tags');
                bodyHtml = sectionLabel('Active')
                    + `<div class="task-options">${activeChips || '<span style="color:#666;font-size:0.85rem">None</span>'}</div>`
                    + `<div style="margin-top:16px">${sectionLabel('Inactive')}</div>`
                    + `<div class="task-options">${inactiveChips || '<span style="color:#666;font-size:0.85rem">None</span>'}</div>`;
            } else {
                headerHtml = popupHeader({ title: 'Settings', onClose: 'closeSettings()' });
                bodyHtml = generalRows
                    + navRow('Notifications', 'notifications')
                    + navRow('Tags', 'tags')
                    + navRow('Data & Backup', 'data');
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
                // --- DISABLED: negative-habit feature ---
                // isNegative: formState.isNegative,
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
                    // --- DISABLED: negative-habit feature. The isNegative
                    // branches are kept commented for future re-enable; only
                    // positive-habit scoring runs now. ---
                    // const isNegativeHabit = habit.isNegative;
                    if (wasCompleted) {
                        /* if (isNegativeHabit) {
                            // Negative habit: completing (doing bad thing) = penalty with acceleration
                            const basePenalty = score < 0 ? Math.min(45, 25 - score * 0.2) : 25;
                            const penalty = basePenalty * frequencyScale;
                            score = Math.max(-100, score - penalty);
                        } else { */
                            // Positive habit: completing = reward
                            const reward = 15 * frequencyScale;
                            score = Math.min(100, score + reward);
                        /* } */
                    } else {
                        /* if (isNegativeHabit) {
                            // Negative habit: not doing (avoiding) = small reward
                            const reward = 5 * frequencyScale;
                            score = Math.min(100, score + reward);
                        } else { */
                            // Positive habit: missing = penalty with acceleration (worse when already negative)
                            const basePenalty = score < 0 ? Math.min(45, 25 - score * 0.2) : 25;
                            const isReminder = habit.isReminder || freqType === FREQ.REMINDER;
                            const penalty = (isReminder ? basePenalty * 0.5 : basePenalty) * frequencyScale;
                            score = Math.max(-100, score - penalty);
                        /* } */
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

        // ========================================
        // CATEGORIZATION & RENDERING
        // ========================================

        function sortHabits(habits) {
            const settings = getSettings();
            const method = settings.sortMethod || 'default';
            if (method === 'default') return habits;
            if (method === 'alphabetical') return [...habits].sort((a, b) => (a.isReminder ? 1 : 0) - (b.isReminder ? 1 : 0) || a.name.localeCompare(b.name));
            // 'attention' (and legacy 'overdue'/'score') - sort by momentum score
            if (method === 'attention' || method === 'overdue' || method === 'score') {
                const scoresMap = new Map();
                habits.forEach(h => scoresMap.set(h.id, calculateMomentumScore(h).raw));
                return [...habits].sort((a, b) => (a.isReminder ? 1 : 0) - (b.isReminder ? 1 : 0) || scoresMap.get(a.id) - scoresMap.get(b.id));
            }
            return habits;
        }

        // A Daily×N habit (timesPerDay) can carry frequency.delayHours: after
        // each completion it is hidden from the day's list until that many
        // hours have elapsed, then it reappears (same day) until the daily
        // target is met. Recomputed on every render, so no timer is needed.
        function isDelayHidden(habit, status) {
            if (habit.frequency.type !== FREQ.TIMES_PER_DAY) return false;
            const delayHours = habit.frequency.delayHours;
            if (!delayHours || delayHours <= 0) return false;
            // Target met → fall through to normal Done/Optional handling.
            // Reuse caller's status when provided to avoid recomputing it.
            if ((status || getCompletionStatus(habit)).completed) return false;
            const today = getTodayString();
            const todaysCompletions = habit.completions.filter(c => c.date === today);
            if (!todaysCompletions.length) return false;
            // Mixed data: untimestamped taps are ignored here; if every
            // completion lacks a timestamp the habit shows (legacy-safe).
            const lastTs = Math.max(...todaysCompletions.map(c => c.timestamp || 0));
            if (!lastTs) return false; // legacy completion with no timestamp → show
            return (Date.now() - lastTs) < delayHours * 3600000;
        }

        // True if any habit is currently inside its post-completion delay
        // window. Used by the minute tick to re-render the day view on its
        // own once a delay elapses (no dedicated timer).
        function anyDelayPending() {
            return loadHabits().some(h => isDelayHidden(h));
        }

        // Categorize habits into sections (Now, Optional, Later, Done) - each habit in ONE section only
        function categorizeHabits(habits) {
            const timeOfDay = getTimeOfDayNow();
            const sorted = sortHabits(habits);
            const now = [], optional = [], later = [], done = [];

            sorted.forEach(h => {
                const status = getCompletionStatus(h);
                const today = getTodayString();

                // Check snooze status first — snoozed habits don't show in any section
                if (h.snoozedUntil) {
                    if (h.snoozedUntil === PERIOD.NIGHT && timeOfDay !== PERIOD.NIGHT) return;
                    if (h.snoozedUntil !== PERIOD.NIGHT && h.snoozedUntil > today) return;
                }

                // Hide habits that were auto-completed today by another habit
                if (h.autoCompletedToday === today) return;

                // Hide habits suppressed today by a "Conflicts with" partner
                if (isConflictSuppressed(h)) return;

                // Daily×N with a post-completion delay: hide until enough
                // hours have passed since the last completion today.
                if (isDelayHidden(h, status)) return;

                // Twice daily: special handling
                if (h.frequency.type === FREQ.TWICE_DAILY) {
                    if (status.morningDone && status.nightDone) {
                        done.push(h); // Both done → Done
                    } else if (status.morningDone && !status.nightDone) {
                        // Morning done, night pending
                        if (timeOfDay === PERIOD.MORNING) {
                            later.push(h); // Wait for night
                        } else {
                            now.push(h); // Can do night now
                        }
                    } else if (!status.morningDone && status.nightDone) {
                        // Morning missed, night done → nothing more to do today
                        done.push(h);
                    } else {
                        // Neither done yet
                        now.push(h);
                    }
                    return;
                }

                // Morning habits missed at night → Done (nothing more to do today)
                // But don't mark as missed if created today (habit is new)
                const hasCompletionEntry = h.completions.some(c => c.date === today);
                const createdToday = h.createdAt === today;
                if (h.timeOfDay === PERIOD.MORNING && timeOfDay === PERIOD.NIGHT && !isCompletedToday(h) && !hasCompletionEntry && !createdToday) {
                    done.push(h);
                    return;
                }

                // Regular habits: one section only
                // Check isOptional first for daily/everyXDays with Allow Extra (they go to Optional after completion)
                if (isOptional(h)) {
                    optional.push(h);
                } else if (isCompletedToday(h)) {
                    done.push(h);
                } else if (canDoNow(h)) {
                    now.push(h);
                } else if (isForLater(h)) {
                    later.push(h);
                }
            });

            // Sub-categorize Now section by time
            const morning = now.filter(h => h.timeOfDay === PERIOD.MORNING || (h.frequency.type === FREQ.TWICE_DAILY && timeOfDay === PERIOD.MORNING));
            const bedtime = now.filter(h => h.timeOfDay === PERIOD.NIGHT || (h.frequency.type === FREQ.TWICE_DAILY && timeOfDay === PERIOD.NIGHT));
            const anytime = now.filter(h => !h.timeOfDay && h.frequency.type !== FREQ.TWICE_DAILY);
            // Reminders as their own sub-section (not completed ones - they go to done)
            const reminders = now.filter(h => (h.isReminder || h.frequency.type === FREQ.REMINDER));
            // Remove reminders from the other sub-sections
            const morningFiltered = morning.filter(h => !(h.isReminder || h.frequency.type === FREQ.REMINDER));
            const bedtimeFiltered = bedtime.filter(h => !(h.isReminder || h.frequency.type === FREQ.REMINDER));
            const anytimeFiltered = anytime.filter(h => !(h.isReminder || h.frequency.type === FREQ.REMINDER));

            return { now, optional, later, done, morning: morningFiltered, bedtime: bedtimeFiltered, anytime: anytimeFiltered, reminders, timeOfDay };
        }

        function renderHabits() {
            const allHabits = loadHabits(), container = document.getElementById('habitsContainer');
            // Filter out archived habits for main view
            const habits = allHabits.filter(h => !h.archived);
            // Preserve scroll position
            const scrollY = window.scrollY;

            if (!habits.length) {
                container.innerHTML = '<div class="habits-section"><div class="empty-state"><div class="empty-state-icon">✨</div><div>No habits yet</div></div></div>';
                return;
            }

            const cat = categorizeHabits(habits);

            // An auto-complete target stays independent in its own slot
            // until it's actually auto-completed (then categorizeHabits
            // hides it via autoCompletedToday) — so it is NOT consumed here.
            // Companion links still de-dup so the pair isn't drawn twice.
            const consumedLinkedIds = new Set();
            const visibleIds = new Set();
            [cat.now, cat.optional, cat.later, cat.done].forEach(arr => arr.forEach(h => visibleIds.add(h.id)));
            // Companion links: both partners point at each other.
            // - If exactly one is completed today, drop the completed one so
            //   only the still-pending partner shows (alone, no pair).
            // - Otherwise (both done OR both pending), drop the higher-id
            //   partner so the lower-id one renders the pair.
            habits.forEach(h => {
                if (!visibleIds.has(h.id) || !h.linkedHabit) return;
                const lid = Number(h.linkedHabit);
                if (!lid || lid === h.id) return;
                const partner = habits.find(ph => ph.id === lid);
                if (!partner) return;
                const hDone = isCompletedToday(h);
                const pDone = isCompletedToday(partner);
                if (hDone && !pDone) {
                    consumedLinkedIds.add(h.id);
                } else if (!hDone && pDone) {
                    consumedLinkedIds.add(lid);
                } else if (h.id < lid) {
                    consumedLinkedIds.add(lid);
                }
            });
            const drop = arr => arr.filter(h => !consumedLinkedIds.has(h.id));
            const nowHabits = drop(cat.now);
            const optionalHabits = drop(cat.optional);
            const morningSpecific = drop(cat.morning);
            const bedtimeSpecific = drop(cat.bedtime);
            const anytimeHabits = drop(cat.anytime);
            const reminderHabits = drop(cat.reminders);
            const timeOfDay = cat.timeOfDay;

            // Helper: render a sub-section with header and habits grid (large tasks sorted first)
            const subSection = (habits, icon, title) => {
                if (!habits.length) return '';
                const sorted = habits;
                return `<div class="sub-header"><span class="sub-header-icon">${icon}</span>${title}</div>
                   <div class="habits-grid">${sorted.map(h => renderHabitIcon(h)).join('')}</div>`;
            };

            let html = '';

            // Now section with sub-sections based on time of day
            if (nowHabits.length) {
                let nowContent = '';
                if (timeOfDay === PERIOD.MORNING) {
                    nowContent += subSection(morningSpecific, '🌅', 'Morning');
                    nowContent += subSection(anytimeHabits, '☀️', 'Anytime');
                } else if (timeOfDay === PERIOD.NIGHT) {
                    // Always surface bedtime tasks in their own section at
                    // night so they're visible at the top, not buried in a
                    // mixed grid with anytime habits.
                    nowContent += subSection(bedtimeSpecific, '🌙', 'Bedtime');
                    nowContent += subSection(anytimeHabits, '☀️', 'Anytime');
                }
                nowContent += subSection(reminderHabits, '🔔', 'Reminders');

                const nonReminderCount = nowHabits.filter(h => !h.isReminder && h.frequency.type !== FREQ.REMINDER).length;
                html += `<div class="habits-section">
                    <div class="section-header">
                        <span class="section-icon">⚡</span>
                        <span class="section-title">Now</span>
                        <span class="section-count">${nonReminderCount}</span>
                    </div>
                    ${nowContent}
                </div>`;
            } else {
                // Show empty Now section with encouraging message
                html += `<div class="habits-section">
                    <div class="section-header">
                        <span class="section-icon">⚡</span>
                        <span class="section-title">Now</span>
                        <span class="section-count">0</span>
                    </div>
                    <div class="empty-state">
                        <div class="empty-state-icon">✨</div>
                        <div>All caught up!</div>
                    </div>
                </div>`;
            }

            // Collapsible sections using helper. "Tonight" (later) and
            // "Finished" (completed) are intentionally not shown on the main
            // screen — use the All Habits view to review those.
            html += renderSection(optionalHabits, 'optional', '⭐', 'Optional', false, { inactive: true });

            if (!html) html = '<div class="habits-section"><div class="empty-state"><div class="empty-state-icon">✓</div><div>All done!</div></div></div>';
            container.innerHTML = html;

            // Restore scroll position
            requestAnimationFrame(() => window.scrollTo(0, scrollY));
        }

        // Helper: render a collapsible section (Optional, Later, Done)
        function renderSection(habits, sectionId, icon, title, defaultCollapsed, renderOpts = {}) {
            if (!habits.length) return '';
            if (collapsedSections[sectionId] === undefined) collapsedSections[sectionId] = defaultCollapsed;
            // Auto-expand all sections when debug mode is active
            const debugActive = isOverlayActive('debugPanel');
            const collapsed = debugActive ? false : collapsedSections[sectionId];
            const contentClass = collapsed ? 'section-content collapsed' : 'section-content';
            const headerClass = collapsed ? 'section-header collapsible collapsed' : 'section-header collapsible';
            const sectionClass = renderOpts.inactive ? 'habits-section inactive-section' : 'habits-section';
            // Sort: reminders last
            const sorted = [...habits].sort((a, b) => (a.isReminder ? 1 : 0) - (b.isReminder ? 1 : 0));
            const habitsHtml = sorted.map(h => renderHabitIcon(h, renderOpts.isLater, renderOpts.isCompleted)).join('');
            return `<div class="${sectionClass}">
                <div class="${headerClass}" onclick="toggleSection('${sectionId}')">
                    <span class="section-icon">${icon}</span>
                    <span class="section-title">${title}</span>
                    <span class="collapse-icon">▼</span>
                    <span class="section-count">${habits.length}</span>
                </div>
                <div class="${contentClass}">
                    <div class="habits-grid">${habitsHtml}</div>
                </div>
            </div>`;
        }

        // Renders just the inner <div class="habit-icon">…</div> block — no wrapper.
        // opts.muted adds .linked-muted (used for the trailing icon of a linked
        // pair when it isn't due today).
        function renderHabitIconInner(habit, isLater = false, isCompleted = false, opts = {}) {
            const status = getCompletionStatus(habit);
            const scoreData = calculateMomentumScore(habit);
            const isReminder = habit.isReminder || habit.frequency.type === FREQ.REMINDER;
            const hasHistory = !!(habit.lastScoreUpdate || habit.createdAt);

            let neglectLevel = 0;
            if (isReminder) {
                const lastCompletion = getLastCompletionDate(habit);
                const resetDate = habit.momentumResetDate;
                const referenceDate = (lastCompletion && resetDate) ? (lastCompletion > resetDate ? lastCompletion : resetDate) :
                                      (lastCompletion || resetDate);
                if (referenceDate) {
                    const freq = habit.frequency;
                    let expectedCycle = 7;
                    if (freq.reminderDays) expectedCycle = freq.reminderDays;
                    else if (freq.everyXWeeks) expectedCycle = freq.everyXWeeks * 7;
                    else if (freq.everyXMonths) expectedCycle = freq.everyXMonths * 30;
                    else if (freq.everyXDays) expectedCycle = freq.everyXDays;

                    // Neglect is counted from the reminder's last APPEARANCE
                    // (referenceDate + one interval), not its last completion —
                    // the dormant waiting period before it reappears is not
                    // neglect. Each full interval ignored past reappearance is
                    // one dot (so a daily reminder ignored for one day = 1 dot).
                    const interval = expectedCycle || 1;
                    const daysSince = daysBetween(referenceDate, getTodayString());
                    const daysIgnored = daysSince - interval;
                    neglectLevel = daysIgnored > 0 ? Math.min(3, Math.floor(daysIgnored / interval)) : 0;
                }
            } else {
                neglectLevel = hasHistory && scoreData.display < 0 ? Math.min(3, Math.abs(scoreData.display)) : 0;
            }
            const icon = habit.icon || '📌';

            let progress = '0%';
            let ringClass = '';

            const isPointsBased = habit.frequency.type === FREQ.POINTS_PER_DAY || habit.frequency.type === FREQ.POINTS_PER_WEEK || habit.frequency.type === FREQ.POINTS_PER_MONTH;
            const leftClick = isCompleted ? `openDetails(${habit.id})` : (isPointsBased ? `openPointsPopup(${habit.id})` : `completeHabit(${habit.id})`);
            const rightClick = `event.preventDefault();openDetails(${habit.id})`;
            const mutedClass = opts.muted ? ' linked-muted' : '';

            const neglectDots = neglectLevel > 0 ?
                `<div class="neglect-dots">${'<div class="neglect-dot"></div>'.repeat(neglectLevel)}</div>` : '';

            if (habit.frequency.type === FREQ.TWICE_DAILY) {
                const bothDone = status.morningDone && status.nightDone;
                const twiceDailyHasSubtasks = habit.subtasks && habit.subtasks.length > 0;
                const twiceDailyHasConfirm = !!(habit.confirmDescription && habit.description);
                const twiceDailyExtraIndicator = (twiceDailyHasSubtasks || twiceDailyHasConfirm) ? '<div class="extra-indicator"></div>' : '';
                return `<div class="habit-icon${mutedClass}" data-habit-id="${habit.id}" onclick="${bothDone ? `openDetails(${habit.id})` : `completeTwiceDaily(${habit.id})`}" oncontextmenu="${rightClick}">
                    <div class="habit-ring split ${bothDone ? 'completed' : ''}">
                        <div class="half-fill left ${status.morningDone ? 'filled' : ''}"></div>
                        <div class="half-fill right ${status.nightDone ? 'filled' : ''}"></div>
                        <div class="divider"></div>
                        <span class="habit-emoji">${icon}</span>
                        ${neglectDots}
                        ${twiceDailyExtraIndicator}
                    </div>
                </div>`;
            }

            const subtaskProgress = getSubtaskProgress(habit);
            const hasSubtasks = subtaskProgress && subtaskProgress.total > 0;
            const subtaskPct = hasSubtasks ? Math.round((subtaskProgress.completed / subtaskProgress.total) * 100) : 0;
            const allSubtasksDone = hasSubtasks && subtaskProgress.completed === subtaskProgress.total;

            if (isCompleted) {
                const today = getTodayString();
                const completedToday = habit.completions.some(c => c.date === today);
                if (completedToday || status.completed || allSubtasksDone) {
                    if (hasSubtasks && !allSubtasksDone) {
                        ringClass = 'partial';
                        progress = `${subtaskPct}%`;
                    } else {
                        ringClass = 'completed';
                        progress = '100%';
                    }
                } else {
                    ringClass = 'missed';
                    progress = '0%';
                }
            } else if (hasSubtasks) {
                progress = `${subtaskPct}%`;
                if (allSubtasksDone) { ringClass = 'completed'; progress = '100%'; }
                else if (subtaskPct > 0) ringClass = 'partial';
            } else if (status.completed) {
                ringClass = 'completed';
                progress = '100%';
            } else if (habit.frequency.type === FREQ.POINTS_PER_DAY) {
                const pct = Math.min(100, Math.round((status.points / status.target) * 100));
                progress = `${pct}%`;
                if (pct > 0) ringClass = 'partial';
            } else if (habit.frequency.type === FREQ.TIMES_PER_DAY) {
                // Fill the ring proportionally per completion (e.g. 1/3,
                // 2/3); scales to whatever the daily target is.
                const pct = Math.min(100, Math.round((status.count / status.target) * 100));
                progress = `${pct}%`;
                if (pct > 0) ringClass = 'partial';
            } else if (habit.frequency.type === FREQ.TIMES_PER_WEEK || habit.frequency.type === FREQ.TIMES_PER_MONTH ||
                       habit.frequency.type === FREQ.POINTS_PER_WEEK || habit.frequency.type === FREQ.POINTS_PER_MONTH) {
                const today = getTodayString();
                const completedToday = habit.completions.some(c => c.date === today);
                if (completedToday) { ringClass = 'completed'; progress = '100%'; }
                else { progress = '0%'; }
            } else {
                progress = '0%';
            }

            // Grey dot = "tapping Complete opens a popup first": subtasks,
            // points entry, or a confirm-description prompt.
            const hasConfirm = !!(habit.confirmDescription && habit.description);
            const extraIndicator = (hasSubtasks || isPointsBased || hasConfirm) ? '<div class="extra-indicator"></div>' : '';

            // --- DISABLED: negative-habit feature. Ring-state override kept
            // commented for future re-enable; habits always render the
            // normal ring + neglect dots now. ---
            // const isNegative = habit.isNegative;
            // const today = getTodayString();
            // const loggedToday = habit.completions.some(c => c.date === today);
            // if (isNegative) {
            //     ringClass = loggedToday ? 'negative-logged' : 'negative';
            // }

            return `<div class="habit-icon${mutedClass}" data-habit-id="${habit.id}" onclick="${leftClick}" oncontextmenu="${rightClick}">
                <div class="habit-ring ${ringClass}" style="--progress: ${progress}">
                    <span class="habit-emoji">${icon}</span>
                    ${neglectDots}
                    ${extraIndicator}
                </div>
            </div>`;
        }

        function renderHabitIcon(habit, isLater = false, isCompleted = false) {
            // Auto-complete: the target stays an independent icon in its own
            // slot until it's auto-completed (then it's hidden), so the
            // trigger is NOT drawn as a connected pair.

            // Companion link: bidirectional, visual only — no auto-completion.
            // Render as a pair only when both partners are in the same
            // completion state today.
            if (habit.linkedHabit) {
                const linkedId = Number(habit.linkedHabit);
                if (linkedId && linkedId !== habit.id) {
                    const linked = loadHabits().find(h => h.id === linkedId && !h.archived);
                    if (linked) {
                        const habitDone = isCompletedToday(habit);
                        const linkedDone = isCompletedToday(linked);
                        const sameState = habitDone === linkedDone;
                        if (sameState && habit.id < linkedId) {
                            const aInner = renderHabitIconInner(habit, isLater, isCompleted);
                            const bInner = renderHabitIconInner(linked, isLater, isCompleted);
                            return `<div class="habit-icon-wrapper linked-pair companion-pair">${aInner}<div class="link-line"></div>${bInner}</div>`;
                        }
                    }
                }
            }

            return `<div class="habit-icon-wrapper">${renderHabitIconInner(habit, isLater, isCompleted)}</div>`;
        }

        function toggleSection(sectionId) {
            collapsedSections[sectionId] = !collapsedSections[sectionId];
            renderHabits();
        }

        function completeTwiceDaily(id) {
            const habits = loadHabits(), habit = habits.find(h => h.id === id), today = getTodayString();
            if (!habit) return;

            // If habit has subtasks, show popup instead of completing directly
            if (habit.subtasks && habit.subtasks.length > 0) {
                openSubtaskPopup(id);
                return;
            }

            const timeOfDay = getTimeOfDayNow();
            const period = timeOfDay === PERIOD.NIGHT ? PERIOD.NIGHT : PERIOD.MORNING;

            const existing = habit.completions.find(c => c.date === today && c.period === period);

            if (!existing && habit.confirmDescription && habit.description) {
                openConfirmDescPopup(id, period);
                return;
            }

            if (existing) {
                habit.completions = habit.completions.filter(c => c !== existing);
                hideUndoToast();
            } else {
                const timestamp = Date.now();
                habit.completions.push({ date: today, period, timestamp });
                hapticFeedback();
                lastCompletion = { habitId: id, date: today, period, timestamp, type: 'complete' };
                showUndoToast();
                // Fire auto-complete only once the habit is fully done for
                // the day (both morning AND night).
                const fullyDone = habit.completions.some(c => c.date === today && c.period === PERIOD.MORNING)
                    && habit.completions.some(c => c.date === today && c.period === PERIOD.NIGHT);
                if (fullyDone) triggerAutoComplete(habits, habit);
            }
            saveHabits(habits);
            renderHabits();
        }

        // ========================================
        // SUBTASK FUNCTIONS
        // ========================================

        function getSubtaskPeriodKey(habit) {
            const today = getTodayString();
            const freq = habit.frequency.type;
            if (freq === FREQ.TWICE_DAILY) {
                const timeOfDay = getTimeOfDayNow();
                return `${today}_${timeOfDay}`;
            }
            if (freq === FREQ.DAILY) return today;
            if (freq === FREQ.TIMES_PER_WEEK) return getWeekStart(today);
            if (freq === FREQ.TIMES_PER_MONTH) return getMonthStart(today);
            if (freq === FREQ.EVERY_X_DAYS) return today; // Reset daily for everyXDays
            return today;
        }

        function isSubtaskCompleted(habit, subtaskId) {
            const periodKey = getSubtaskPeriodKey(habit);
            const subtask = (habit.subtasks || []).find(s => s.id === subtaskId);
            return subtask && subtask.completedPeriods && subtask.completedPeriods[periodKey];
        }

        function getSubtaskProgress(habit) {
            if (!habit.subtasks || habit.subtasks.length === 0) return null;
            const completed = habit.subtasks.filter(s => isSubtaskCompleted(habit, s.id)).length;
            return { completed, total: habit.subtasks.length };
        }

        function toggleSubtask(habitId, subtaskId) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === habitId);
            if (!habit || !habit.subtasks) return;

            const subtask = habit.subtasks.find(s => s.id === subtaskId);
            if (!subtask) return;

            const periodKey = getSubtaskPeriodKey(habit);
            if (!subtask.completedPeriods) subtask.completedPeriods = {};

            const wasCompleted = subtask.completedPeriods[periodKey];
            const today = getTodayString();
            const isTwiceDaily = habit.frequency.type === FREQ.TWICE_DAILY;
            const currentPeriod = getTimeOfDayNow() === PERIOD.MORNING ? PERIOD.MORNING : PERIOD.NIGHT;

            if (wasCompleted) {
                delete subtask.completedPeriods[periodKey];
                // When unchecking a subtask, remove completion entry for current period
                if (isTwiceDaily) {
                    habit.completions = habit.completions.filter(c => !(c.date === today && c.period === currentPeriod));
                } else {
                    habit.completions = habit.completions.filter(c => c.date !== today);
                }
            } else {
                subtask.completedPeriods[periodKey] = Date.now();
                hapticFeedback();
                // Auto-complete main habit when all subtasks are done
                const allCompleted = habit.subtasks.every(s => s.completedPeriods && s.completedPeriods[periodKey]);
                const alreadyCompleted = isTwiceDaily
                    ? habit.completions.some(c => c.date === today && c.period === currentPeriod)
                    : habit.completions.some(c => c.date === today);

                if (allCompleted && !alreadyCompleted) {
                    const completion = { date: today, timestamp: Date.now() };
                    if (isTwiceDaily) completion.period = currentPeriod;
                    habit.completions.push(completion);
                    habit.momentumScore = (habit.momentumScore || 0) + 15;
                    habit.lastScoreUpdate = today;
                }
            }

            saveHabits(habits);
            renderDetails();
            renderHabits();
        }

        function addSubtask(habitId) {
            const input = document.getElementById('editSubtaskInput');
            const name = input?.value.trim();
            if (!name) return;

            const habits = loadHabits();
            const habit = habits.find(h => h.id === habitId);
            if (!habit) return;

            if (!habit.subtasks) habit.subtasks = [];
            habit.subtasks.push({ id: Date.now(), name, completedPeriods: {} });

            saveHabits(habits);
            input.value = '';
            renderDetails();
            renderHabits();
        }

        function deleteSubtask(habitId, subtaskId) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === habitId);
            if (!habit || !habit.subtasks) return;

            habit.subtasks = habit.subtasks.filter(s => s.id !== subtaskId);
            saveHabits(habits);
            renderDetails();
            renderHabits();
        }

        // Subtask popup functions
        let subtaskPopupHabitId = null;

        function openSubtaskPopup(habitId) {
            subtaskPopupHabitId = habitId;
            renderSubtaskPopup();
            showOverlay('subtaskPopupOverlay');
        }

        function closeSubtaskPopup() {
            hideOverlay('subtaskPopupOverlay');
            subtaskPopupHabitId = null;
        }

        // Shared renderer for the subtask popup and the description-
        // confirmation popup. Both use the exact same layout (header +
        // list + footer); the `marker` option switches list rows between
        // interactive checkboxes and static bullet points.
        // Build a separated info section: a small uppercase label plus
        // bulleted lines. Used to show a confirm-description and any
        // auto-completed partner's details inside the completion popup.
        function popupSection(label, innerHtml) {
            // No top border here — the popup header already draws a divider
            // directly above this section; a second line looked doubled.
            return `<div style="margin:10px 0">
                <div style="font-size:0.7rem;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">${escapeHtml(label)}</div>
                ${innerHtml}
            </div>`;
        }

        // The habit's Description for completion popups — boxed with the
        // exact same look as the habit-details page (subtle grey fill +
        // darker grey border). '' when there's nothing to confirm.
        function popupDescriptionSection(habit) {
            if (!(habit.confirmDescription && habit.description)) return '';
            return popupSection('Description', `<div style="color:#aaa;font-size:0.85rem;line-height:1.4;border:1px solid #2a2a3e;border-radius:8px;padding:10px 12px;background:rgba(255,255,255,0.02)">${formatDescription(habit.description)}</div>`);
        }

        // Info about a habit's auto-completed partner, shown in the
        // trigger's completion popup.
        function linkedAutoInfoHtml(habit) {
            if (!habit.autoCompletes) return '';
            const cid = Number(habit.autoCompletes);
            const linked = loadHabits().find(h =>
                (cid ? h.id === cid : h.name.toLowerCase() === String(habit.autoCompletes).toLowerCase())
                && h.id !== habit.id && !h.archived);
            if (!linked) return '';
            let inner = `<div style="display:flex;align-items:center;gap:8px;color:#ccc;font-size:0.9rem">
                <span style="font-size:1.2rem">${linked.icon || '📌'}</span>
                <span>${escapeHtml(linked.name)}</span></div>`;
            if (linked.subtasks && linked.subtasks.length) {
                inner += linked.subtasks.map(s =>
                    `<div style="display:flex;gap:6px;align-items:flex-start;padding:2px 0;color:#aaa;font-size:0.8rem">
                        <span style="color:#666;flex-shrink:0">•</span><span>${escapeHtml(s.name)}</span></div>`
                ).join('');
            }
            if (linked.confirmDescription && linked.description) {
                inner += `<div style="margin-top:6px;color:#aaa;font-size:0.8rem;line-height:1.4">${formatDescription(linked.description)}</div>`;
            }
            return popupSection('Also completes', inner);
        }

        function renderChecklistPopup(targetId, { icon, title, onClose, items, marker, footer, preamble }) {
            const rows = items.map(it => {
                const onclick = it.onclick ? `onclick="${it.onclick}"` : '';
                const itemClass = `subtask-popup-item${it.locked ? ' subtask-popup-item-locked' : ''}`;
                const mark = marker === 'bullet'
                    ? `<span class="subtask-bullet">•</span>`
                    : `<div class="subtask-checkbox ${it.completed ? 'checked' : ''}"></div>`;
                return `<div class="${itemClass}" ${onclick}>
                    ${mark}
                    <span class="subtask-name ${it.completed ? 'completed' : ''}">${escapeHtml(it.name)}</span>
                </div>`;
            }).join('');

            renderPopup(targetId, {
                icon, title, onClose,
                bodyHtml: `${preamble || ''}<div class="subtask-popup-list">${rows}</div>`,
                footerHtml: footer || ''
            });
        }

        function renderSubtaskPopup() {
            const habit = loadHabits().find(h => h.id === subtaskPopupHabitId);
            if (!habit) return;

            const subtasks = habit.subtasks || [];
            const isSequential = !!habit.sequentialSubtasks;

            const items = subtasks.map(s => ({
                name: s.name,
                completed: isSubtaskCompleted(habit, s.id),
                // Rows are always tappable (mark off in any order). In
                // sequential mode the "Complete Next" button is just a
                // convenience that ticks the next unmarked one top-down.
                locked: false,
                onclick: `toggleSubtaskFromPopup(${habit.id}, ${s.id})`
            }));

            const allDone = subtasks.length > 0 && subtasks.every(s => isSubtaskCompleted(habit, s.id));
            const footer = isSequential
                ? `<button class="submit-btn" style="margin-top:12px;width:100%" onclick="completeNextSubtask(${habit.id})" ${allDone ? 'disabled style="margin-top:12px;width:100%;opacity:0.5;cursor:default"' : ''}>Complete Next</button>`
                : `<button class="submit-btn" style="margin-top:12px;width:100%" onclick="completeHabitWithAllSubtasks(${habit.id})">Complete All</button>`;

            const descSection = popupDescriptionSection(habit);
            const preamble = descSection + linkedAutoInfoHtml(habit);

            renderChecklistPopup('subtaskPopup', {
                icon: habit.icon || '📌',
                title: habit.name,
                onClose: 'closeSubtaskPopup()',
                items,
                marker: 'checkbox',
                footer,
                preamble
            });
        }

        // Sequential mode: tick the next pending subtask (top-to-bottom).
        // Reuses toggleSubtaskFromPopup so completion, momentum boost,
        // confirm-description popup, and details auto-close all behave
        // exactly as if the user had tapped the checkbox themselves.
        function completeNextSubtask(habitId) {
            const habit = loadHabits().find(h => h.id === habitId);
            if (!habit || !habit.subtasks) return;
            const next = habit.subtasks.find(s => !isSubtaskCompleted(habit, s.id));
            if (!next) return;
            toggleSubtaskFromPopup(habitId, next.id);
        }

        // Shared core for ticking a single subtask. Mutates `habits` in
        // place and returns { status, period }:
        //   'noop'      — subtask not found, caller does nothing
        //   'toggled'   — subtask flipped, habit not (un)completed
        //   'completed' — last subtask ticked, habit recorded complete
        //   'confirm'   — last subtask ticked but a description must be
        //                 confirmed first; caller saves + opens the popup
        // `period` is the twice-daily period (or null) for the completion.
        function applySubtaskToggle(habits, habit, subtaskId) {
            const subtask = habit.subtasks.find(s => s.id === subtaskId);
            if (!subtask) return { status: 'noop', period: null };

            const periodKey = getSubtaskPeriodKey(habit);
            if (!subtask.completedPeriods) subtask.completedPeriods = {};

            const wasCompleted = subtask.completedPeriods[periodKey];
            const today = getTodayString();
            const isTwiceDaily = habit.frequency.type === FREQ.TWICE_DAILY;
            const currentPeriod = getTimeOfDayNow() === PERIOD.MORNING ? PERIOD.MORNING : PERIOD.NIGHT;
            const period = isTwiceDaily ? currentPeriod : null;

            if (wasCompleted) {
                delete subtask.completedPeriods[periodKey];
                // Unticking a subtask drops the habit's completion for this period.
                if (isTwiceDaily) {
                    habit.completions = habit.completions.filter(c => !(c.date === today && c.period === currentPeriod));
                } else {
                    habit.completions = habit.completions.filter(c => c.date !== today);
                }
                return { status: 'toggled', period };
            }

            subtask.completedPeriods[periodKey] = Date.now();
            hapticFeedback();

            const allCompleted = habit.subtasks.every(s => s.completedPeriods && s.completedPeriods[periodKey]);
            const alreadyCompleted = isTwiceDaily
                ? habit.completions.some(c => c.date === today && c.period === currentPeriod)
                : habit.completions.some(c => c.date === today);

            if (allCompleted && !alreadyCompleted) {
                // The confirm-description (if any) is already shown inside
                // this subtask popup, so finishing the subtasks IS the
                // confirmation — no separate confirm popup needed.
                recordCompletion(habits, habit, period, periodKey);
                return { status: 'completed', period };
            }
            return { status: 'toggled', period };
        }

        function completeHabitWithAllSubtasks(habitId) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === habitId);
            if (!habit) return;

            const periodKey = getSubtaskPeriodKey(habit);
            const isTwiceDaily = habit.frequency.type === FREQ.TWICE_DAILY;
            const currentPeriod = getTimeOfDayNow() === PERIOD.MORNING ? PERIOD.MORNING : PERIOD.NIGHT;
            const period = isTwiceDaily ? currentPeriod : null;

            // Complete all subtasks
            if (habit.subtasks) {
                habit.subtasks.forEach(s => {
                    if (!s.completedPeriods) s.completedPeriods = {};
                    s.completedPeriods[periodKey] = Date.now();
                });
            }

            // Confirm-description is shown inside this popup already, so
            // "Complete All" is the confirmation — no second popup.
            hapticFeedback();
            recordCompletion(habits, habit, period, periodKey);

            saveHabits(habits);
            closeSubtaskPopup();
            if (isOverlayActive('detailsOverlay')) closeDetails();
            renderHabits();
        }

        function toggleSubtaskFromPopup(habitId, subtaskId) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === habitId);
            if (!habit || !habit.subtasks) return;

            const { status } = applySubtaskToggle(habits, habit, subtaskId);
            if (status === 'noop') return;

            saveHabits(habits);
            if (status === 'completed') {
                closeSubtaskPopup();
                if (isOverlayActive('detailsOverlay')) closeDetails();
            } else {
                renderSubtaskPopup();
            }
            renderHabits();
        }

        // Points popup functions
        let pointsPopupHabitId = null;

        function openPointsPopup(habitId) {
            pointsPopupHabitId = habitId;
            renderPointsPopup();
            showOverlay('pointsPopupOverlay');
        }

        function closePointsPopup() {
            hideOverlay('pointsPopupOverlay');
            pointsPopupHabitId = null;
        }

        function renderPointsPopup() {
            const habit = loadHabits().find(h => h.id === pointsPopupHabitId);
            if (!habit) return;

            const icon = habit.icon || '📌';
            const freq = habit.frequency;
            const isDaily = freq.type === FREQ.POINTS_PER_DAY;
            const isWeekly = freq.type === FREQ.POINTS_PER_WEEK;
            const target = isDaily ? (freq.pointsPerDay || 4) : isWeekly ? (freq.pointsPerWeek || 12) : (freq.pointsPerMonth || 30);
            const period = isDaily ? PERIOD.DAY : isWeekly ? PERIOD.WEEK : PERIOD.MONTH;

            // Points habits complete straight through this popup (they skip
            // the confirm-description gate), so surface the description here
            // — same Description section the subtask/confirm popups use.
            const descSection = popupDescriptionSection(habit);

            renderPopup('pointsPopup', {
                icon, title: habit.name, onClose: 'closePointsPopup()',
                bodyHtml: `${descSection}<div class="points-popup-target">Target: ${target} pts / ${period}</div>
                <div class="points-popup-buttons">
                    <button class="points-btn" onclick="completeWithPoints(${habit.id}, 1)">1</button>
                    <button class="points-btn" onclick="completeWithPoints(${habit.id}, 2)">2</button>
                    <button class="points-btn" onclick="completeWithPoints(${habit.id}, 3)">3</button>
                </div>`
            });
        }

        function completeWithPoints(habitId, points) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === habitId);
            if (!habit) return;

            const today = getTodayString();
            const wasCompleted = isCompletedToday(habit);
            const timestamp = Date.now();
            habit.completions.push({ date: today, timestamp, points });
            hapticFeedback();
            lastCompletion = { habitId, date: today, period: null, timestamp, type: 'complete' };
            showUndoToast();

            // Boost momentum based on points
            boostMomentumScore(habit, points);

            if (!wasCompleted && isCompletedToday(habit)) triggerAutoComplete(habits, habit);

            saveHabits(habits);
            closePointsPopup();
            renderHabits();
        }

        function boostMomentumScore(habit, points = 1) {
            // Boost momentum based on points (more points = more boost)
            const boost = 10 + (points - 1) * 5; // 1pt=10, 2pt=15, 3pt=20
            habit.momentumScore = (habit.momentumScore || 0) + boost;
            habit.lastScoreUpdate = getTodayString();
        }

        // ========================================
        // DETAILS MODAL
        // ========================================

        let editMode = false;

        function openDetails(id) {
            selectedHabitId = id;
            // If All Habits is currently open, remember to return there on
            // close. This covers any caller that lands here from the All
            // Habits view without going through openDetailsFromAllHabits
            // explicitly.
            const fromAllHabits = isOverlayActive('allHabitsOverlay');
            detailsOpenedFromAllHabits = fromAllHabits;
            if (fromAllHabits) {
                hideOverlay('allHabitsOverlay');
            }
            editMode = false;
            formMode = 'create';
            renderDetails();
            showOverlay('detailsOverlay');
        }

        function openDetailsFromAllHabits(id) {
            selectedHabitId = id;
            detailsOpenedFromAllHabits = true;
            editMode = false;
            formMode = 'create';
            // Close All Habits overlay first so details can be seen
            hideOverlay('allHabitsOverlay');
            renderDetails();
            showOverlay('detailsOverlay');
        }

        function openDetailsEdit(id) {
            const habit = loadHabits().find(h => h.id === id);
            if (!habit) return;
            selectedHabitId = id;
            editMode = true;
            formMode = 'edit';
            formHabitId = id;
            initFormStateFromHabit(habit);
            renderDetails();
            showOverlay('detailsOverlay');
        }

        function closeDetails() {
            hideOverlay('detailsOverlay');
            selectedHabitId = null;
            editMode = false;
            formMode = 'create';
            resetFormState();
            // Closing details always returns to the home screen, even if the
            // user originally opened the habit from All Habits. The All
            // Habits view stays closed so the user lands somewhere familiar
            // instead of being pushed back into a list.
            detailsOpenedFromAllHabits = false;
        }

        // "⋮" overflow menu in the details action bar. Anchored to the
        // tapped button (opens upward from that point), not centered.
        function closeDetailsMoreMenu() {
            document.querySelectorAll('.kebab-backdrop, .kebab-menu').forEach(e => e.remove());
        }
        function openDetailsMoreMenu(event, id) {
            event.stopPropagation();
            closeDetailsMoreMenu();
            const habit = loadHabits().find(h => h.id === id);
            if (!habit) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const backdrop = document.createElement('div');
            backdrop.className = 'kebab-backdrop';
            backdrop.onclick = closeDetailsMoreMenu;
            const menu = document.createElement('div');
            menu.className = 'kebab-menu';
            // "Move to Today" is always offered here and always pressable.
            // It pulls the most recent past completion forward; when the
            // habit is scheduled for a future day it drops the blocking
            // completion (so today becomes due) instead. A no-op when there
            // is nothing to move (e.g. already due/completed today).
            const moveFutureDue = habit.completions.some(c => c.date !== getTodayString()) && !isDueToday(habit);
            menu.innerHTML = `
                <button onclick="closeDetailsMoreMenu();${moveFutureDue ? `moveScheduleToToday(${id})` : `moveCompletionToToday(${id})`}">Move to Today</button>
                <button onclick="closeDetailsMoreMenu();freshStartHabit(${id})">Reset Momentum</button>
                <button onclick="closeDetailsMoreMenu();resetHabitStats(${id})">Reset Stats</button>
                <button onclick="closeDetailsMoreMenu();${habit.archived ? `unarchiveHabit(${id})` : `archiveHabit(${id})`}">${habit.archived ? 'Unarchive' : 'Archive'}</button>
                <button class="danger" onclick="closeDetailsMoreMenu();deleteHabit(${id})">Delete</button>`;
            document.body.appendChild(backdrop);
            document.body.appendChild(menu);
            // Measure, then anchor to the button (open upward/left).
            const mw = menu.offsetWidth, mh = menu.offsetHeight;
            let left = rect.right - mw;
            if (left < 8) left = 8;
            let top = rect.top - mh - 6;
            if (top < 8) top = rect.bottom + 6;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }

        function toggleEditMode() {
            const habit = loadHabits().find(h => h.id === selectedHabitId);
            if (!habit) return;
            editMode = !editMode;
            if (editMode) {
                formMode = 'edit';
                formHabitId = habit.id;
                initFormStateFromHabit(habit);
            } else {
                formMode = 'create';
                resetFormState();
            }
            renderDetails();
        }

        function updateEditSubtask(habitId, subtaskId, newName) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === habitId);
            if (habit) {
                const subtask = habit.subtasks.find(s => s.id === subtaskId);
                if (subtask && newName.trim()) {
                    subtask.name = newName.trim();
                    saveHabits(habits);
                }
            }
        }

        function saveHabitEdit() {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === selectedHabitId);
            if (!habit) return;

            const nameInput = document.getElementById('editHabitName');
            const descInput = document.getElementById('editHabitDesc');
            const newName = nameInput ? nameInput.value.trim() : habit.name;
            if (!newName) return;

            habit.name = newName;
            habit.description = descInput ? descInput.value.trim() : (habit.description || '');
            habit.icon = formState.icon || habit.icon || HABIT_EMOJIS[0];
            habit.timeOfDay = formState.time;

            // Use shared frequency type determination
            const finalFreqType = getFrequencyType();
            habit.frequency.type = finalFreqType;
            habit.usePoints = formState.isPointsMode;

            // Save frequency-specific values (validate minimum 1)
            if (finalFreqType === FREQ.TIMES_PER_DAY || finalFreqType === FREQ.TIMES_PER_WEEK || finalFreqType === FREQ.TIMES_PER_MONTH) {
                const input = document.getElementById('editTimesPerPeriod') || document.getElementById('editDailyTimes');
                const val = Math.max(1, parseInt(input?.value) || DEFAULTS.TIMES_PER_PERIOD);
                habit.frequency.timesPerDay = val;
                habit.frequency.timesPerWeek = val;
                habit.frequency.timesPerMonth = val;
            }
            // Delay-after-completion (Daily×N only). The input only exists
            // when Daily with count > 1, so it clears itself otherwise.
            habit.frequency.delayHours = Math.max(0, parseInt(document.getElementById('editDelayHours')?.value) || 0);
            if (finalFreqType === FREQ.EVERY_X_DAYS) {
                const input = document.getElementById('editEveryXPeriod');
                const val = Math.max(1, parseInt(input?.value) || DEFAULTS.EVERY_X_DAYS);
                habit.frequency.everyXDays = formState.afterPeriod === PERIOD.DAY ? val : null;
                habit.frequency.everyXWeeks = formState.afterPeriod === PERIOD.WEEK ? val : null;
                habit.frequency.everyXMonths = formState.afterPeriod === PERIOD.MONTH ? val : null;
                if (formState.isPointsMode) {
                    const ptsInput = document.getElementById('editPointsTarget');
                    habit.frequency.pointsTarget = Math.max(1, parseInt(ptsInput?.value) || DEFAULTS.POINTS_TARGET);
                }
            }
            if (finalFreqType === FREQ.REMINDER) {
                const input = document.getElementById('editReminderDays');
                habit.frequency.reminderDays = Math.max(1, parseInt(input?.value) || DEFAULTS.REMINDER_DAYS);
            }
            if (finalFreqType === FREQ.POINTS_PER_DAY || finalFreqType === FREQ.POINTS_PER_WEEK || finalFreqType === FREQ.POINTS_PER_MONTH) {
                const input = document.getElementById('editPointsPerPeriod');
                const val = Math.max(1, parseInt(input?.value) || DEFAULTS.POINTS_PER_PERIOD);
                habit.frequency.pointsPerDay = val;
                habit.frequency.pointsPerWeek = val;
                habit.frequency.pointsPerMonth = val;
            }

            // Save allow optional preference
            habit.allowOptional = formState.allowOptional;

            // Save reminder mode flag
            habit.isReminder = formState.isReminderMode;

            // --- DISABLED: negative-habit feature ---
            // Save negative habit flag
            // habit.isNegative = formState.isNegative;

            // Save no-momentum flag
            habit.noMomentum = formState.noMomentum;

            // Save confirm description flag
            habit.confirmDescription = formState.confirmDescription;

            // Save auto-completes
            habit.autoCompletes = document.getElementById('editAutoCompletes')?.value.trim() || '';

            // Save linked-habit (bidirectional companion)
            const linkedRaw = document.getElementById('editLinkedHabit')?.value.trim() || '';
            syncLinkedHabit(habits, habit.id, linkedRaw);

            // Save conflicts-with (one-directional: hide on days that habit is due)
            habit.conflictsWith = document.getElementById('editConflictsWith')?.value.trim() || '';

            // Save sequential-subtasks flag
            habit.sequentialSubtasks = formState.sequentialSubtasks;

            saveHabits(habits);
            editMode = false;
            formMode = 'create';
            resetFormState();
            renderHabits();
            // Return to home after editing (close details, don't go back to All Habits)
            detailsOpenedFromAllHabits = false;
            closeDetails();
        }

        function renderDetails() {
            const habit = loadHabits().find(h => h.id === selectedHabitId);
            if (!habit) return;
            const today = getTodayString();

            if (editMode) {
                // Edit mode - use shared form renderer
                formMode = 'edit';
                formHabitId = habit.id;
                document.getElementById('detailsModal').innerHTML = renderHabitForm(habit);
                fitOptionsToTwoLines();
                growSubtaskInputs();
            } else {
                // View mode
                const total = habit.completions.length;
                const uniqueDays = new Set(habit.completions.map(c => c.date)).size;
                const daysSinceCreated = Math.max(1, daysBetween(habit.createdAt, today) + 1);
                // Schedule-aware adherence: completed vs. expected occurrences
                // for the habit's OWN cadence (not the calendar), capped at
                // 100%. Calendar-based rate made every non-daily habit look
                // like a failure even at perfect adherence.
                const _cycleDays = Math.max(1, getHabitCycleDays(habit));
                const _ft = habit.frequency.type;
                const _perTap = _ft === FREQ.TIMES_PER_WEEK || _ft === FREQ.TIMES_PER_MONTH
                    || _ft === FREQ.TIMES_PER_DAY || _ft === FREQ.POINTS_PER_DAY
                    || _ft === FREQ.POINTS_PER_WEEK || _ft === FREQ.POINTS_PER_MONTH;
                const _doneCount = _perTap ? total : uniqueDays;
                const _expected = Math.max(1, Math.round(daysSinceCreated / _cycleDays));
                const rate = Math.min(100, Math.round((_doneCount / _expected) * 100));

                let avgInterval = '-';
                if (habit.completions.length > 1) {
                    const sorted = [...habit.completions].map(c => c.date).sort();
                    let totalDays = 0, count = 0;
                    for (let i = 1; i < sorted.length; i++) {
                        if (sorted[i] !== sorted[i-1]) { totalDays += daysBetween(sorted[i-1], sorted[i]); count++; }
                    }
                    if (count > 0) avgInterval = (totalDays / count).toFixed(1) + 'd';
                }

                const isSnoozed = habit.snoozedUntil && (habit.snoozedUntil === 'night' || habit.snoozedUntil > today);
                const canSnooze = !isSnoozed && !isCompletedToday(habit);

                // Determine habit status
                let habitStatus = '';
                let statusColor = '#3b82f6'; // Default blue for Ready

                if (habit.snoozedUntil === 'night') {
                    habitStatus = 'Snoozed until tonight';
                    statusColor = '#f59e0b';
                } else if (habit.snoozedUntil && habit.snoozedUntil > today) {
                    // Show time-until (rounded days/weeks/months), not the date.
                    const d = Math.max(1, daysBetween(today, habit.snoozedUntil));
                    if (d === 1) {
                        habitStatus = 'Snoozed until tomorrow';
                    } else if (d < 7) {
                        habitStatus = `Snoozed for ${d} days`;
                    } else if (d < 30) {
                        const w = Math.round(d / 7);
                        habitStatus = `Snoozed for ${w} week${w !== 1 ? 's' : ''}`;
                    } else {
                        const m = Math.round(d / 30);
                        habitStatus = `Snoozed for ${m} month${m !== 1 ? 's' : ''}`;
                    }
                    statusColor = '#f59e0b';
                } else if (isCompletedToday(habit)) {
                    habitStatus = 'Done';
                    statusColor = '#22c55e';
                } else if (isOptional(habit)) {
                    habitStatus = 'Optional';
                    statusColor = '#a855f7';
                } else if (habit.timeOfDay === 'night' && getTimeOfDayNow() === 'morning') {
                    habitStatus = 'Later (bedtime)';
                    statusColor = '#888';
                } else if (habit.frequency.type === FREQ.TWICE_DAILY) {
                    const twiceStatus = getCompletionStatus(habit);
                    if (twiceStatus.morningDone && !twiceStatus.nightDone) {
                        if (getTimeOfDayNow() === 'morning') {
                            habitStatus = 'Later (bedtime)';
                            statusColor = '#888';
                        } else {
                            habitStatus = 'Ready';
                        }
                    } else {
                        habitStatus = 'Ready';
                    }
                } else if (habit.frequency.type === FREQ.EVERY_X_DAYS || habit.frequency.type === FREQ.REMINDER) {
                    const lastCompletion = getLastCompletionDate(habit);
                    if (lastCompletion) {
                        let intervalDays;
                        if (habit.frequency.everyXWeeks) intervalDays = habit.frequency.everyXWeeks * 7;
                        else if (habit.frequency.everyXMonths) intervalDays = habit.frequency.everyXMonths * 30;
                        else intervalDays = habit.frequency.everyXDays || habit.frequency.reminderDays || 2;

                        const lastDate = new Date(lastCompletion + 'T00:00:00');
                        const nextDueDate = new Date(lastDate);
                        nextDueDate.setDate(nextDueDate.getDate() + intervalDays);
                        const nextDueStr = nextDueDate.toISOString().split('T')[0];

                        if (nextDueStr > today) {
                            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                            const tomorrowStr = tomorrow.toISOString().split('T')[0];
                            if (nextDueStr === tomorrowStr) {
                                habitStatus = 'Reappears tomorrow';
                            } else {
                                habitStatus = `Reappears ${nextDueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
                            }
                            statusColor = '#888';
                        } else {
                            habitStatus = 'Ready';
                        }
                    } else {
                        habitStatus = 'Ready';
                    }
                } else if (canDoNow(habit)) {
                    habitStatus = 'Ready';
                } else {
                    habitStatus = 'Ready';
                }

                // Build "after completion" label dynamically
                const afterLabel = habit.frequency.everyXWeeks ? `${habit.frequency.everyXWeeks} weeks after` :
                                   habit.frequency.everyXMonths ? `${habit.frequency.everyXMonths} months after` :
                                   `${habit.frequency.everyXDays || 2} days after`;
                const freqLabel = { daily: 'Daily', reminder: `${habit.frequency.reminderDays || 1} days after`, twiceDaily: 'Twice daily', timesPerDay: `${habit.frequency.timesPerDay || 1}× / day`, timesPerWeek: `${habit.frequency.timesPerWeek || 3}× / wk`, timesPerMonth: `${habit.frequency.timesPerMonth || 4}× / mo`, everyXDays: afterLabel, pointsPerDay: `${habit.frequency.pointsPerDay || 4} pts / day`, pointsPerWeek: `${habit.frequency.pointsPerWeek || 12} pts / wk`, pointsPerMonth: `${habit.frequency.pointsPerMonth || 30} pts / mo` }[habit.frequency.type];
                const timeIcon = habit.timeOfDay ? { morning: '🌅', night: '🌙' }[habit.timeOfDay] : '';

                // Momentum score
                const scoreData = calculateMomentumScore(habit);
                const displayScore = scoreData.display;
                const rawScore = scoreData.raw;
                const lastCompletion = getLastCompletionDate(habit);
                const daysSinceCompletion = lastCompletion ? daysBetween(lastCompletion, today) : 999;
                const canFreshStart = daysSinceCompletion >= 60 || displayScore <= -3;

                // Recovery info (shown inline with momentum label)
                let recoveryText = '';
                if (displayScore < 0) {
                    const completionsNeeded = Math.ceil(Math.abs(scoreData.raw) / 15);
                    recoveryText = ` · ${completionsNeeded} to recover`;
                }

                const scoreClass = rawScore > 0 ? 'positive' : (rawScore < 0 ? 'negative' : 'neutral');
                const icon = habit.icon || '📌';
                const isReminder = habit.isReminder || habit.frequency.type === FREQ.REMINDER;

                // Determine if habit can be completed and how
                const isPointsBased = habit.frequency.type === FREQ.POINTS_PER_WEEK || habit.frequency.type === FREQ.POINTS_PER_MONTH;
                const isTwiceDaily = habit.frequency.type === FREQ.TWICE_DAILY;
                const completedToday = isCompletedToday(habit);
                const status = getCompletionStatus(habit);

                let completeButton = '';
                let undoButton = '';
                if (!completedToday) {
                    // "Move to Today" (for habits with past completions /
                    // scheduled for a future day) now lives in the ⋮ menu
                    // only — see openDetailsMoreMenu. The main bar always
                    // shows the normal Complete action.
                    if (isPointsBased) {
                        completeButton = `<button id="detailsCompleteBtn" class="submit-btn" style="flex:1;background:#4ade80" onclick="closeDetails();openPointsPopup(${habit.id})">Complete</button>`;
                    } else if (isTwiceDaily) {
                        const canComplete = !status.morningDone || !status.nightDone;
                        if (canComplete) {
                            completeButton = `<button id="detailsCompleteBtn" class="submit-btn" style="flex:1;background:#4ade80" onclick="completeHabitFromDetails(${habit.id})">Complete</button>`;
                        }
                    } else {
                        completeButton = `<button id="detailsCompleteBtn" class="submit-btn" style="flex:1;background:#4ade80" onclick="completeHabitFromDetails(${habit.id})">Complete</button>`;
                    }
                } else {
                    // Already completed: keep the Complete button visible but
                    // disabled/greyed so the layout stays consistent and it's
                    // clear the action has been taken. Undo sits next to it.
                    completeButton = `<button id="detailsCompleteBtn" class="submit-btn" style="flex:1;background:#2a2a3e;color:#666;opacity:0.6;cursor:default" disabled>Complete</button>`;
                    undoButton = `<button class="submit-btn secondary" style="flex:1" onclick="undoHabitCompletion(${habit.id})">Undo</button>`;
                }

                const _dHdr = `
                    <div class="modal-header" style="gap:10px">
                        <div style="display:flex;align-items:center;gap:10px;min-width:0">
                            <span style="font-size:1.6rem;flex-shrink:0;line-height:1">${icon}</span>
                            <span class="details-habit-name" style="text-align:left;font-size:1.05rem;min-width:0;overflow-wrap:anywhere;line-height:1.25">${escapeHtml(habit.name)}${timeIcon ? ` <span title="${habit.timeOfDay === 'morning' ? 'Morning' : 'Bedtime'}">${timeIcon}</span>` : ''}</span>
                        </div>
                        <button class="modal-close" onclick="closeDetails()" style="flex-shrink:0">&times;</button>
                    </div>`;
                const _dBody = `
                    ${habit.description ? `<div style="margin-bottom:14px">
                        <div style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Description</div>
                        <div style="color:#aaa;font-size:0.85rem;line-height:1.4;border:1px solid #2a2a3e;border-radius:8px;padding:10px 12px;background:rgba(255,255,255,0.02)">${formatDescription(habit.description)}</div>
                    </div>` : ''}
                    ${!isReminder && !habit.noMomentum ? `<div class="momentum-display" style="margin-top:0;margin-bottom:12px">
                        <div class="momentum-score ${scoreClass}">${rawScore}<span class="momentum-max">/100</span></div>
                        <div class="momentum-label">Momentum${recoveryText}</div>
                    </div>` : ''}
                    ${(() => {
                        const isPts = habit.frequency.type === FREQ.POINTS_PER_DAY || habit.frequency.type === FREQ.POINTS_PER_WEEK || habit.frequency.type === FREQ.POINTS_PER_MONTH;
                        const cells = [
                            `<div class="detail-cell"><div class="dc-label">Status</div><div class="dc-value" style="color:${statusColor}">${habitStatus}</div></div>`,
                            `<div class="detail-cell"><div class="dc-label">Frequency</div><div class="dc-value">${freqLabel}</div></div>`,
                        ];
                        if (isPts) cells.push(`<div class="detail-cell"><div class="dc-label">Progress</div><div class="dc-value">${getCompletionStatus(habit).text}</div></div>`);
                        return `<div class="detail-grid" style="grid-template-columns:repeat(${cells.length},1fr)">${cells.join('')}</div>`;
                    })()}
                    ${!isReminder ? `<div class="stats-grid">
                        <div class="stat-box"><div class="stat-number">${total}</div><div class="stat-label">Total</div></div>
                        <div class="stat-box"><div class="stat-number">${rate}%</div><div class="stat-label">Rate</div></div>
                        <div class="stat-box"><div class="stat-number">${avgInterval}</div><div class="stat-label">Avg Gap</div></div>
                    </div>` : ''}
                    ${habit.subtasks && habit.subtasks.length > 0 ? `
                    <div class="subtask-list" style="margin:10px 0">
                        <div style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Subtasks</div>
                        <div class="subtasks-scroll-container compact3">
                            ${habit.subtasks.map(s => {
                                const completed = isSubtaskCompleted(habit, s.id);
                                return `<div class="subtask-item" style="cursor:default">
                                    <div class="subtask-checkbox ${completed ? 'checked' : ''}"></div>
                                    <span class="subtask-name ${completed ? 'completed' : ''}">${escapeHtml(s.name)}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>` : ''}`;
                const _dFooter = `
                    <div class="action-buttons">
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">
                            ${completeButton}
                            ${undoButton}
                            <button class="submit-btn secondary" style="flex:1" onclick="toggleEditMode()">Edit</button>
                        </div>
                        <div style="display:flex;gap:6px">
                            ${canSnooze ? `<button class="submit-btn secondary" style="flex:1" onclick="openSnoozePopup(${habit.id}, true)">Snooze</button>
                            <button class="submit-btn secondary" style="flex:1" onclick="openSnoozePopup(${habit.id}, false)">Ignore</button>` : ''}
                            ${isSnoozed ? `<button class="submit-btn secondary" style="flex:1" onclick="unsnoozeHabit(${habit.id})">Unsnooze</button>` : ''}
                            <button class="submit-btn secondary" style="flex:0 0 48px;margin-left:auto" aria-label="More actions" onclick="openDetailsMoreMenu(event, ${habit.id})">⋮</button>
                        </div>
                    </div>`;
                document.getElementById('detailsModal').innerHTML = detailsShell(_dHdr, _dBody, _dFooter);
            }
        }

        // ========================================
        // ALL HABITS VIEW
        // ========================================

        let allHabitsSearchQuery = '';
        // Momentum-ring overlay: only available in the All Habits menu.
        let allHabitsMomentumRings = localStorage.getItem('allHabitsMomentumRings') === '1';

        function toggleAllHabitsMomentum(on) {
            allHabitsMomentumRings = on;
            localStorage.setItem('allHabitsMomentumRings', on ? '1' : '0');
            renderAllHabitsGrid();
        }

        let allHabitsSort = 'status';   // status | alpha | momentum | overdue
        let allHabitsFilter = 'all';    // all | reminders | subtasks | snoozed | archived
        let allHabitsSortReversed = false;
        function setAllHabitsSort(v) { allHabitsSort = v; renderAllHabitsGrid(); }
        function setAllHabitsFilter(v) { allHabitsFilter = v; renderAllHabitsGrid(); }
        function toggleAllHabitsSortDir() {
            allHabitsSortReversed = !allHabitsSortReversed;
            // The button lives in the fixed header (rendered once), so update
            // its arrow directly — renderAllHabitsGrid only redraws the list.
            const btn = document.getElementById('ahOrderBtn');
            if (btn) btn.textContent = allHabitsSortReversed ? '↓' : '↑';
            renderAllHabitsGrid();
        }

        function allHabitsFilterPredicate(h) {
            switch (allHabitsFilter) {
                case 'reminders': return !h.archived && (h.isReminder || h.frequency?.type === FREQ.REMINDER);
                case 'subtasks':  return !h.archived && h.subtasks && h.subtasks.length > 0;
                case 'snoozed':   return !!h.snoozedUntil;
                // --- DISABLED: negative-habit feature ---
                // case 'negative':  return !h.archived && h.isNegative;
                case 'archived':  return !!h.archived;
                default:          return !h.archived; // 'all'
            }
        }
        function allHabitsSortCompare(a, b) {
            if (allHabitsSort === 'alpha') return a.name.localeCompare(b.name);
            if (allHabitsSort === 'momentum') return calculateMomentumScore(a).raw - calculateMomentumScore(b).raw;
            if (allHabitsSort === 'overdue') return getDaysOverdue(b) - getDaysOverdue(a) || getHabitStatusOrder(a) - getHabitStatusOrder(b);
            // 'status'
            return getHabitStatusOrder(a) - getHabitStatusOrder(b)
                || getSnoozeDate(a).localeCompare(getSnoozeDate(b))
                || a.name.localeCompare(b.name);
        }

        function openAllHabits() {
            allHabitsSearchQuery = '';
            renderAllHabits();
            showOverlay('allHabitsOverlay');
            setTimeout(() => document.getElementById('allHabitsSearch')?.focus(), 100);
        }

        function closeAllHabits() {
            hideOverlay('allHabitsOverlay');
            allHabitsSearchQuery = '';
        }

        // Simple fuzzy match - checks if all characters appear in order
        function fuzzyMatch(text, query) {
            if (!query) return true;
            text = text.toLowerCase();
            query = query.toLowerCase();

            // First check if query is a substring (best match)
            if (text.includes(query)) return { match: true, score: 2 };

            // Then check fuzzy match (characters in order)
            let qi = 0;
            for (let i = 0; i < text.length && qi < query.length; i++) {
                if (text[i] === query[qi]) qi++;
            }
            if (qi === query.length) return { match: true, score: 1 };

            return { match: false, score: 0 };
        }

        function onAllHabitsSearch(value) {
            allHabitsSearchQuery = value;
            renderAllHabitsGrid();
        }

        function getHabitStatusOrder(habit) {
            // Returns a number for sorting: lower = show first
            // 0 = Ready, 1 = Optional, 2 = Later/Snoozed, 3 = Done/Missed
            if (isCompletedToday(habit)) return 3;
            if (isOptional(habit)) return 1;
            if (canDoNow(habit)) return 0;
            if (isForLater(habit) || habit.snoozedUntil) return 2;
            return 3; // Default to done/missed
        }

        function getSnoozeDate(habit) {
            // Returns sortable date string for snoozed habits, or empty string
            if (!habit.snoozedUntil) return '';
            if (habit.snoozedUntil === 'night') return getTodayString(); // Tonight = today
            return habit.snoozedUntil;
        }

        function renderAllHabitsGrid() {
            const habits = loadHabits();
            const grid = document.getElementById('allHabitsGrid');
            const noResults = document.getElementById('allHabitsNoResults');
            if (!grid) return;

            // Apply search, then the attribute filter, then the chosen sort.
            let filtered = habits;
            if (allHabitsSearchQuery) {
                filtered = habits
                    .map(h => ({ habit: h, ...fuzzyMatch(h.name, allHabitsSearchQuery) }))
                    .filter(h => h.match)
                    .map(h => h.habit);
            } else {
                filtered = [...habits];
            }
            filtered = filtered.filter(allHabitsFilterPredicate).sort(allHabitsSortCompare);
            if (allHabitsSortReversed) filtered.reverse();

            if (!filtered.length) {
                grid.innerHTML = '';
                if (noResults) noResults.style.display = 'block';
                return;
            }

            if (noResults) noResults.style.display = 'none';

            // Separate archived habits
            const activeHabits = filtered.filter(h => !h.archived);
            const archivedHabits = filtered.filter(h => h.archived);

            // Split active into Now (ready/optional) and Other sections
            const nowHabits = activeHabits.filter(h => canDoNow(h) || isOptional(h));
            const otherHabits = activeHabits.filter(h => !canDoNow(h) && !isOptional(h));

            const renderHabitItem = (habit) => {
                const icon = habit.icon || '📌';
                const opacity = habit.archived ? 'opacity: 0.5;' : '';
                let ringStyle = '--progress: 0%; background: #2a2a3e;';
                if (allHabitsMomentumRings) {
                    // Map momentum (-100..100) to a 0..100% perimeter fill;
                    // higher momentum = more of the ring coloured. Hue runs
                    // red -> amber -> green so the colour itself reads as
                    // low/mid/high, with a soft track (no outer glow).
                    const raw = Math.max(-100, Math.min(100, calculateMomentumScore(habit).raw));
                    const pct = Math.round((raw + 100) / 2);
                    const hue = Math.round((pct / 100) * 130); // 0=red .. 130=green
                    const color = `hsl(${hue} 70% 55%)`;
                    ringStyle = `--progress: ${pct}%;`
                        + `background: conic-gradient(${color} ${pct}%, #23233a ${pct}%);`
                        + `box-shadow: 0 0 0 1px #23233a inset;`;
                }
                return `<div class="habit-icon-wrapper" style="${opacity}">
                    <div class="habit-icon" onclick="openDetailsFromAllHabits(${habit.id})">
                        <div class="habit-ring" style="${ringStyle}">
                            <span class="habit-emoji">${icon}</span>
                        </div>
                    </div>
                    <span class="habit-name">${escapeHtml(habit.name)}</span>
                </div>`;
            };

            let html = '';
            if (allHabitsSort === 'status' && allHabitsFilter === 'all') {
                // Default view keeps the Now / Later / Archived sections.
                if (nowHabits.length) {
                    html += `<div class="all-habits-section-header">Now</div>`;
                    html += `<div class="habits-grid">${nowHabits.map(renderHabitItem).join('')}</div>`;
                }
                if (otherHabits.length) {
                    html += `<div class="all-habits-section-header" style="margin-top:16px">Later</div>`;
                    html += `<div class="habits-grid">${otherHabits.map(renderHabitItem).join('')}</div>`;
                }
                if (archivedHabits.length) {
                    html += `<div class="all-habits-section-header" style="margin-top:16px;color:#666">Archived</div>`;
                    html += `<div class="habits-grid">${archivedHabits.map(renderHabitItem).join('')}</div>`;
                }
            } else {
                // Any active sort/filter: one flat grid in the chosen order.
                html += `<div class="habits-grid">${filtered.map(renderHabitItem).join('')}</div>`;
            }
            grid.innerHTML = html;
        }

        function renderAllHabits() {
            const habits = loadHabits();
            const modal = document.getElementById('allHabitsModal');

            if (!habits.length) {
                modal.innerHTML = `
                    <div class="modal-header">
                        <h2 class="modal-title">All Habits</h2>
                        <button class="modal-close" onclick="closeAllHabits()">&times;</button>
                    </div>
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div>No habits yet</div>
                    </div>`;
                return;
            }

            modal.innerHTML = `
                <div class="overlay-fixed-header">
                    <div class="modal-header">
                        <h2 class="modal-title">All Habits</h2>
                        <button class="modal-close" onclick="closeAllHabits()">&times;</button>
                    </div>
                    <div class="all-habits-search-wrapper">
                        <input type="text" id="allHabitsSearch" class="form-input" placeholder="Search habits..."
                            oninput="onAllHabitsSearch(this.value)" value="${escapeHtml(allHabitsSearchQuery)}" />
                    </div>
                    <div style="display:flex;gap:8px;padding:14px 0 8px">
                        <label class="ah-select-wrap">
                            <span class="ah-select-label">Sort</span>
                            <select class="ah-select" onchange="setAllHabitsSort(this.value)">
                                <option value="status" ${allHabitsSort === 'status' ? 'selected' : ''}>Status</option>
                                <option value="alpha" ${allHabitsSort === 'alpha' ? 'selected' : ''}>A–Z</option>
                                <option value="momentum" ${allHabitsSort === 'momentum' ? 'selected' : ''}>Momentum</option>
                            </select>
                        </label>
                        <label class="ah-select-wrap">
                            <span class="ah-select-label">Filter</span>
                            <select class="ah-select" onchange="setAllHabitsFilter(this.value)">
                                <option value="all" ${allHabitsFilter === 'all' ? 'selected' : ''}>All</option>
                                <option value="reminders" ${allHabitsFilter === 'reminders' ? 'selected' : ''}>Reminders</option>
                                <option value="subtasks" ${allHabitsFilter === 'subtasks' ? 'selected' : ''}>Has subtasks</option>
                                <option value="snoozed" ${allHabitsFilter === 'snoozed' ? 'selected' : ''}>Snoozed</option>
                                <option value="archived" ${allHabitsFilter === 'archived' ? 'selected' : ''}>Archived</option>
                            </select>
                        </label>
                        <label class="ah-select-wrap" style="flex:0 0 auto">
                            <span class="ah-select-label">Order</span>
                            <button id="ahOrderBtn" class="ah-select ah-order" style="cursor:pointer;min-width:46px" onclick="toggleAllHabitsSortDir()" aria-label="Reverse sort order" title="Reverse sort order">${allHabitsSortReversed ? '↓' : '↑'}</button>
                        </label>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 14px 10px;color:#aaa;font-size:0.82rem">
                        <span>Show momentum rings</span>
                        <label class="toggle-switch">
                            <input type="checkbox" ${allHabitsMomentumRings ? 'checked' : ''} onchange="toggleAllHabitsMomentum(this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <div class="overlay-scroll">
                    <div id="allHabitsNoResults" class="empty-state" style="display:none;padding:20px 0">
                        <div style="color:#888">No matching habits</div>
                    </div>
                    <div id="allHabitsGrid"></div>
                </div>`;

            renderAllHabitsGrid();
        }

        // ========================================
        // UTILITIES & TEST DATA
        // ========================================

        function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

        // Format description text as bullet points (each line becomes a bullet)
        function formatDescription(text) {
            if (!text) return '';
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) return '';
            if (lines.length === 1) return `<div style="display:flex;gap:6px;align-items:flex-start"><span style="color:#666;flex-shrink:0">•</span><span>${escapeHtml(lines[0])}</span></div>`;
            return lines.map(line =>
                `<div style="display:flex;gap:6px;align-items:flex-start;padding:1px 0"><span style="color:#666;flex-shrink:0">•</span><span>${escapeHtml(line)}</span></div>`
            ).join('');
        }

        let savedDataBeforeTest = null;

        function loadTestData() {
            // Save current data before loading test data
            savedDataBeforeTest = localStorage.getItem('habits_v3');

            const today = getTodayString();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = toDateString(yesterday);

            const testHabits = [
                { id: 1, name: 'Brush teeth', icon: '🦷', timeOfDay: null, frequency: { type: 'twiceDaily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, lastScoreUpdate: today, momentumScore: 0 },
                { id: 2, name: 'Meditate', icon: '🧘', timeOfDay: 'morning', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, lastScoreUpdate: today, momentumScore: 0 },
                { id: 3, name: 'Exercise', icon: '🏃', timeOfDay: 'morning', frequency: { type: 'timesPerWeek', timesPerWeek: 4, everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 301, name: 'Warmup', completedPeriods: {} },
                    { id: 302, name: 'Cardio', completedPeriods: {} },
                    { id: 303, name: 'Strength', completedPeriods: {} }
                ], createdAt: today, lastScoreUpdate: today, momentumScore: 0 },
                { id: 4, name: 'Read', icon: '📚', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, lastScoreUpdate: today, momentumScore: 0 },
                { id: 6, name: 'Water plants', icon: '🌱', timeOfDay: 'morning', frequency: { type: 'everyXDays', timesPerWeek: 3, everyXDays: 3 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, lastScoreUpdate: today, momentumScore: 0 },
                { id: 7, name: 'Take vitamins', icon: '💊', timeOfDay: 'morning', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, lastScoreUpdate: today, momentumScore: 0 },
                { id: 8, name: 'Skincare', icon: '✨', timeOfDay: null, frequency: { type: 'twiceDaily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 801, name: 'Cleanse', completedPeriods: {} },
                    { id: 802, name: 'Moisturize', completedPeriods: {} }
                ], createdAt: today, lastScoreUpdate: today, momentumScore: 0 },
                { id: 9, name: 'Check mail', icon: '📬', timeOfDay: null, frequency: { type: 'reminder', reminderDays: 1 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, lastScoreUpdate: today, momentumScore: 0 }
            ];
            saveHabits(testHabits);
            renderHabits();
        }

        function restoreData() {
            if (savedDataBeforeTest !== null) {
                localStorage.setItem('habits_v3', savedDataBeforeTest);
                savedDataBeforeTest = null;
                // Reset momentum to avoid negative scores from "missed" days
                const habits = loadHabits();
                habits.forEach(h => {
                    h.momentumScore = 0;
                    h.lastScoreUpdate = null;
                });
                saveHabits(habits);
                renderHabits();
            }
        }

        // Escape closes the topmost open overlay only. Closing one at a time
        // matters because closeDetails reopens All Habits when the user came
        // from there — calling closeAllHabits in the same handler would just
        // close it right back.
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            const closers = [
                ['dialogOverlay', closeDialog],
                ['tagGlossaryOverlay', closeTagGlossary],
                ['confirmDescPopupOverlay', closeConfirmDescPopup],
                ['snoozePopupOverlay', closeSnoozePopup],
                ['emojiPopupOverlay', closeEmojiPopup],
                ['pointsPopupOverlay', closePointsPopup],
                ['subtaskPopupOverlay', closeSubtaskPopup],
                ['settingsOverlay', closeSettings],
                ['detailsOverlay', closeDetails],
                ['modalOverlay', closeModal],
                ['allHabitsOverlay', closeAllHabits],
            ];
            for (const [id, close] of closers) {
                if (isOverlayActive(id)) {
                    close();
                    return;
                }
            }
        });

        // Long press support for touch devices (equivalent to right-click)
        let longPressTimer = null;
        let longPressTriggered = false;
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', e => {
            const habitIcon = e.target.closest('.habit-icon');
            if (!habitIcon) return;

            const habitId = habitIcon.dataset.habitId;
            if (!habitId) return;

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            longPressTriggered = false;

            longPressTimer = setTimeout(() => {
                longPressTriggered = true;
                openDetails(parseInt(habitId));
                // Haptic feedback if available
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        }, { passive: true });

        document.addEventListener('touchmove', e => {
            if (!longPressTimer) return;
            const moveX = Math.abs(e.touches[0].clientX - touchStartX);
            const moveY = Math.abs(e.touches[0].clientY - touchStartY);
            if (moveX > 10 || moveY > 10) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, { passive: true });

        document.addEventListener('touchend', e => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            if (longPressTriggered) {
                e.preventDefault();
                // Clear on the next tick. If the browser still synthesizes a
                // click after preventDefault, the capture-phase click handler
                // catches it and resets first. If preventDefault fully
                // suppresses the click (which it often does on mobile), the
                // flag would otherwise stay true forever and swallow the next
                // unrelated tap — e.g. the Settings button.
                setTimeout(() => { longPressTriggered = false; }, 50);
            }
        });

        document.addEventListener('touchcancel', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            longPressTriggered = false;
        });

        // Prevent click event after long press
        document.addEventListener('click', e => {
            if (longPressTriggered) {
                e.stopPropagation();
                e.preventDefault();
                longPressTriggered = false;
            }
        }, true);

        // Scroll/touch on overlay background closes the modal
        document.getElementById('detailsOverlay').addEventListener('touchmove', e => {
            // Only close if touching the overlay background, not the modal content
            if (e.target === document.getElementById('detailsOverlay')) {
                e.preventDefault();
                closeDetails();
            }
        }, { passive: false });

        // Swipe down to dismiss modals/popups
        let swipeStartY = 0;
        let swipeElement = null;
        let swipeActive = false;

        document.addEventListener('touchstart', e => {
            // Skip swipe handling when touching form inputs, textareas, or selects
            // so users can interact with number pickers, text fields, date pickers etc.
            const interactive = e.target.closest('input, textarea, select, button, .subtask-drag-handle');
            if (interactive) return;
            // Popups that contain their own scrollable region opt out of
            // swipe-to-dismiss — otherwise scrolling the inner content gets
            // interpreted as a dismiss gesture and closes the popup. Tap-
            // outside still closes them via handleOverlayClick.
            // Opt out: explicit [data-no-swipe-dismiss], and the nested
            // subtasks list — scrolling it (even a fast flick) must never
            // dismiss the sheet/popup, regardless of its scroll position.
            if (e.target.closest('[data-no-swipe-dismiss], .subtasks-scroll-container')) return;
            const modal = e.target.closest('.modal, .popup');
            if (modal) {
                // Only arm swipe-to-dismiss when the overlay's own scroll
                // body is at the very top — otherwise a normal downward
                // scroll would be hijacked into a dismiss (and its
                // preventDefault would cancel the scroll).
                const scrollable = e.target.closest('.overlay-scroll') || modal;
                if (scrollable.scrollTop <= 0) {
                    swipeStartY = e.touches[0].clientY;
                    swipeElement = modal;
                    swipeActive = false;
                }
            }
        }, { passive: true });

        document.addEventListener('touchmove', e => {
            if (!swipeElement || swipeStartY === 0) return;
            const currentY = e.touches[0].clientY;
            const delta = currentY - swipeStartY;

            // Only activate swipe if moving down
            if (delta > 10) {
                swipeActive = true;
                // Only the bottom-sheet (.modal) follows the finger. Centered
                // popups don't translate — they just dismiss on release if
                // the pull is far enough.
                if (swipeElement.classList.contains('modal')) {
                    const resistance = 0.5; // moves slower than finger
                    const translateY = Math.min(delta * resistance, 200);
                    swipeElement.style.transform = `translateY(${translateY}px)`;
                    swipeElement.style.transition = 'none';
                }
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchend', e => {
            if (!swipeElement || swipeStartY === 0) return;
            const swipeEndY = e.changedTouches[0].clientY;
            const swipeDelta = swipeEndY - swipeStartY;
            const elementToReset = swipeElement; // Save reference before clearing

            // Small popups (points/snooze/confirm/emoji/subtask) keep the
            // 80px threshold. Full modals (details/edit/create/settings) use
            // a larger 95px pull so the details/edit pages aren't dismissed
            // too easily by a light downward drag.
            const isSheet = swipeElement.classList.contains('modal');
            const dismissThreshold = isSheet ? 95 : 80;
            if (swipeActive && swipeDelta > dismissThreshold) {
                // Sheets slide out via inline transform; popups just close
                // (the overlay fade handles their disappearance — they never
                // moved). Close the overlay immediately so it stops catching
                // taps meant for the buttons underneath.
                if (isSheet) {
                    swipeElement.style.transition = 'transform 0.2s ease-out';
                    swipeElement.style.transform = 'translateY(100%)';
                }
                if (isOverlayActive('modalOverlay')) closeModal();
                else if (isOverlayActive('detailsOverlay')) closeDetails();
                else if (isOverlayActive('settingsOverlay')) closeSettings();
                else if (isOverlayActive('subtaskPopupOverlay')) closeSubtaskPopup();
                else if (isOverlayActive('pointsPopupOverlay')) closePointsPopup();
                else if (isOverlayActive('emojiPopupOverlay')) closeEmojiPopup();
                else if (isOverlayActive('snoozePopupOverlay')) closeSnoozePopup();
                else if (isOverlayActive('allHabitsOverlay')) closeAllHabits();
                setTimeout(() => {
                    elementToReset.style.transform = '';
                    elementToReset.style.transition = '';
                }, 200);
            } else if (swipeActive) {
                // Snap back
                swipeElement.style.transition = 'transform 0.2s ease-out';
                swipeElement.style.transform = '';
                setTimeout(() => {
                    elementToReset.style.transition = '';
                }, 200);
            }

            swipeStartY = 0;
            swipeElement = null;
            swipeActive = false;
        }, { passive: true });

        // On first visit (no data), load test data as initial experience
        if (!localStorage.getItem('habits_v3')) {
            loadTestData();
        }

        // --- DISABLED: linked-habit feature. One-time companion-link
        // migration kept commented for future re-enable. ---
        /*
        // One-time companion-link migration. Apply curated pairings to
        // existing saved habits if neither side already has a link set —
        // never overwrite a user-chosen link. Tracked by a localStorage
        // flag so it runs at most once per device.
        (function migrateCompanionLinks() {
            const KEY = 'migration_companion_links_v1';
            if (localStorage.getItem(KEY)) return;
            const pairs = [
                [36, 38],              // Brush teeth ↔ Floss
                [3, 1776936635163],    // Strength training ↔ Cardio
                [33, 47],              // Hair management ↔ Cut chest hair
            ];
            const habits = loadHabits();
            let changed = false;
            for (const [a, b] of pairs) {
                const ha = habits.find(h => h.id === a);
                const hb = habits.find(h => h.id === b);
                if (!ha || !hb) continue;
                if (ha.linkedHabit || hb.linkedHabit) continue;
                ha.linkedHabit = b;
                hb.linkedHabit = a;
                changed = true;
            }
            if (changed) saveHabits(habits);
            localStorage.setItem(KEY, '1');
        })();
        */

        // One-time: auto-complete & linked-habit ship inactive. Existing
        // installs may have a saved disabledTags from before these existed
        // (or an explicit []), so ensure both ids are in it once. Tracked by
        // a flag so the user can later enable them in Settings → Tags
        // without this re-disabling them.
        (function migrateOptInTags() {
            const KEY = 'migration_optin_tags_v1';
            if (localStorage.getItem(KEY)) return;
            try {
                const s = getSettings();
                const dt = Array.isArray(s.disabledTags) ? s.disabledTags.slice() : [];
                ['autoComplete', 'linkedHabit'].forEach(id => { if (!dt.includes(id)) dt.push(id); });
                localStorage.setItem('habit_settings', JSON.stringify({ ...s, disabledTags: dt }));
            } catch (e) { /* non-fatal */ }
            localStorage.setItem(KEY, '1');
        })();

        // Update scores on page load to persist momentum for missed days
        updateAllHabitScores();
        updateDisplay();

        // When a number input gains focus, select its current value so the
        // user can type to overwrite. Inline `onfocus="this.select()"` runs
        // before the touch's cursor-positioning on mobile and gets overridden
        // — deferring with setTimeout(0) lets the click finish first, so the
        // selection sticks. Covers any number-like input (type="number" or
        // inputmode="numeric") anywhere in the UI, current or future.
        document.addEventListener('focusin', e => {
            const t = e.target;
            if (t.tagName !== 'INPUT') return;
            if (t.type !== 'number' && t.inputMode !== 'numeric') return;
            setTimeout(() => {
                try { t.select(); } catch (_) {}
            }, 0);
        });

        // Initialize PWA and notifications.
        // Wait for the service worker to register before scheduling — otherwise
        // a notification fired right on open (via checkNotificationOnOpen) can
        // race ahead of swRegistration being set, fall through to the basic
        // Notification API, and silently fail in standalone PWA contexts.
        (async () => {
            if (window.AppPlatform) await AppPlatform.init();
            await registerServiceWorker();
            if (getSettings().notificationsEnabled) {
                scheduleNotifications();
                checkNotificationOnOpen();
            }
        })();

        // Update badge and check notifications when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                updateBadge();
                updateDisplay(); // Refresh in case time period changed
                scheduleNotifications(); // Reschedule in case day changed
                checkNotificationOnOpen(); // Check if notification should show now
            }
        });

        // Track current period to detect changes
        let lastPeriod = getTimeOfDayNow();
        let lastDate = getTodayString();
        let lastDelayPending = false;

        // Check every minute if period or date changed
        setInterval(() => {
            updateBadge();
            const currentPeriod = getTimeOfDayNow();
            const currentDate = getTodayString();
            const delayPending = anyDelayPending();
            if (currentPeriod !== lastPeriod || currentDate !== lastDate) {
                lastPeriod = currentPeriod;
                lastDate = currentDate;
                updateDisplay();
                scheduleNotifications();
            } else if (delayPending || lastDelayPending) {
                // A Daily×N habit is (or just was) within its hide window —
                // re-render so it reappears on its own when the delay elapses.
                updateDisplay();
            }
            lastDelayPending = delayPending;
        }, 60000);
