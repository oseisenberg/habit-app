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
            isLarge: false,                      // show as large (2 columns) in grid
            isNegative: false,                   // negative habit (track avoiding)
            confirmDescription: false,           // show description popup before completing
            autoCompletes: '',                   // habit ID to auto-complete when this is done
            showAutoCompletes: false,            // show auto-completes field
            everyXValue: null,                   // number value for "every X days/weeks/months"
            timesValue: null,                    // number value for "X times per period"
            pointsValue: null                    // number value for "X points per period"
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
            formState.isLarge = false;
            formState.isNegative = false;
            formState.confirmDescription = false;
            formState.autoCompletes = '';
            formState.showAutoCompletes = false;
            formState.everyXValue = null;
            formState.timesValue = null;
            formState.pointsValue = null;
        }

        // Initialize form state from habit (for edit mode)
        function initFormStateFromHabit(habit) {
            formState.name = habit.name || '';
            formState.description = habit.description || '';
            formState.showDescription = !!(habit.description);
            formState.icon = habit.icon || HABIT_EMOJIS[0];
            formState.allowOptional = habit.allowOptional !== false;
            formState.isLarge = habit.isLarge || false;
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
            } else if (freqType === FREQ.POINTS_PER_DAY || freqType === FREQ.POINTS_PER_WEEK || freqType === FREQ.POINTS_PER_MONTH ||
                       freqType === FREQ.TIMES_PER_DAY || freqType === FREQ.TIMES_PER_WEEK || freqType === FREQ.TIMES_PER_MONTH) {
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

            formState.isNegative = habit.isNegative || false;
            formState.confirmDescription = habit.confirmDescription || false;
            formState.autoCompletes = habit.autoCompletes || '';
            formState.showAutoCompletes = !!habit.autoCompletes;

            // Initialize number values from habit
            formState.everyXValue = habit.frequency.everyXDays || habit.frequency.everyXWeeks || habit.frequency.everyXMonths || null;
            formState.timesValue = habit.frequency.timesPerDay || habit.frequency.timesPerWeek || habit.frequency.timesPerMonth || null;
            formState.pointsValue = habit.frequency.pointsPerDay || habit.frequency.pointsPerWeek || habit.frequency.pointsPerMonth || null;
        }

        // Get current form state (for compatibility with renderHabitForm)
        function getFormState(habit = null) {
            return formState;
        }

        // Render the habit form (shared between Create and Edit modes)
        function renderHabitForm(habit = null) {
            const isEdit = formMode === 'edit';
            const state = getFormState(habit);
            const currentIcon = state.icon || (habit?.icon) || '📌';
            const habitName = escapeHtml(formState.name || '');
            const habitDesc = escapeHtml(formState.description || '');
            // Points disabled only for twice daily (morning & bedtime makes no sense with points)
            const isTwiceDaily = state.frequency === FREQ.TWICE_DAILY;
            const pointsDisabled = isTwiceDaily;
            // Allow Extra is now compatible with all frequencies

            // Build frequency inputs (use lowercase IDs for create, camelCase with 'edit' prefix for edit)
            const idPrefix = isEdit ? 'edit' : '';
            let freqInputsHtml = '';
            if (state.frequency === FREQ.EVERY_X_DAYS) {
                const afterVal = state.everyXValue ?? habit?.frequency?.everyXDays ?? habit?.frequency?.everyXWeeks ?? habit?.frequency?.everyXMonths ?? DEFAULTS.EVERY_X_DAYS;
                freqInputsHtml = `<input type="number" class="frequency-input" id="${idPrefix}${isEdit ? 'E' : 'e'}veryXPeriod" value="${afterVal}" min="1">
                    <div class="period-toggle">
                        <button type="button" class="period-toggle-btn ${state.afterPeriod === PERIOD.DAY ? 'active' : ''}" onclick="setFormPeriod('after', '${PERIOD.DAY}')">day</button>
                        <button type="button" class="period-toggle-btn ${state.afterPeriod === PERIOD.WEEK ? 'active' : ''}" onclick="setFormPeriod('after', '${PERIOD.WEEK}')">wk</button>
                        <button type="button" class="period-toggle-btn ${state.afterPeriod === PERIOD.MONTH ? 'active' : ''}" onclick="setFormPeriod('after', '${PERIOD.MONTH}')">mo</button>
                    </div><span style="color:#888">after</span>`;
            } else if (state.frequency === FREQ.TIMES_PER_PERIOD) {
                if (state.isPointsMode) {
                    const ptsVal = state.pointsValue ?? habit?.frequency?.pointsPerDay ?? habit?.frequency?.pointsPerWeek ?? habit?.frequency?.pointsPerMonth ?? DEFAULTS.POINTS_PER_PERIOD;
                    freqInputsHtml = `<input type="number" class="frequency-input" id="${idPrefix}${isEdit ? 'P' : 'p'}ointsPerPeriod" value="${ptsVal}" min="1"><span style="color:#888">pts /</span>
                        <div class="period-toggle">
                            <button type="button" class="period-toggle-btn ${state.pointsPeriod === PERIOD.DAY ? 'active' : ''}" onclick="setFormPeriod('points', '${PERIOD.DAY}')">day</button>
                            <button type="button" class="period-toggle-btn ${state.pointsPeriod === PERIOD.WEEK ? 'active' : ''}" onclick="setFormPeriod('points', '${PERIOD.WEEK}')">wk</button>
                            <button type="button" class="period-toggle-btn ${state.pointsPeriod === PERIOD.MONTH ? 'active' : ''}" onclick="setFormPeriod('points', '${PERIOD.MONTH}')">mo</button>
                        </div>`;
                } else {
                    const timesVal = state.timesValue ?? habit?.frequency?.timesPerDay ?? habit?.frequency?.timesPerWeek ?? habit?.frequency?.timesPerMonth ?? DEFAULTS.TIMES_PER_PERIOD;
                    freqInputsHtml = `<input type="number" class="frequency-input" id="${idPrefix}${isEdit ? 'T' : 't'}imesPerPeriod" value="${timesVal}" min="1" max="31">
                        <div class="period-toggle">
                            <button type="button" class="period-toggle-btn ${state.timesPeriod === PERIOD.DAY ? 'active' : ''}" onclick="setFormPeriod('times', '${PERIOD.DAY}')">day</button>
                            <button type="button" class="period-toggle-btn ${state.timesPeriod === PERIOD.WEEK ? 'active' : ''}" onclick="setFormPeriod('times', '${PERIOD.WEEK}')">wk</button>
                            <button type="button" class="period-toggle-btn ${state.timesPeriod === PERIOD.MONTH ? 'active' : ''}" onclick="setFormPeriod('times', '${PERIOD.MONTH}')">mo</button>
                        </div>`;
                }
            }

            // Subtasks section (show if toggle is on OR habit has existing subtasks)
            const subtasks = isEdit ? (habit?.subtasks || []) : newHabitSubtasks;
            const showSubtasksArea = state.showSubtasks || subtasks.length > 0;
            let subtasksHtml = '';
            if (showSubtasksArea || subtasks.length > 0) {
                const subtaskItems = isEdit ? subtasks.map((s, i) => `
                    <div class="subtask-item" draggable="true" data-subtask-id="${s.id}" data-index="${i}"
                        ondragstart="handleSubtaskDragStart(event, 'edit', ${habit.id})"
                        ondragover="handleSubtaskDragOver(event)"
                        ondragleave="handleSubtaskDragLeave(event)"
                        ondrop="handleSubtaskDrop(event, 'edit', ${habit.id})">
                        <span class="subtask-drag-handle"
                            ontouchstart="handleSubtaskTouchStart(event, 'edit', ${habit.id})"
                            ontouchmove="handleSubtaskTouchMove(event)"
                            ontouchend="handleSubtaskTouchEnd(event)"
                            ontouchcancel="handleSubtaskTouchEnd(event)">⋮⋮</span>
                        <input type="text" class="subtask-name-input" value="${escapeHtml(s.name)}"
                            onchange="updateEditSubtask(${habit.id}, ${s.id}, this.value)"
                            onkeypress="if(event.key==='Enter')this.blur()">
                        <span class="subtask-delete" onclick="deleteSubtask(${habit.id}, ${s.id})">✕</span>
                    </div>
                `).join('') : subtasks.map((s, i) => `
                    <div class="subtask-item" draggable="true" data-subtask-id="${s.id}" data-index="${i}"
                        ondragstart="handleSubtaskDragStart(event, 'new')"
                        ondragover="handleSubtaskDragOver(event)"
                        ondragleave="handleSubtaskDragLeave(event)"
                        ondrop="handleSubtaskDrop(event, 'new')">
                        <span class="subtask-drag-handle"
                            ontouchstart="handleSubtaskTouchStart(event, 'new')"
                            ontouchmove="handleSubtaskTouchMove(event)"
                            ontouchend="handleSubtaskTouchEnd(event)"
                            ontouchcancel="handleSubtaskTouchEnd(event)">⋮⋮</span>
                        <input type="text" class="subtask-name-input" value="${escapeHtml(s.name)}"
                            onchange="updateNewHabitSubtask(${s.id}, this.value)"
                            onkeypress="if(event.key==='Enter')this.blur()">
                        <span class="subtask-delete" onclick="removeNewHabitSubtask(${s.id})">✕</span>
                    </div>
                `).join('');

                // Only show the scroll container if there are subtasks
                const hasSubtasks = subtaskItems.length > 0;
                subtasksHtml = `
                    <div class="form-group" id="${isEdit ? 'editSubtasksArea' : 'subtasksInputArea'}" style="${showSubtasksArea ? '' : 'display:none'}">
                        <label class="form-label">Subtasks</label>
                        ${hasSubtasks ? `<div class="subtasks-scroll-container" id="${isEdit ? 'editSubtasksList' : 'newHabitSubtasksList'}">${subtaskItems}</div>` : `<div id="${isEdit ? 'editSubtasksList' : 'newHabitSubtasksList'}"></div>`}
                        <div class="add-subtask">
                            <input type="text" id="${isEdit ? 'editSubtaskInput' : 'newHabitSubtaskInput'}" placeholder="Add subtask..."
                                onkeypress="if(event.key==='Enter'){event.preventDefault();${isEdit ? `addSubtask(${habit.id})` : 'addNewHabitSubtask()'};}">
                            <button type="button" onclick="${isEdit ? `addSubtask(${habit.id})` : 'addNewHabitSubtask()'}">+</button>
                        </div>
                    </div>`;
            }

            const reminderDays = habit?.frequency?.reminderDays || DEFAULTS.REMINDER_DAYS;

            return `
                <div class="modal-header">
                    <h2 class="modal-title">${isEdit ? 'Edit Habit' : 'New Habit'}</h2>
                    <button class="modal-close" onclick="${isEdit ? 'closeDetails' : 'closeModal'}()">&times;</button>
                </div>
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
                    <label class="form-label">Options</label>
                    <div class="task-options">
                        <label class="option-pill ${state.showSubtasks ? 'active' : ''}" id="${isEdit ? 'editSubtasksPill' : 'subtasksPill'}" onclick="toggleFormSubtasks()">
                            <span class="option-pill-check">✓</span>
                            <span>Subtasks</span>
                        </label>
                        <label class="option-pill ${state.isPointsMode ? 'active' : ''} ${pointsDisabled ? 'disabled' : ''}" id="${isEdit ? 'editPointsPill' : 'pointsPill'}" onclick="toggleFormPointsMode()">
                            <span class="option-pill-check">✓</span>
                            <span>Points</span>
                        </label>
                        <label class="option-pill ${state.allowOptional ? 'active' : ''}" id="${isEdit ? 'editOptionalPill' : 'optionalPill'}" onclick="toggleFormAllowOptional()">
                            <span class="option-pill-check">✓</span>
                            <span>Allow extra</span>
                        </label>
                        <label class="option-pill ${state.isReminderMode ? 'active' : ''}" id="${isEdit ? 'editReminderPill' : 'reminderPill'}" onclick="toggleFormReminderMode()">
                            <span class="option-pill-check">✓</span>
                            <span>Reminder</span>
                        </label>
                        <label class="option-pill ${state.isLarge ? 'active' : ''}" id="${isEdit ? 'editLargePill' : 'largePill'}" onclick="toggleFormIsLarge()">
                            <span class="option-pill-check">✓</span>
                            <span>Large</span>
                        </label>
                        <label class="option-pill ${state.showDescription ? 'active' : ''}" id="${isEdit ? 'editDescPill' : 'descPill'}" onclick="toggleFormDescription()">
                            <span class="option-pill-check">✓</span>
                            <span>Description</span>
                        </label>
                        <label class="option-pill ${state.isNegative ? 'active' : ''}" id="${isEdit ? 'editNegativePill' : 'negativePill'}" onclick="toggleFormNegative()" style="${state.isNegative ? 'border-color:#dc2626;background:rgba(220,38,38,0.15)' : ''}">
                            <span class="option-pill-check">✓</span>
                            <span>Negative</span>
                        </label>
                        <label class="option-pill ${state.confirmDescription ? 'active' : ''}" id="${isEdit ? 'editConfirmDescPill' : 'confirmDescPill'}" onclick="toggleFormConfirmDescription()" style="${state.confirmDescription ? 'border-color:#f59e0b;background:rgba(245,158,11,0.15)' : ''}">
                            <span class="option-pill-check">✓</span>
                            <span>Confirm</span>
                        </label>
                        <label class="option-pill ${state.showAutoCompletes ? 'active' : ''}" id="${isEdit ? 'editAutoCompletesPill' : 'autoCompletesPill'}" onclick="toggleFormAutoCompletes()">
                            <span class="option-pill-check">✓</span>
                            <span>Auto-complete</span>
                        </label>
                    </div>
                </div>
                ${state.showDescription ? `<div class="form-group">
                    <label class="form-label">Description</label>
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
                <div class="form-group" id="${isEdit ? 'editFrequencyGroup' : 'frequencyGroup'}">
                    <label class="form-label">Schedule</label>
                    <div class="frequency-row" id="${isEdit ? 'editFrequencyRow' : 'frequencyRow'}">
                        <select class="form-input" id="${isEdit ? 'editFrequencySelect' : 'frequencySelect'}" onchange="selectFormFrequency(this.value)" style="flex:1">
                            <option value="${FREQ.DAILY}" ${state.frequency === FREQ.DAILY ? 'selected' : ''}>Daily</option>
                            <option value="${FREQ.TWICE_DAILY}" ${state.frequency === FREQ.TWICE_DAILY ? 'selected' : ''} ${state.isPointsMode ? 'disabled' : ''}>Morning & Bedtime${state.isPointsMode ? ' (not with Points)' : ''}</option>
                            <option value="${FREQ.EVERY_X_DAYS}" ${state.frequency === FREQ.EVERY_X_DAYS ? 'selected' : ''}>After completion</option>
                            <option value="${FREQ.TIMES_PER_PERIOD}" ${state.frequency === FREQ.TIMES_PER_PERIOD ? 'selected' : ''}>Within period</option>
                        </select>
                        <div id="${isEdit ? 'editFrequencyInputs' : 'frequencyInputs'}">${freqInputsHtml}</div>
                    </div>
                </div>
                ${subtasksHtml}
                <div class="action-buttons">
                    <button class="submit-btn" onclick="${isEdit ? 'saveHabitEdit' : 'addHabit'}()">${isEdit ? 'Save Changes' : 'Add Habit'}</button>
                    ${isEdit ? '<button class="submit-btn secondary" onclick="toggleEditMode()">Cancel</button>' : ''}
                </div>`;
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
            const everyXInput = document.getElementById(isEdit ? 'editEveryXPeriod' : 'everyXPeriod');
            const timesInput = document.getElementById(isEdit ? 'editTimesPerPeriod' : 'timesPerPeriod');
            const pointsInput = document.getElementById(isEdit ? 'editPointsPerPeriod' : 'pointsPerPeriod');
            if (everyXInput) formState.everyXValue = parseInt(everyXInput.value) || null;
            if (timesInput) formState.timesValue = parseInt(timesInput.value) || null;
            if (pointsInput) formState.pointsValue = parseInt(pointsInput.value) || null;

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

            // Restore focus to the same input after re-render
            if (focusedId) {
                const el = document.getElementById(focusedId);
                if (el) {
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
            formState.isPointsMode = !formState.isPointsMode;
            // When enabling points, only auto-switch from twice daily (the only incompatible option)
            if (formState.isPointsMode && formState.frequency === FREQ.TWICE_DAILY) {
                formState.frequency = FREQ.TIMES_PER_PERIOD;
            }
            rerenderForm();
        }

        function toggleFormAllowOptional() {
            formState.allowOptional = !formState.allowOptional;
            rerenderForm();
        }

        function toggleFormIsLarge() {
            formState.isLarge = !formState.isLarge;
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

        function toggleFormNegative() {
            formState.isNegative = !formState.isNegative;
            rerenderForm();
        }

        function toggleFormConfirmDescription() {
            formState.confirmDescription = !formState.confirmDescription;
            rerenderForm();
        }

        function toggleFormAutoCompletes() {
            formState.showAutoCompletes = !formState.showAutoCompletes;
            rerenderForm();
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
            // Auto-disable points for daily/twiceDaily
            if ((f === FREQ.DAILY || f === FREQ.TWICE_DAILY) && formState.isPointsMode) {
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
            document.getElementById('emojiPopupOverlay').classList.add('active');
        }

        function closeEmojiPopup() {
            document.getElementById('emojiPopupOverlay').classList.remove('active');
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
            document.getElementById('emojiPopup').innerHTML = html;
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
                notificationsEnabled: true,
                morningReminderTime: 5,
                nightReminderTime: 18,
                momentumAlertEnabled: true,
                momentumAlertTime: 18,
                momentumAlertThreshold: -20,
                quietHoursEnabled: false,
                quietHoursStart: 22,
                quietHoursEnd: 7,
                weeklySummaryEnabled: false
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
                alert('Notification permission denied. Please enable notifications in your browser settings.');
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
            renderHabits();
            // Re-render open panels to update subtask states for new day
            if (selectedHabitId) renderDetails();
            if (subtaskPopupHabitId) renderSubtaskPopup();
            updateBadge();
        }

        function updateBadge() {
            if (!('setAppBadge' in navigator)) return;
            const habits = loadHabits().filter(h => !h.archived);
            const { now: nowHabits } = categorizeHabits(habits);
            // Exclude reminders from badge count
            const count = nowHabits.filter(h => !h.isReminder && h.frequency.type !== FREQ.REMINDER).length;
            if (count > 0) {
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

        function getDefaultHabits() {
            const today = getTodayString();
            return [
                { id: 2, name: 'Shower', icon: '🚿', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: 'Use towel to push up hair' },
                { id: 36, name: 'Brush teeth', icon: '🦷', timeOfDay: null, frequency: { type: 'twiceDaily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Use teeth whitening toothpaste', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 3, name: 'Exercise', icon: '🏋️‍♂️', timeOfDay: null, frequency: { type: 'pointsPerWeek', pointsPerWeek: 8 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: true, allowOptional: true, isReminder: false, isLarge: true },
                { id: 37, name: 'Social Events', icon: '🎉', timeOfDay: null, frequency: { type: 'pointsPerWeek', pointsPerWeek: 5 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: true, allowOptional: true, isReminder: false, isLarge: true },
                { id: 4, name: 'Zoryve foam', icon: '🫧', timeOfDay: null, frequency: { type: 'twiceDaily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: 'Make sure to use on sides' },
                { id: 8, name: 'Shave', icon: '🪒', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Main cheeks - 4.0+, lower for sideburns', completedPeriods: {} },
                    { id: 2, name: 'Mustache - 1.6', completedPeriods: {} },
                    { id: 3, name: 'Under chin - 1.6', completedPeriods: {} },
                    { id: 4, name: 'Top cheeks - Fade into skin', completedPeriods: {} },
                    { id: 5, name: 'Bottom cheeks - Detail trimmer to even out', completedPeriods: {} },
                    { id: 6, name: 'Neck edges - One blade, hair stops at chin bend (especially near ears)', completedPeriods: {} },
                    { id: 7, name: 'Details trimmer on top of mustache', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: 'Beard max 4.0. One blade = near full shave (good for edges).' },
                { id: 10, name: 'Vitamins: Biotin', icon: '🍬', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 11, name: 'Set alarms', icon: '⏰', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 38, name: 'Floss', icon: '🧵', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 39, name: 'Journal', icon: '📓', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 41, name: 'Add new songs', icon: '🎵', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 42, name: 'Schedule haircut', icon: '💇', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: 'Get a 1.5 on the sides and back, with a 1.5 fade in the middle of the sides' },
                { id: 43, name: 'Grocery shopping', icon: '🛒', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 13, name: 'Lip balm', icon: '👄', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 14, name: 'Dandruff shampoo', icon: '🧴', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Run hands through scalp', completedPeriods: {} },
                    { id: 2, name: 'Puff up hair with hand towel', completedPeriods: {} },
                    { id: 3, name: 'Shampoo and scrub front hairs with fingers a bit', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 15, name: 'Hair helmet', icon: '🪖', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 18, name: 'Hand Exercises', icon: '✋', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 20, name: 'Weekly routine', icon: '📅', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 1 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Change main bath towel for showers', completedPeriods: {} },
                    { id: 2, name: 'Change bathroom hand towel', completedPeriods: {} },
                    { id: 3, name: 'Clean glasses', completedPeriods: {} },
                    { id: 4, name: 'Clean earphones', completedPeriods: {} },
                    { id: 5, name: 'Clean bathroom sink', completedPeriods: {} },
                    { id: 6, name: 'Clean wallet of cards, receipts, and coins', completedPeriods: {} },
                    { id: 7, name: 'Organize wallet cash in descending order', completedPeriods: {} },
                    { id: 8, name: 'Refill water filter', completedPeriods: {} },
                    { id: 9, name: 'Sanitize and clean scissors', completedPeriods: {} },
                    { id: 10, name: 'Take out all trash, in all rooms', completedPeriods: {} },
                    { id: 11, name: 'Check apartment mailbox', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 24, name: 'Dandruff', icon: '❄️', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 25, name: 'Rogaine', icon: '🌱', timeOfDay: null, frequency: { type: 'twiceDaily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 26, name: 'Sunscreen', icon: '🏖️', timeOfDay: 'morning', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 28, name: 'Body Measurements', icon: '📏', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 1 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Weight', completedPeriods: {} },
                    { id: 2, name: 'Body Fat Percentage', completedPeriods: {} },
                    { id: 3, name: 'Skeletal Muscle Mass', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 29, name: 'Optional medicine', icon: '💧', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Peroxyl', completedPeriods: {} },
                    { id: 2, name: 'Acne cream', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 30, name: 'Protein', icon: '🥩', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 32, name: 'Close tabs', icon: '🗂️', timeOfDay: null, frequency: { type: 'timesPerWeek', timesPerWeek: 1 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 33, name: 'Hair management', icon: '✂️', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Cut hair', completedPeriods: {} },
                    { id: 2, name: 'Clean dandruff', completedPeriods: {} },
                    { id: 3, name: 'Trim', completedPeriods: {} },
                    { id: 4, name: 'Nose hairs', completedPeriods: {} },
                    { id: 5, name: 'Forehead hair plucking', completedPeriods: {} },
                    { id: 6, name: 'Eyebrow plucking', completedPeriods: {} },
                    { id: 7, name: 'Trim eyebrows with scissors', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 34, name: 'Cut fingernails', icon: '💅', timeOfDay: null, frequency: { type: 'timesPerWeek', timesPerWeek: 1 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 35, name: 'Cut toenails', icon: '🦶', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 44, name: 'Face routine', icon: '🧼', timeOfDay: null, frequency: { type: 'twiceDaily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Cleanse, no washcloth', completedPeriods: {} },
                    { id: 2, name: 'Moisturize, no washcloth', completedPeriods: {} },
                    { id: 3, name: 'Eyebags', completedPeriods: {} },
                    { id: 4, name: 'Hairline', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: 'Cleanse gently, pat skin slightly damp, apply moisturizer while damp, let it absorb, then apply your prescribed topical treatment to affected areas' },
                { id: 45, name: 'Dress well', icon: '🎩', timeOfDay: 'morning', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 46, name: 'Get sun to tan', icon: '☀️', timeOfDay: null, frequency: { type: 'everyXDays', everyXMonths: 1 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 47, name: 'Cut chest hair', icon: '🪮', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Especially cut top, for polo shirts', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 48, name: 'Limit calorie intake', icon: '🍽️', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 49, name: 'Leaning forward in work desk', icon: '🪑', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 3 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 50, name: 'Conditioner for beard', icon: '🌳', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 3 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 51, name: 'Get good profile photos, new outfits', icon: '📱', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 1 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 52, name: 'Walk with good posture', icon: '🚶', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 5 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 53, name: 'Zoryve cream', icon: '💭', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
                { id: 54, name: 'Check chats', icon: '📝', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Mountain Jew', completedPeriods: {} },
                    { id: 2, name: 'Add other chats to this list?', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 55, name: 'Dermodex', icon: '🧽', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
                { id: 56, name: 'Body moisturizer', icon: '💪', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [
                    { id: 1, name: 'Hands', completedPeriods: {} },
                    { id: 2, name: 'Ears', completedPeriods: {} },
                    { id: 3, name: 'Chest', completedPeriods: {} },
                    { id: 4, name: 'Down there', completedPeriods: {} }
                ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false }
            ];
        }

        function loadHabits() {
            if (habitsCache) return habitsCache;
            try {
                const h = localStorage.getItem('habits_v3');
                habitsCache = h ? JSON.parse(h) : [];
            } catch (e) {
                console.error('Failed to load habits:', e);
                habitsCache = [];
                // Show error to user on next tick to avoid blocking
                setTimeout(() => alert('Failed to load habits. Data may be corrupted. Your habits have been reset.'), 0);
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
                    alert('Storage is full. Unable to save habits. Try clearing some browser data.');
                } else {
                    alert('Failed to save habits. Changes may not persist.');
                }
            }
        }
        function invalidateHabitsCache() { habitsCache = null; }

        // Undo toast functionality
        function showUndoToast() {
            const toast = document.getElementById('undoToast');
            const text = document.getElementById('undoToastText');
            text.textContent = 'Completed';
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
            } else if (lastCompletion.type === 'subtask' && lastCompletion.subtaskId) {
                const subtask = habit.subtasks?.find(s => s.id === lastCompletion.subtaskId);
                if (subtask && subtask.completedPeriods) {
                    delete subtask.completedPeriods[lastCompletion.periodKey];
                }
            }

            saveHabits(habits);
            lastCompletion = null;
            hideUndoToast();
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
            document.getElementById('modalOverlay').classList.add('active');
            document.getElementById('habitInput').focus();
        }

        function closeModal() {
            document.getElementById('modalOverlay').classList.remove('active');
            // Reset state
            formMode = 'create';
            formHabitId = null;
            resetFormState();
            newHabitSubtasks = [];
        }

        function openSettings() {
            const s = getSettings();
            document.getElementById('morningStart').value = s.morningStart;
            document.getElementById('nightStart').value = s.nightStart;
            document.getElementById('sortMethod').value = s.sortMethod || 'default';
            document.getElementById('notificationsEnabled').checked = s.notificationsEnabled;
            document.getElementById('morningReminderTime').value = s.morningReminderTime;
            document.getElementById('nightReminderTime').value = s.nightReminderTime;
            document.getElementById('momentumAlertEnabled').checked = s.momentumAlertEnabled;
            document.getElementById('momentumAlertTime').value = s.momentumAlertTime;
            document.getElementById('momentumAlertThreshold').value = s.momentumAlertThreshold;
            document.getElementById('quietHoursEnabled').checked = s.quietHoursEnabled;
            document.getElementById('quietHoursStart').value = s.quietHoursStart;
            document.getElementById('quietHoursEnd').value = s.quietHoursEnd;
            document.getElementById('weeklySummaryEnabled').checked = s.weeklySummaryEnabled;
            document.getElementById('notificationSettings').style.display = s.notificationsEnabled ? 'block' : 'none';
            document.getElementById('momentumAlertSettings').style.display = s.momentumAlertEnabled ? 'block' : 'none';
            document.getElementById('quietHoursSettings').style.display = s.quietHoursEnabled ? 'block' : 'none';
            updateInstallPromptVisibility();
            document.getElementById('settingsOverlay').classList.add('active');
        }
        function closeSettings() { document.getElementById('settingsOverlay').classList.remove('active'); }
        function toggleMomentumSettings() {
            const enabled = document.getElementById('momentumAlertEnabled').checked;
            document.getElementById('momentumAlertSettings').style.display = enabled ? 'block' : 'none';
        }
        function toggleQuietHoursSettings() {
            const enabled = document.getElementById('quietHoursEnabled').checked;
            document.getElementById('quietHoursSettings').style.display = enabled ? 'block' : 'none';
        }
        function saveSettings() {
            const settings = {
                morningStart: parseInt(document.getElementById('morningStart').value) || 5,
                nightStart: parseInt(document.getElementById('nightStart').value) || 18,
                sortMethod: document.getElementById('sortMethod').value || 'default',
                notificationsEnabled: document.getElementById('notificationsEnabled').checked,
                morningReminderTime: parseInt(document.getElementById('morningReminderTime').value) || 5,
                nightReminderTime: parseInt(document.getElementById('nightReminderTime').value) || 18,
                momentumAlertEnabled: document.getElementById('momentumAlertEnabled').checked,
                momentumAlertTime: parseInt(document.getElementById('momentumAlertTime').value) || 18,
                momentumAlertThreshold: parseInt(document.getElementById('momentumAlertThreshold').value) || -20,
                quietHoursEnabled: document.getElementById('quietHoursEnabled').checked,
                quietHoursStart: parseInt(document.getElementById('quietHoursStart').value) || 22,
                quietHoursEnd: parseInt(document.getElementById('quietHoursEnd').value) || 7,
                weeklySummaryEnabled: document.getElementById('weeklySummaryEnabled').checked
            };
            try {
                localStorage.setItem('habit_settings', JSON.stringify(settings));
            } catch (e) {
                console.error('Failed to save settings:', e);
                alert('Failed to save settings. Changes may not persist.');
            }
            if (settings.notificationsEnabled) {
                scheduleNotifications();
            }
            closeSettings();
            updateDisplay();
        }

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
            const settingsDiv = document.getElementById('notificationSettings');

            if (checkbox.checked) {
                // Request permission
                const permission = await requestNotificationPermission();
                if (permission !== 'granted') {
                    checkbox.checked = false;
                    settingsDiv.style.display = 'none';
                    alert('Notification permission denied. Please enable in browser settings.');
                    return;
                }
                settingsDiv.style.display = 'block';
            } else {
                settingsDiv.style.display = 'none';
                clearNotificationTimers();
            }
            updateInstallPromptVisibility();
        }

        async function requestNotificationPermission() {
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
                try {
                    const data = JSON.parse(e.target.result);

                    // Validate the data structure
                    if (!data.habits || !Array.isArray(data.habits)) {
                        alert('Invalid file format: missing habits array');
                        return;
                    }

                    const mergeOrReplace = confirm(
                        'Import options:\n\n' +
                        'OK = Replace all data (current data will be lost)\n' +
                        'Cancel = Merge with existing data (add new tasks, keep current ones)'
                    );

                    if (mergeOrReplace) {
                        // Replace all data
                        if (!confirm('This will replace ALL your current data. Are you sure?')) return;
                        saveHabits(data.habits);
                        if (data.settings) {
                            localStorage.setItem('habit_settings', JSON.stringify(data.settings));
                        }
                    } else {
                        // Merge: add imported habits with new IDs to avoid conflicts
                        const currentHabits = loadHabits();
                        const maxId = Math.max(0, ...currentHabits.map(h => h.id));
                        const newHabits = data.habits.map((h, i) => ({
                            ...h,
                            id: maxId + i + 1
                        }));
                        saveHabits([...currentHabits, ...newHabits]);
                    }

                    invalidateHabitsCache();
                    updateDisplay();
                    closeSettings();
                    alert('Import successful!');
                } catch (err) {
                    alert('Failed to import: ' + err.message);
                }
            };
            reader.readAsText(file);

            // Reset the input so the same file can be imported again
            event.target.value = '';
        }

        function resetAllMomentum() {
            if (!confirm('Reset momentum scores for all habits? This cannot be undone.')) return;
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
        }

        function reloadDefaultTasks() {
            if (!confirm('Replace all tasks with defaults? This will delete your current tasks and cannot be undone.')) return;
            saveHabits(getDefaultHabits());
            updateDisplay();
            closeSettings();
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
            draggedSubtaskId = parseInt(event.target.dataset.subtaskId);
            draggedSubtaskMode = mode;
            draggedSubtaskHabitId = habitId;
            event.target.classList.add('dragging');
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
            const timesVal = Math.max(1, parseInt(document.getElementById('timesPerPeriod')?.value) || DEFAULTS.TIMES_PER_PERIOD);
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
                    reminderDays: reminderDaysVal
                },
                usePoints: formState.isPointsMode,
                isReminder: formState.isReminderMode,
                allowOptional: formState.allowOptional,
                isLarge: formState.isLarge,
                isNegative: formState.isNegative,
                confirmDescription: formState.confirmDescription,
                autoCompletes: document.getElementById('autoCompletes')?.value.trim() || '',
                completions: [], skippedDates: [], snoozedUntil: null, subtasks: [...newHabitSubtasks], createdAt: getTodayString()
            });
            saveHabits(habits);
            closeModal();
            renderHabits();
        }

        function deleteHabit(id) {
            if (confirm('Delete this habit?')) {
                saveHabits(loadHabits().filter(h => h.id !== id));
                closeDetails();
                renderHabits();
            }
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

        function openSnoozePopup(id) {
            snoozePopupHabitId = id;
            const habit = loadHabits().find(h => h.id === id);
            const cycleDays = habit ? getHabitCycleDays(habit) : 1;
            const cycleLabel = formatCycleDays(cycleDays);

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

            document.getElementById('snoozePopup').innerHTML = `
                <div class="snooze-popup-content">
                    <div class="snooze-popup-title">Snooze</div>
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
                        <input type="date" id="snoozeCustomDate" class="snooze-date-input" min="${tomorrowStr}" value="${currentSnooze}" onchange="snoozeToDate()" oninput="snoozeToDate()" style="width:100%">
                    </div>
                    <label class="snooze-momentum-label">
                        <input type="checkbox" id="snoozePauseMomentum" checked>
                        <span>Pause momentum during snooze</span>
                    </label>
                    <button class="snooze-option skip-cycle-btn" onclick="snoozeHabit(${cycleDays})" style="width:100%;margin-bottom:6px">
                        <span class="snooze-option-icon">⏭️</span>
                        <span>Skip cycle (${cycleLabel})</span>
                    </button>
                    <button class="snooze-cancel" onclick="closeSnoozePopup()">Cancel</button>
                </div>`;
            document.getElementById('snoozePopup').classList.add('wide');
            document.getElementById('snoozePopupOverlay').classList.add('active');
        }

        function closeSnoozePopup() {
            document.getElementById('snoozePopupOverlay').classList.remove('active');
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
                const pauseMomentum = document.getElementById('snoozePauseMomentum')?.checked;
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
                const pauseMomentum = document.getElementById('snoozePauseMomentum')?.checked;
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
                const pauseMomentum = document.getElementById('snoozePauseMomentum')?.checked;
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
                const count = countCompletionsInRange(habit, today, today);
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

            for (let i = 1; i <= daysSinceUpdate; i++) {
                const checkDate = new Date(lastUpdate);
                checkDate.setDate(checkDate.getDate() + i);
                const checkDateStr = toDateString(checkDate);

                // Skip dates before habit was created
                if (createdAt && checkDateStr < createdAt) continue;

                // Skip dates when habit was snoozed (momentum pauses during snooze)
                if (wasDateSnoozed(habit, checkDateStr)) continue;

                const wasDue = wasHabitDueOnDate(habit, checkDateStr);
                let wasCompleted = completionDates.has(checkDateStr);

                // For points per day, check if target was met (not just any completion)
                if (freqType === FREQ.POINTS_PER_DAY && wasCompleted) {
                    const dayPoints = countPointsInRange(habit, checkDateStr, checkDateStr);
                    const target = freq.pointsPerDay || DEFAULTS.POINTS_PER_PERIOD;
                    wasCompleted = dayPoints >= target;
                }

                if (wasDue) {
                    const isNegativeHabit = habit.isNegative;
                    if (wasCompleted) {
                        if (isNegativeHabit) {
                            // Negative habit: completing (doing bad thing) = penalty with acceleration
                            const basePenalty = score < 0 ? Math.min(45, 25 - score * 0.2) : 25;
                            const penalty = basePenalty * frequencyScale;
                            score = Math.max(-100, score - penalty);
                        } else {
                            // Positive habit: completing = reward
                            const reward = 15 * frequencyScale;
                            score = Math.min(100, score + reward);
                        }
                    } else {
                        if (isNegativeHabit) {
                            // Negative habit: not doing (avoiding) = small reward
                            const reward = 5 * frequencyScale;
                            score = Math.min(100, score + reward);
                        } else {
                            // Positive habit: missing = penalty with acceleration (worse when already negative)
                            const basePenalty = score < 0 ? Math.min(45, 25 - score * 0.2) : 25;
                            const isReminder = habit.isReminder || freqType === FREQ.REMINDER;
                            const penalty = (isReminder ? basePenalty * 0.5 : basePenalty) * frequencyScale;
                            score = Math.max(-100, score - penalty);
                        }
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
            if (!confirm('Reset all stats for this habit? This clears all completion history, subtask progress, and momentum.')) return;
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
        }

        function resetHabitMomentum(id) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === id);
            if (habit) {
                const today = getTodayString();
                habit.momentumScore = 0;
                habit.lastScoreUpdate = today;
                habit.momentumResetDate = today;
                saveHabits(habits);
                renderDetails();
                renderHabits();
            }
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

        // Description confirmation popup
        let confirmDescHabitId = null;
        let confirmDescPeriod = null;

        function openConfirmDescPopup(id, period = null) {
            const habit = loadHabits().find(h => h.id === id);
            if (!habit) return;
            confirmDescHabitId = id;
            confirmDescPeriod = period;

            const popup = document.getElementById('confirmDescPopup');
            popup.innerHTML = `
                <div class="points-popup-header">
                    <span style="font-size:1.5rem">${habit.icon || '📌'}</span>
                    <span>${escapeHtml(habit.name)}</span>
                </div>
                <div style="padding:16px;color:#ccc;font-size:0.95rem;line-height:1.5">${formatDescription(habit.description || 'No description')}</div>
                <div style="padding:0 16px 16px;display:flex;gap:8px">
                    <button class="submit-btn secondary" onclick="closeConfirmDescPopup()" style="flex:1">Cancel</button>
                    <button class="submit-btn" onclick="confirmAndCompleteHabit()" style="flex:1">Complete</button>
                </div>
            `;
            document.getElementById('confirmDescPopupOverlay').classList.add('active');
        }

        function closeConfirmDescPopup() {
            document.getElementById('confirmDescPopupOverlay').classList.remove('active');
            confirmDescHabitId = null;
            confirmDescPeriod = null;
        }

        function confirmAndCompleteHabit() {
            const id = confirmDescHabitId;
            const period = confirmDescPeriod;
            closeConfirmDescPopup();
            doCompleteHabit(id, period, true);
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
            const existing = habit.completions.find(c => c.date === today && (freqType !== FREQ.TWICE_DAILY || c.period === period));
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

                // Auto-complete linked habit if specified
                if (habit.autoCompletes) {
                    const autoId = Number(habit.autoCompletes);
                    const linkedHabit = habits.find(h => (autoId ? h.id === autoId : h.name.toLowerCase() === habit.autoCompletes.toLowerCase()) && h.id !== id);
                    if (linkedHabit && !linkedHabit.completions.find(c => c.date === today)) {
                        linkedHabit.completions.push({ date: today, period: null, timestamp: Date.now(), autoCompleted: true });
                        linkedHabit.autoCompletedToday = today; // Hide from view for the day
                        // Clear snooze on linked habit too
                        if (linkedHabit.snoozedUntil) {
                            linkedHabit.snoozedUntil = null;
                            delete linkedHabit.snoozedUntilPeriod;
                        }
                    }
                }
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
            // Re-render details to show updated state
            renderDetails();
        }

        // ========================================
        // HABIT STATE FUNCTIONS
        // ========================================

        let collapsedSections = {};

        function canDoNow(habit) {
            const today = getTodayString();
            const timeOfDay = getTimeOfDayNow();
            if (habit.skippedDates?.includes(today)) return false;

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

            const { now: nowHabits, optional: optionalHabits, later: laterHabits, done: completedHabits,
                    morning: morningSpecific, bedtime: bedtimeSpecific, anytime: anytimeHabits, reminders: reminderHabits, timeOfDay } = categorizeHabits(habits);

            // Helper: render a sub-section with header and habits grid (large tasks sorted first)
            const subSection = (habits, icon, title) => {
                if (!habits.length) return '';
                const sorted = [...habits].sort((a, b) => (b.isLarge ? 1 : 0) - (a.isLarge ? 1 : 0));
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

            // Collapsible sections using helper
            html += renderSection(optionalHabits, 'optional', '⭐', 'Optional', false, { inactive: true });
            html += renderSection(laterHabits, 'later', '🌙', 'Tonight', true, { inactive: true, isLater: true });
            html += renderSection(completedHabits, 'completed', '✓', 'Finished', true, { inactive: true, isCompleted: true });

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
            const debugActive = document.getElementById('debugPanel')?.classList.contains('active');
            const collapsed = debugActive ? false : collapsedSections[sectionId];
            const contentClass = collapsed ? 'section-content collapsed' : 'section-content';
            const headerClass = collapsed ? 'section-header collapsible collapsed' : 'section-header collapsible';
            const sectionClass = renderOpts.inactive ? 'habits-section inactive-section' : 'habits-section';
            // Sort: large tasks first, reminders last
            const sorted = [...habits].sort((a, b) => (b.isLarge ? 1 : 0) - (a.isLarge ? 1 : 0) || (a.isReminder ? 1 : 0) - (b.isReminder ? 1 : 0));
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

        function renderHabitIcon(habit, isLater = false, isCompleted = false) {
            const status = getCompletionStatus(habit);
            const scoreData = calculateMomentumScore(habit);
            const isReminder = habit.isReminder || habit.frequency.type === FREQ.REMINDER;
            const hasHistory = !!(habit.lastScoreUpdate || habit.createdAt);

            // Calculate neglect level differently for reminders vs regular habits
            let neglectLevel = 0;
            if (isReminder) {
                // For reminders: show dots based on days since last completion, scaled by expected frequency
                const lastCompletion = getLastCompletionDate(habit);
                // Use momentum reset date as reference if it's more recent than last completion
                const resetDate = habit.momentumResetDate;
                const referenceDate = (lastCompletion && resetDate) ? (lastCompletion > resetDate ? lastCompletion : resetDate) :
                                      (lastCompletion || resetDate);
                if (referenceDate) {
                    const freq = habit.frequency;
                    // Calculate expected cycle days for this reminder
                    let expectedCycle = 7; // default
                    if (freq.reminderDays) expectedCycle = freq.reminderDays;
                    else if (freq.everyXWeeks) expectedCycle = freq.everyXWeeks * 7;
                    else if (freq.everyXMonths) expectedCycle = freq.everyXMonths * 30;
                    else if (freq.everyXDays) expectedCycle = freq.everyXDays;

                    const daysSince = daysBetween(referenceDate, getTodayString());
                    // Scale thresholds based on expected cycle (dots appear as you approach/pass due date)
                    if (daysSince >= expectedCycle * 1.75) neglectLevel = 3;      // Significantly overdue
                    else if (daysSince >= expectedCycle) neglectLevel = 2;        // Overdue
                    else if (daysSince >= expectedCycle * 0.5) neglectLevel = 1;  // Approaching due
                }
            } else {
                // For regular habits: show dots based on negative momentum score
                neglectLevel = hasHistory && scoreData.display < 0 ? Math.min(3, Math.abs(scoreData.display)) : 0;
            }
            const icon = habit.icon || '📌';

            // Calculate progress for ring
            let progress = '0%';
            let ringClass = '';

            // Click handlers: left click = complete (or details if completed), right click = details
            const isPointsBased = habit.frequency.type === FREQ.POINTS_PER_DAY || habit.frequency.type === FREQ.POINTS_PER_WEEK || habit.frequency.type === FREQ.POINTS_PER_MONTH;
            const leftClick = isCompleted ? `openDetails(${habit.id})` : (isPointsBased ? `openPointsPopup(${habit.id})` : `completeHabit(${habit.id})`);
            const rightClick = `event.preventDefault();openDetails(${habit.id})`;

            // Render neglect dots (1-3 based on neglect level)
            const neglectDots = neglectLevel > 0 ?
                `<div class="neglect-dots">${'<div class="neglect-dot"></div>'.repeat(neglectLevel)}</div>` : '';

            if (habit.frequency.type === FREQ.TWICE_DAILY) {
                // Split ring for twice daily - with divider line
                const bothDone = status.morningDone && status.nightDone;
                const twiceDailyHasSubtasks = habit.subtasks && habit.subtasks.length > 0;
                const twiceDailyExtraIndicator = twiceDailyHasSubtasks ? '<div class="extra-indicator"></div>' : '';
                return `<div class="habit-icon-wrapper">
                    <div class="habit-icon" data-habit-id="${habit.id}" onclick="${bothDone ? `openDetails(${habit.id})` : `completeTwiceDaily(${habit.id})`}" oncontextmenu="${rightClick}">
                        <div class="habit-ring split ${bothDone ? 'completed' : ''}">
                            <div class="half-fill left ${status.morningDone ? 'filled' : ''}"></div>
                            <div class="half-fill right ${status.nightDone ? 'filled' : ''}"></div>
                            <div class="divider"></div>
                            <span class="habit-emoji">${icon}</span>
                            ${neglectDots}
                            ${twiceDailyExtraIndicator}
                        </div>
                    </div>
                </div>`;
            }

            // Check subtask progress for partial fill
            const subtaskProgress = getSubtaskProgress(habit);
            const hasSubtasks = subtaskProgress && subtaskProgress.total > 0;
            const subtaskPct = hasSubtasks ? Math.round((subtaskProgress.completed / subtaskProgress.total) * 100) : 0;
            const allSubtasksDone = hasSubtasks && subtaskProgress.completed === subtaskProgress.total;

            if (isCompleted) {
                // In Finished section
                const today = getTodayString();
                const completedToday = habit.completions.some(c => c.date === today);
                if (completedToday || status.completed || allSubtasksDone) {
                    if (hasSubtasks && !allSubtasksDone) {
                        // Partial subtask completion - show green partial fill
                        ringClass = 'partial';
                        progress = `${subtaskPct}%`;
                    } else {
                        ringClass = 'completed';
                        progress = '100%';
                    }
                } else {
                    // Unfinished task in Finished section (e.g., missed morning task)
                    ringClass = 'missed';
                    progress = '0%';
                }
            } else if (hasSubtasks) {
                // Subtasks take priority - show progress based on subtask completion
                progress = `${subtaskPct}%`;
                if (allSubtasksDone) {
                    ringClass = 'completed';
                    progress = '100%';
                } else if (subtaskPct > 0) {
                    ringClass = 'partial';
                }
                // Red dots show momentum, no red background here
            } else if (status.completed) {
                ringClass = 'completed';
                progress = '100%';
            } else if (habit.frequency.type === FREQ.POINTS_PER_DAY) {
                // Points per day - show progress based on points accumulated today
                const pct = Math.min(100, Math.round((status.points / status.target) * 100));
                progress = `${pct}%`;
                if (pct > 0) {
                    ringClass = 'partial';
                }
            } else if (habit.frequency.type === FREQ.TIMES_PER_WEEK || habit.frequency.type === FREQ.TIMES_PER_MONTH ||
                       habit.frequency.type === FREQ.POINTS_PER_WEEK || habit.frequency.type === FREQ.POINTS_PER_MONTH) {
                // For weekly/monthly/points habits without subtasks
                const today = getTodayString();
                const completedToday = habit.completions.some(c => c.date === today);
                if (completedToday) {
                    ringClass = 'completed';
                    progress = '100%';
                } else {
                    progress = '0%';
                    // Red dots show momentum, no red background here
                }
            } else {
                progress = '0%';
                // Red dots show momentum, no red background here
            }

            // Subtle indicator for habits with extra interactions (subtasks or points)
            const extraIndicator = (hasSubtasks || isPointsBased) ? '<div class="extra-indicator"></div>' : '';

            // Handle negative habits differently
            const isNegative = habit.isNegative;
            const today = getTodayString();
            const loggedToday = habit.completions.some(c => c.date === today);

            if (isNegative) {
                // Negative habits: logged = bad (red), not logged = avoiding successfully
                ringClass = loggedToday ? 'negative-logged' : 'negative';
            }

            const largeClass = habit.isLarge ? 'large' : '';

            return `<div class="habit-icon-wrapper ${largeClass}">
                <div class="habit-icon" data-habit-id="${habit.id}" onclick="${leftClick}" oncontextmenu="${rightClick}">
                    <div class="habit-ring ${ringClass}" style="--progress: ${progress}">
                        <span class="habit-emoji">${icon}</span>
                        ${isNegative && !loggedToday ? '' : neglectDots}
                        ${extraIndicator}
                    </div>
                </div>
            </div>`;
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
            if (existing) {
                habit.completions = habit.completions.filter(c => c !== existing);
            } else {
                habit.completions.push({ date: today, period, timestamp: Date.now() });
                hapticFeedback();
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
            document.getElementById('subtaskPopupOverlay').classList.add('active');
        }

        function closeSubtaskPopup() {
            document.getElementById('subtaskPopupOverlay').classList.remove('active');
            subtaskPopupHabitId = null;
        }

        function renderSubtaskPopup() {
            const habit = loadHabits().find(h => h.id === subtaskPopupHabitId);
            if (!habit) return;

            const icon = habit.icon || '📌';
            const subtasks = habit.subtasks || [];

            const subtaskItems = subtasks.map(s => {
                const completed = isSubtaskCompleted(habit, s.id);
                return `<div class="subtask-popup-item" onclick="toggleSubtaskFromPopup(${habit.id}, ${s.id})">
                    <div class="subtask-checkbox ${completed ? 'checked' : ''}"></div>
                    <span class="subtask-name ${completed ? 'completed' : ''}">${escapeHtml(s.name)}</span>
                </div>`;
            }).join('');

            document.getElementById('subtaskPopup').innerHTML = `
                <div class="subtask-popup-header">
                    <span class="subtask-popup-icon">${icon}</span>
                    <span class="subtask-popup-title">${escapeHtml(habit.name)}</span>
                    <button class="subtask-popup-close" onclick="closeSubtaskPopup()">&times;</button>
                </div>
                <div class="subtask-popup-list">${subtaskItems}</div>
                <button class="submit-btn" style="margin-top:12px;width:100%" onclick="completeHabitWithAllSubtasks(${habit.id})">Complete All</button>`;
        }

        function completeHabitWithAllSubtasks(habitId) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === habitId);
            if (!habit) return;

            const today = getTodayString();
            const periodKey = getSubtaskPeriodKey(habit);
            const isTwiceDaily = habit.frequency.type === FREQ.TWICE_DAILY;
            const currentPeriod = getTimeOfDayNow() === PERIOD.MORNING ? PERIOD.MORNING : PERIOD.NIGHT;

            // Complete all subtasks
            if (habit.subtasks) {
                habit.subtasks.forEach(s => {
                    if (!s.completedPeriods) s.completedPeriods = {};
                    s.completedPeriods[periodKey] = Date.now();
                });
            }

            // Show confirm description popup if applicable
            if (habit.confirmDescription && habit.description) {
                saveHabits(habits);
                closeSubtaskPopup();
                openConfirmDescPopup(habitId, isTwiceDaily ? currentPeriod : null);
                renderHabits();
                return;
            }

            // Complete the habit itself (include period for twiceDaily)
            const completion = { date: today, timestamp: Date.now() };
            if (isTwiceDaily) {
                completion.period = currentPeriod;
            }
            habit.completions.push(completion);
            habit.momentumScore = (habit.momentumScore || 0) + 15;
            habit.lastScoreUpdate = today;
            hapticFeedback();

            saveHabits(habits);
            closeSubtaskPopup();
            renderHabits();
        }

        function toggleSubtaskFromPopup(habitId, subtaskId) {
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

                // Auto-complete habit when all subtasks done
                const allCompleted = habit.subtasks.every(s => s.completedPeriods && s.completedPeriods[periodKey]);
                const alreadyCompleted = isTwiceDaily
                    ? habit.completions.some(c => c.date === today && c.period === currentPeriod)
                    : habit.completions.some(c => c.date === today);

                if (allCompleted && !alreadyCompleted) {
                    // Show confirm description popup if applicable
                    if (habit.confirmDescription && habit.description) {
                        saveHabits(habits);
                        closeSubtaskPopup();
                        openConfirmDescPopup(habitId, isTwiceDaily ? currentPeriod : null);
                        renderHabits();
                        return;
                    }
                    const completion = { date: today, timestamp: Date.now() };
                    if (isTwiceDaily) completion.period = currentPeriod;
                    habit.completions.push(completion);
                    habit.momentumScore = (habit.momentumScore || 0) + 15;
                    habit.lastScoreUpdate = today;
                }
            }

            saveHabits(habits);
            renderSubtaskPopup();
            renderHabits();
        }

        function toggleSubtaskFromDetails(habitId, subtaskId) {
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
                if (isTwiceDaily) {
                    habit.completions = habit.completions.filter(c => !(c.date === today && c.period === currentPeriod));
                } else {
                    habit.completions = habit.completions.filter(c => c.date !== today);
                }
            } else {
                subtask.completedPeriods[periodKey] = Date.now();
                hapticFeedback();
            }

            saveHabits(habits);
            renderDetails();
            renderHabits();
        }

        // Points popup functions
        let pointsPopupHabitId = null;

        function openPointsPopup(habitId) {
            pointsPopupHabitId = habitId;
            renderPointsPopup();
            document.getElementById('pointsPopupOverlay').classList.add('active');
        }

        function closePointsPopup() {
            document.getElementById('pointsPopupOverlay').classList.remove('active');
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

            document.getElementById('pointsPopup').innerHTML = `
                <div class="points-popup-header">
                    <span class="points-popup-icon">${icon}</span>
                    <span class="points-popup-title">${escapeHtml(habit.name)}</span>
                </div>
                <div class="points-popup-target">Target: ${target} pts / ${period}</div>
                <div class="points-popup-buttons">
                    <button class="points-btn" onclick="completeWithPoints(${habit.id}, 1)">1</button>
                    <button class="points-btn" onclick="completeWithPoints(${habit.id}, 2)">2</button>
                    <button class="points-btn" onclick="completeWithPoints(${habit.id}, 3)">3</button>
                </div>`;
        }

        function completeWithPoints(habitId, points) {
            const habits = loadHabits();
            const habit = habits.find(h => h.id === habitId);
            if (!habit) return;

            const today = getTodayString();
            habit.completions.push({ date: today, timestamp: Date.now(), points });
            hapticFeedback();

            // Boost momentum based on points
            boostMomentumScore(habit, points);

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
            detailsOpenedFromAllHabits = false;
            editMode = false;
            formMode = 'create';
            renderDetails();
            document.getElementById('detailsOverlay').classList.add('active');
        }

        function openDetailsFromAllHabits(id) {
            selectedHabitId = id;
            detailsOpenedFromAllHabits = true;
            editMode = false;
            formMode = 'create';
            // Close All Habits overlay first so details can be seen
            document.getElementById('allHabitsOverlay').classList.remove('active');
            renderDetails();
            document.getElementById('detailsOverlay').classList.add('active');
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
            document.getElementById('detailsOverlay').classList.add('active');
        }

        function closeDetails() {
            document.getElementById('detailsOverlay').classList.remove('active');
            selectedHabitId = null;
            editMode = false;
            formMode = 'create';
            resetFormState();
            // Return to All Habits if that's where we came from
            if (detailsOpenedFromAllHabits) {
                detailsOpenedFromAllHabits = false;
                openAllHabits();
            }
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
                const input = document.getElementById('editTimesPerPeriod');
                const val = Math.max(1, parseInt(input?.value) || DEFAULTS.TIMES_PER_PERIOD);
                habit.frequency.timesPerDay = val;
                habit.frequency.timesPerWeek = val;
                habit.frequency.timesPerMonth = val;
            }
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

            // Save large display preference
            habit.isLarge = formState.isLarge;

            // Save negative habit flag
            habit.isNegative = formState.isNegative;

            // Save confirm description flag
            habit.confirmDescription = formState.confirmDescription;

            // Save auto-completes
            habit.autoCompletes = document.getElementById('editAutoCompletes')?.value.trim() || '';

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
            } else {
                // View mode
                const total = habit.completions.length;
                const uniqueDays = new Set(habit.completions.map(c => c.date)).size;
                const daysSinceCreated = Math.max(1, daysBetween(habit.createdAt, today) + 1);
                const rate = Math.round((uniqueDays / daysSinceCreated) * 100);

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
                    const snoozeDate = new Date(habit.snoozedUntil + 'T00:00:00');
                    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowStr = tomorrow.toISOString().split('T')[0];
                    if (habit.snoozedUntil === tomorrowStr) {
                        habitStatus = 'Snoozed until tomorrow';
                    } else {
                        habitStatus = `Snoozed until ${snoozeDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
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
                const freqLabel = { daily: 'Daily', reminder: `${habit.frequency.reminderDays || 1} days after`, twiceDaily: 'Twice daily', timesPerDay: `${habit.frequency.timesPerDay || 1}x within day`, timesPerWeek: `${habit.frequency.timesPerWeek || 3}x within week`, timesPerMonth: `${habit.frequency.timesPerMonth || 4}x within month`, everyXDays: afterLabel, pointsPerDay: `${habit.frequency.pointsPerDay || 4} pts within day`, pointsPerWeek: `${habit.frequency.pointsPerWeek || 12} pts within week`, pointsPerMonth: `${habit.frequency.pointsPerMonth || 30} pts within month` }[habit.frequency.type];
                const timeLabel = habit.timeOfDay ? { morning: 'Morning', night: 'Bedtime' }[habit.timeOfDay] : 'Anytime';

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
                let moveToTodayButton = '';
                if (!completedToday) {
                    if (isPointsBased) {
                        completeButton = `<button class="submit-btn" style="flex:1;background:#4ade80" onclick="closeDetails();openPointsPopup(${habit.id})">Complete</button>`;
                    } else if (isTwiceDaily) {
                        const canComplete = !status.morningDone || !status.nightDone;
                        if (canComplete) {
                            completeButton = `<button class="submit-btn" style="flex:1;background:#4ade80" onclick="completeHabitFromDetails(${habit.id})">Complete</button>`;
                        }
                    } else {
                        completeButton = `<button class="submit-btn" style="flex:1;background:#4ade80" onclick="completeHabitFromDetails(${habit.id})">Complete</button>`;
                    }
                    // Show "Move to Today" if there's a past completion to move
                    const pastCompletions = habit.completions.filter(c => c.date !== today);
                    if (pastCompletions.length > 0) {
                        moveToTodayButton = `<button class="submit-btn secondary" style="flex:1" onclick="moveCompletionToToday(${habit.id})">Move to Today</button>`;
                    }
                } else {
                    // Show undo button for completed tasks
                    undoButton = `<button class="submit-btn secondary" style="flex:1" onclick="undoHabitCompletion(${habit.id})">Undo</button>`;
                }

                document.getElementById('detailsModal').innerHTML = `
                    <div class="modal-header"><span></span><button class="modal-close" onclick="closeDetails()">&times;</button></div>
                    <div class="details-icon-header">
                        <div class="details-large-icon">${icon}</div>
                        <div class="details-habit-name">${escapeHtml(habit.name)}</div>
                        ${habit.description ? `<div style="color:#888;font-size:0.85rem;margin-top:4px">${formatDescription(habit.description)}</div>` : ''}
                    </div>
                    ${!isReminder ? `<div class="momentum-display">
                        <div class="momentum-score ${scoreClass}">${rawScore}<span class="momentum-max">/100</span></div>
                        <div class="momentum-label">Momentum${recoveryText}</div>
                        ${rawScore !== 0 ? `<button style="margin-top:8px;padding:4px 12px;background:#2a2a3e;border:1px solid #444;border-radius:6px;color:#888;font-size:0.7rem;cursor:pointer" onclick="resetHabitMomentum(${habit.id})">Reset to 0</button>` : ''}
                    </div>` : ''}
                    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value" style="color:${statusColor}">${habitStatus}</span></div>
                    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${timeLabel}</span></div>
                    <div class="detail-row"><span class="detail-label">Frequency</span><span class="detail-value">${freqLabel}</span></div>
                    ${(habit.frequency.type === FREQ.POINTS_PER_DAY || habit.frequency.type === FREQ.POINTS_PER_WEEK || habit.frequency.type === FREQ.POINTS_PER_MONTH) ? `<div class="detail-row"><span class="detail-label">Progress</span><span class="detail-value">${getCompletionStatus(habit).text}</span></div>` : ''}
                    ${!isReminder ? `<div class="stats-grid">
                        <div class="stat-box"><div class="stat-number">${total}</div><div class="stat-label">Total</div></div>
                        <div class="stat-box"><div class="stat-number">${rate}%</div><div class="stat-label">Rate</div></div>
                        <div class="stat-box"><div class="stat-number">${avgInterval}</div><div class="stat-label">Avg Gap</div></div>
                    </div>` : ''}
                    ${habit.subtasks && habit.subtasks.length > 0 ? `
                    <div class="subtask-list" style="margin:10px 0">
                        <div style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Subtasks</div>
                        <div class="subtasks-scroll-container">
                            ${habit.subtasks.map(s => {
                                const completed = isSubtaskCompleted(habit, s.id);
                                return `<div class="subtask-item" onclick="toggleSubtaskFromDetails(${habit.id}, ${s.id})">
                                    <div class="subtask-checkbox ${completed ? 'checked' : ''}"></div>
                                    <span class="subtask-name ${completed ? 'completed' : ''}">${escapeHtml(s.name)}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>` : ''}
                    <div class="action-buttons">
                        <div style="display:flex;gap:6px">
                            ${completeButton || undoButton || ''}
                            ${moveToTodayButton}
                            <button class="submit-btn${completeButton || undoButton || moveToTodayButton ? ' secondary' : ''}" style="flex:1" onclick="toggleEditMode()">Edit</button>
                            ${canSnooze ? `<button class="submit-btn secondary" style="flex:1" onclick="openSnoozePopup(${habit.id})">Snooze</button>` : ''}
                            ${isSnoozed ? `<button class="submit-btn secondary" style="flex:1" onclick="unsnoozeHabit(${habit.id})">Unsnooze</button>` : ''}
                        </div>
                        <div style="display:flex;gap:6px">
                            <button class="submit-btn secondary" style="flex:1" onclick="freshStartHabit(${habit.id})">Fresh Start</button>
                            ${total > 0 ? `<button class="submit-btn secondary" style="flex:1" onclick="resetHabitStats(${habit.id})">Reset Stats</button>` : ''}
                            ${habit.archived
                                ? `<button class="submit-btn secondary" style="flex:1" onclick="unarchiveHabit(${habit.id})">Unarchive</button>`
                                : `<button class="submit-btn secondary" style="flex:1" onclick="archiveHabit(${habit.id})">Archive</button>`}
                            <button class="submit-btn danger" style="flex:1" onclick="deleteHabit(${habit.id})">Delete</button>
                        </div>
                    </div>`;
            }
        }

        // ========================================
        // ALL HABITS VIEW
        // ========================================

        let allHabitsSearchQuery = '';

        function openAllHabits() {
            allHabitsSearchQuery = '';
            renderAllHabits();
            document.getElementById('allHabitsOverlay').classList.add('active');
            setTimeout(() => document.getElementById('allHabitsSearch')?.focus(), 100);
        }

        function closeAllHabits() {
            document.getElementById('allHabitsOverlay').classList.remove('active');
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

            // Filter and sort by status, then by snooze date, then by name
            let filtered = habits;
            if (allHabitsSearchQuery) {
                filtered = habits
                    .map(h => ({ habit: h, ...fuzzyMatch(h.name, allHabitsSearchQuery) }))
                    .filter(h => h.match)
                    .sort((a, b) => getHabitStatusOrder(a.habit) - getHabitStatusOrder(b.habit) || getSnoozeDate(a.habit).localeCompare(getSnoozeDate(b.habit)) || a.habit.name.localeCompare(b.habit.name))
                    .map(h => h.habit);
            } else {
                filtered = [...habits].sort((a, b) => getHabitStatusOrder(a) - getHabitStatusOrder(b) || getSnoozeDate(a).localeCompare(getSnoozeDate(b)) || a.name.localeCompare(b.name));
            }

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
                return `<div class="habit-icon-wrapper" style="${opacity}">
                    <div class="habit-icon" onclick="openDetailsFromAllHabits(${habit.id})">
                        <div class="habit-ring" style="--progress: 0%; background: #2a2a3e;">
                            <span class="habit-emoji">${icon}</span>
                        </div>
                    </div>
                    <span class="habit-name">${escapeHtml(habit.name)}</span>
                </div>`;
            };

            let html = '';
            if (nowHabits.length) {
                html += `<div class="all-habits-section-header">Now</div>`;
                html += `<div class="habits-grid">${nowHabits.map(renderHabitItem).join('')}</div>`;
            }
            if (otherHabits.length) {
                html += `<div class="all-habits-section-header" style="margin-top:16px">Other</div>`;
                html += `<div class="habits-grid">${otherHabits.map(renderHabitItem).join('')}</div>`;
            }
            if (archivedHabits.length) {
                html += `<div class="all-habits-section-header" style="margin-top:16px;color:#666">Archived</div>`;
                html += `<div class="habits-grid">${archivedHabits.map(renderHabitItem).join('')}</div>`;
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
                <div class="all-habits-fixed-header">
                    <div class="modal-header">
                        <h2 class="modal-title">All Habits</h2>
                        <button class="modal-close" onclick="closeAllHabits()">&times;</button>
                    </div>
                    <div class="all-habits-search-wrapper">
                        <input type="text" id="allHabitsSearch" class="form-input" placeholder="Search habits..."
                            oninput="onAllHabitsSearch(this.value)" value="${escapeHtml(allHabitsSearchQuery)}" />
                    </div>
                </div>
                <div class="all-habits-scroll-area">
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
                { id: 5, name: 'Journal', icon: '✍️', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, lastScoreUpdate: today, momentumScore: 0 },
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

        document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDetails(); closeSettings(); closeSubtaskPopup(); closePointsPopup(); closeEmojiPopup(); closeSnoozePopup(); closeConfirmDescPopup(); closeAllHabits(); } });

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
            const modal = e.target.closest('.modal, .subtask-popup, .points-popup, .emoji-popup');
            if (modal) {
                // Only enable swipe if at top of scrollable content
                const scrollable = modal.querySelector('.all-habits-scroll-area') || modal;
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
                // Apply transform with resistance (moves slower than finger)
                const resistance = 0.5;
                const translateY = Math.min(delta * resistance, 200);
                swipeElement.style.transform = `translateY(${translateY}px)`;
                swipeElement.style.transition = 'none';
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchend', e => {
            if (!swipeElement || swipeStartY === 0) return;
            const swipeEndY = e.changedTouches[0].clientY;
            const swipeDelta = swipeEndY - swipeStartY;
            const elementToReset = swipeElement; // Save reference before clearing

            if (swipeActive && swipeDelta > 80) {
                // Animate out then close
                swipeElement.style.transition = 'transform 0.2s ease-out';
                swipeElement.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    // Reset transform first
                    elementToReset.style.transform = '';
                    elementToReset.style.transition = '';
                    // Then close
                    if (document.getElementById('modalOverlay').classList.contains('active')) closeModal();
                    else if (document.getElementById('detailsOverlay').classList.contains('active')) closeDetails();
                    else if (document.getElementById('settingsOverlay').classList.contains('active')) closeSettings();
                    else if (document.getElementById('subtaskPopupOverlay').classList.contains('active')) closeSubtaskPopup();
                    else if (document.getElementById('pointsPopupOverlay').classList.contains('active')) closePointsPopup();
                    else if (document.getElementById('emojiPopupOverlay').classList.contains('active')) closeEmojiPopup();
                    else if (document.getElementById('snoozePopupOverlay').classList.contains('active')) closeSnoozePopup();
                    else if (document.getElementById('allHabitsOverlay').classList.contains('active')) closeAllHabits();
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

        // Update scores on page load to persist momentum for missed days
        updateAllHabitScores();
        updateDisplay();

        // Initialize PWA and notifications
        registerServiceWorker();
        // Run notification check immediately (doesn't need SW)
        if (getSettings().notificationsEnabled) {
            scheduleNotifications();
            checkNotificationOnOpen();
        }

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

        // Check every minute if period or date changed
        setInterval(() => {
            updateBadge();
            const currentPeriod = getTimeOfDayNow();
            const currentDate = getTodayString();
            if (currentPeriod !== lastPeriod || currentDate !== lastDate) {
                lastPeriod = currentPeriod;
                lastDate = currentDate;
                updateDisplay();
                scheduleNotifications();
            }
        }, 60000);
