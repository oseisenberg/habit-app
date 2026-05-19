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
        // Frequency-input controls for the habit form (every-X / goal /
        // daily). Pure: derives only from form state + the habit.
        function buildFreqInputsHtml(state, habit, isEdit, idPrefix) {
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
            return freqInputsHtml;
        }

        // Subtask editor block for the habit form (drag-reorder list +
        // add-row). Pure: derives only from the habit, mode, form state.
        function buildFormSubtasksHtml(habit, isEdit, state) {
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
            return subtasksHtml;
        }

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
            const freqInputsHtml = buildFreqInputsHtml(state, habit, isEdit, idPrefix);

            const subtasksHtml = buildFormSubtasksHtml(habit, isEdit, state);

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

