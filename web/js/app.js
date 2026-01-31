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
let debugDayOffset = 0;
let debugHourOverride = null;
let emojiPopupMode = null; // 'new' or habit id for edit
let editModeHabitId = null; // Track which habit is being edited for emoji exclusion
let newHabitSubtasks = []; // Subtasks for new habit creation

// Unified form state - used by both Create and Edit modes
let formMode = 'create'; // 'create' or 'edit'
let formHabitId = null; // Habit ID when editing

// Form state object - single source of truth for form data
const formState = {
    time: null,                          // null = anytime, 'morning', 'night'
    frequency: FREQ.DAILY,               // dropdown value
    isReminderMode: false,               // task type: reminder vs regular
    isPointsMode: false,                 // measurement: points vs completions
    allowOptional: false,                // allow extra completions
    showSubtasks: false,                 // show subtasks input area
    icon: null,                          // selected emoji
    timesPeriod: PERIOD.WEEK,            // 'week' or 'month' for times
    pointsPeriod: PERIOD.WEEK,           // 'week' or 'month' for points
    hideSubtasksOnMain: false            // hide subtasks on main screen (edit only)
};

// ========================================
// FORM STATE MANAGEMENT
// ========================================

// Reset form state to defaults
function resetFormState() {
    formState.time = null;
    formState.frequency = FREQ.DAILY;
    formState.isReminderMode = false;
    formState.isPointsMode = false;
    formState.allowOptional = false;
    formState.showSubtasks = false;
    formState.icon = null;
    formState.timesPeriod = PERIOD.WEEK;
    formState.pointsPeriod = PERIOD.WEEK;
    formState.hideSubtasksOnMain = false;
}

// Initialize form state from habit (for edit mode)
function initFormStateFromHabit(habit) {
    formState.icon = habit.icon || HABIT_EMOJIS[0];
    formState.allowOptional = habit.allowOptional !== false;
    formState.hideSubtasksOnMain = habit.showSubtasksOnMain === false;
    formState.showSubtasks = false; // Will show if habit has subtasks

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
}

// Get current form state (for compatibility with renderHabitForm)
function getFormState(habit = null) {
    // For edit mode with existing subtasks, override showSubtasks
    if (formMode === 'edit' && habit?.subtasks?.length > 0) {
        return { ...formState, showSubtasks: true };
    }
    return formState;
}

// Render the habit form (shared between Create and Edit modes)
function renderHabitForm(habit = null) {
    const isEdit = formMode === 'edit';
    const state = getFormState(habit);
    const currentIcon = state.icon || (habit?.icon) || '📌';
    const habitName = habit ? escapeHtml(habit.name) : '';
    // Points disabled for twice daily and every X days
    const isTwiceDaily = state.frequency === FREQ.TWICE_DAILY;
    const isEveryXDays = state.frequency === FREQ.EVERY_X_DAYS;
    const pointsDisabled = isTwiceDaily || isEveryXDays;
    // Allow Extra disabled for twice daily
    const optionalDisabled = isTwiceDaily;

    // Build frequency inputs (use lowercase IDs for create, camelCase with 'edit' prefix for edit)
    const idPrefix = isEdit ? 'edit' : '';
    let freqInputsHtml = '';
    if (state.frequency === FREQ.EVERY_X_DAYS) {
        const daysVal = habit?.frequency?.everyXDays || DEFAULTS.EVERY_X_DAYS;
        freqInputsHtml = `<input type="number" class="frequency-input" id="${idPrefix}${isEdit ? 'E' : 'e'}veryXDays" value="${daysVal}" min="1"><span style="color:#888">days</span>`;
    } else if (state.frequency === FREQ.TIMES_PER_PERIOD) {
        if (state.isPointsMode) {
            const ptsVal = habit?.frequency?.pointsPerDay || habit?.frequency?.pointsPerWeek || habit?.frequency?.pointsPerMonth || DEFAULTS.POINTS_PER_PERIOD;
            freqInputsHtml = `<input type="number" class="frequency-input" id="${idPrefix}${isEdit ? 'P' : 'p'}ointsPerPeriod" value="${ptsVal}" min="1"><span style="color:#888">pts /</span>
                <div class="period-toggle">
                    <button type="button" class="period-toggle-btn ${state.pointsPeriod === PERIOD.DAY ? 'active' : ''}" onclick="setFormPeriod('points', '${PERIOD.DAY}')">day</button>
                    <button type="button" class="period-toggle-btn ${state.pointsPeriod === PERIOD.WEEK ? 'active' : ''}" onclick="setFormPeriod('points', '${PERIOD.WEEK}')">wk</button>
                    <button type="button" class="period-toggle-btn ${state.pointsPeriod === PERIOD.MONTH ? 'active' : ''}" onclick="setFormPeriod('points', '${PERIOD.MONTH}')">mo</button>
                </div>`;
        } else {
            const timesVal = habit?.frequency?.timesPerDay || habit?.frequency?.timesPerWeek || habit?.frequency?.timesPerMonth || DEFAULTS.TIMES_PER_PERIOD;
            freqInputsHtml = `<input type="number" class="frequency-input" id="${idPrefix}${isEdit ? 'T' : 't'}imesPerPeriod" value="${timesVal}" min="1" max="31">
                <div class="period-toggle">
                    <button type="button" class="period-toggle-btn ${state.timesPeriod === PERIOD.DAY ? 'active' : ''}" onclick="setFormPeriod('times', '${PERIOD.DAY}')">day</button>
                    <button type="button" class="period-toggle-btn ${state.timesPeriod === PERIOD.WEEK ? 'active' : ''}" onclick="setFormPeriod('times', '${PERIOD.WEEK}')">wk</button>
                    <button type="button" class="period-toggle-btn ${state.timesPeriod === PERIOD.MONTH ? 'active' : ''}" onclick="setFormPeriod('times', '${PERIOD.MONTH}')">mo</button>
                </div>`;
        }
    }

    // Subtasks section (for create mode or edit mode with subtasks)
    const subtasks = isEdit ? (habit?.subtasks || []) : newHabitSubtasks;
    const showSubtasksArea = isEdit || state.showSubtasks;
    let subtasksHtml = '';
    if (showSubtasksArea || subtasks.length > 0) {
        const subtaskItems = isEdit ? subtasks.map(s => `
            <div class="subtask-item">
                <input type="text" class="subtask-name-input" value="${escapeHtml(s.name)}"
                    onchange="updateEditSubtask(${habit.id}, ${s.id}, this.value)"
                    onkeypress="if(event.key==='Enter')this.blur()">
                <span class="subtask-delete" onclick="deleteSubtask(${habit.id}, ${s.id})">✕</span>
            </div>
        `).join('') : subtasks.map(s => `
            <div class="subtask-item">
                <input type="text" class="subtask-name-input" value="${escapeHtml(s.name)}"
                    onchange="updateNewHabitSubtask(${s.id}, this.value)"
                    onkeypress="if(event.key==='Enter')this.blur()">
                <span class="subtask-delete" onclick="removeNewHabitSubtask(${s.id})">✕</span>
            </div>
        `).join('');

        subtasksHtml = `
            <div class="form-group" id="${isEdit ? 'editSubtasksArea' : 'subtasksInputArea'}" style="${showSubtasksArea ? '' : 'display:none'}">
                <label class="form-label">Subtasks</label>
                <div id="${isEdit ? 'editSubtasksList' : 'newHabitSubtasksList'}">${subtaskItems}</div>
                <div class="add-subtask">
                    <input type="text" id="${isEdit ? 'editSubtaskInput' : 'newHabitSubtaskInput'}" placeholder="Add subtask..."
                        onkeypress="if(event.key==='Enter'){event.preventDefault();${isEdit ? `addSubtask(${habit.id})` : 'addNewHabitSubtask()'};}">
                    <button type="button" onclick="${isEdit ? `addSubtask(${habit.id})` : 'addNewHabitSubtask()'}">+</button>
                </div>
            </div>`;
    }

    // Hide subtasks toggle (only for edit mode with existing subtasks)
    let hideSubtasksHtml = '';
    if (isEdit && subtasks.length > 0) {
        hideSubtasksHtml = `
            <div class="form-group">
                <div class="settings-row" style="border:none;padding:8px 0">
                    <span class="settings-label">Hide subtasks on main screen</span>
                    <div class="toggle-switch ${formState.hideSubtasksOnMain ? 'active' : ''}" id="hideSubtasksToggle" onclick="toggleFormHideSubtasks()"></div>
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
                <label class="option-pill ${state.allowOptional && !optionalDisabled ? 'active' : ''} ${optionalDisabled ? 'disabled' : ''}" id="${isEdit ? 'editOptionalPill' : 'optionalPill'}" onclick="toggleFormAllowOptional()">
                    <span class="option-pill-check">✓</span>
                    <span>Allow extra</span>
                </label>
                <label class="option-pill ${state.isReminderMode ? 'active' : ''}" id="${isEdit ? 'editReminderPill' : 'reminderPill'}" onclick="toggleFormReminderMode()">
                    <span class="option-pill-check">✓</span>
                    <span>Reminder</span>
                </label>
            </div>
        </div>
        <div class="form-group" id="${isEdit ? 'editFrequencyGroup' : 'frequencyGroup'}">
            <label class="form-label">Schedule</label>
            <div class="frequency-row" id="${isEdit ? 'editFrequencyRow' : 'frequencyRow'}">
                <select class="form-input" id="${isEdit ? 'editFrequencySelect' : 'frequencySelect'}" onchange="selectFormFrequency(this.value)" style="flex:1">
                    <option value="${FREQ.DAILY}" ${state.frequency === FREQ.DAILY ? 'selected' : ''} ${state.isPointsMode ? 'disabled' : ''}>Daily${state.isPointsMode ? ' (not with Points)' : ''}</option>
                    <option value="${FREQ.TWICE_DAILY}" ${state.frequency === FREQ.TWICE_DAILY ? 'selected' : ''} ${state.isPointsMode ? 'disabled' : ''}>Morning & Bedtime${state.isPointsMode ? ' (not with Points)' : ''}</option>
                    <option value="${FREQ.EVERY_X_DAYS}" ${state.frequency === FREQ.EVERY_X_DAYS ? 'selected' : ''}>Every X days</option>
                    <option value="${FREQ.TIMES_PER_PERIOD}" ${state.frequency === FREQ.TIMES_PER_PERIOD ? 'selected' : ''}>X per period</option>
                </select>
                <div id="${isEdit ? 'editFrequencyInputs' : 'frequencyInputs'}">${freqInputsHtml}</div>
            </div>
        </div>
        ${subtasksHtml}
        ${hideSubtasksHtml}
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
    if (formMode === 'create') {
        document.getElementById('createModal').innerHTML = renderHabitForm();
    } else {
        const habit = loadHabits().find(h => h.id === formHabitId);
        document.getElementById('detailsModal').innerHTML = renderHabitForm(habit);
    }
}

// Unified period setter
function setFormPeriod(type, period) {
    if (type === 'times') {
        formState.timesPeriod = period;
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
    // When enabling points, auto-switch from incompatible frequencies
    if (formState.isPointsMode && (formState.frequency === FREQ.DAILY || formState.frequency === FREQ.TWICE_DAILY || formState.frequency === FREQ.EVERY_X_DAYS)) {
        formState.frequency = FREQ.TIMES_PER_PERIOD;
    }
    rerenderForm();
}

function toggleFormAllowOptional() {
    if (formState.frequency === FREQ.TWICE_DAILY) return;
    formState.allowOptional = !formState.allowOptional;
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

function toggleFormHideSubtasks() {
    formState.hideSubtasksOnMain = !formState.hideSubtasksOnMain;
    rerenderForm();
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
                        onclick="${isUsed ? '' : `selectEmojiFromPopup('${e}')`}">${e}</div>`;
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
    const s = localStorage.getItem('habit_settings');
    const defaults = {
        morningStart: 5,
        nightStart: 18,
        sortMethod: 'default',
        notificationsEnabled: false,
        morningReminderTime: 5,
        nightReminderTime: 18,
        weeklySummaryEnabled: false
    };
    return s ? { ...defaults, ...JSON.parse(s) } : defaults;
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
    // Update momentum scores and sync lastScoreUpdate to real date
    updateAllHabitScores();
    updateDebugDisplay();
    updateDisplay();
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
    document.getElementById('currentDate').innerHTML = formatDate(simDate) +
        (debugDayOffset !== 0 || debugHourOverride !== null ? `<span class="debug-offset">${debugDayOffset >= 0 ? '+' : ''}${debugDayOffset}d</span>` : '');
    const hour = debugHourOverride !== null ? debugHourOverride : simDate.getHours();
    if (hour < s.morningStart) {
        const prev = new Date(simDate); prev.setDate(prev.getDate() - 1);
        document.getElementById('timeNote').textContent = `Before ${s.morningStart}am — counts as ${formatDate(prev)}`;
    } else {
        document.getElementById('timeNote').textContent = '';
    }
    renderHabits();
    // Re-render open panels to update subtask states for new day
    if (selectedHabitId) renderDetails();
    if (subtaskPopupHabitId) renderSubtaskPopup();
}

// ========================================
// DATA ACCESS HELPERS
// ========================================

function getDefaultHabits() {
    const today = getTodayString();
    return [
        { id: 2, name: 'Shower', icon: '🚿', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: true, isReminder: false },
        { id: 3, name: 'Exercise', icon: '🏋️‍♂️', timeOfDay: null, frequency: { type: 'timesPerWeek', timesPerWeek: 3 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: false },
        { id: 4, name: 'Zoryve', icon: '💋', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: false },
        { id: 5, name: 'Night', icon: '🌙', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today },
        { id: 7, name: 'Morning', icon: '👶', timeOfDay: 'morning', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today },
        { id: 8, name: 'Shave', icon: '🪒', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: false },
        { id: 9, name: 'Change clothes', icon: '👕', timeOfDay: 'morning', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: false },
        { id: 10, name: 'Vitamins: Biotin', icon: '🎃', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today },
        { id: 11, name: 'Set alarms', icon: '⏰', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: true },
        { id: 12, name: 'Floss', icon: '🗃️', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today },
        { id: 13, name: 'Lip balm', icon: '👄', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: false },
        { id: 14, name: 'Ketoconazole shampoo', icon: '🧴', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: false },
        { id: 15, name: 'Hair helmet', icon: '🎅', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: false },
        { id: 16, name: 'Optional', icon: '👶', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today },
        { id: 17, name: 'Meal prep', icon: '🍲', timeOfDay: null, frequency: { type: 'pointsPerWeek', pointsPerWeek: 5 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: true, allowOptional: true, isReminder: false },
        { id: 18, name: 'Hands', icon: '👋', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: false },
        { id: 20, name: 'Weekly routine', icon: '⬆️', timeOfDay: null, frequency: { type: 'timesPerWeek', timesPerWeek: 1 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today },
        { id: 21, name: 'Periodic Hygiene', icon: '💎', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today },
        { id: 22, name: 'Posture corrector', icon: '🔙', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: true },
        { id: 24, name: 'Dandruff', icon: '❄️', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, subtasks: [], createdAt: today, usePoints: false, allowOptional: false, isReminder: false }
    ];
}

function loadHabits() {
    const h = localStorage.getItem('habits_v3');
    if (h) return JSON.parse(h);
    return [];
}
function saveHabits(h) { localStorage.setItem('habits_v3', JSON.stringify(h)); }

// Always initialize with default habits on app load
saveHabits(getDefaultHabits());

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
    document.getElementById('weeklySummaryEnabled').checked = s.weeklySummaryEnabled;
    document.getElementById('notificationSettings').style.display = s.notificationsEnabled ? 'block' : 'none';
    updateInstallPromptVisibility();
    document.getElementById('settingsOverlay').classList.add('active');
}
function closeSettings() { document.getElementById('settingsOverlay').classList.remove('active'); }
function saveSettings() {
    const settings = {
        morningStart: parseInt(document.getElementById('morningStart').value) || 5,
        nightStart: parseInt(document.getElementById('nightStart').value) || 18,
        sortMethod: document.getElementById('sortMethod').value || 'default',
        notificationsEnabled: document.getElementById('notificationsEnabled').checked,
        morningReminderTime: parseInt(document.getElementById('morningReminderTime').value) || 5,
        nightReminderTime: parseInt(document.getElementById('nightReminderTime').value) || 18,
        weeklySummaryEnabled: document.getElementById('weeklySummaryEnabled').checked
    };
    localStorage.setItem('habit_settings', JSON.stringify(settings));
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
    const habits = loadHabits();
    const todayStr = getTodayString();

    // Count incomplete habits for this period
    const incompleteHabits = habits.filter(h => {
        if (h.timeOfDay && h.timeOfDay !== period) return false;
        if (h.isReminder) return false;
        return !isHabitComplete(h, todayStr, period);
    });

    if (incompleteHabits.length === 0) return;

    const title = period === 'morning' ? 'Morning Routine' : 'Evening Routine';
    const body = `${incompleteHabits.length} habit${incompleteHabits.length > 1 ? 's' : ''} waiting`;

    sendNotification(title, body, `habit-${period}`);
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

    const title = 'Weekly Summary';
    const body = `${onTrack}/${weeklyHabits.length} weekly goals on track`;

    sendNotification(title, body, 'weekly-summary');
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

function sendNotification(title, body, tag) {
    if (swRegistration) {
        // Use service worker for notification
        swRegistration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            body,
            tag,
            data: { url: '/' }
        });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        // Fallback to regular notification
        new Notification(title, { body, tag });
    }
}

// Register service worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service worker registered');
        } catch (err) {
            console.log('Service worker registration failed:', err);
        }
    }
}

function exportData() {
    const data = {
        exportedAt: new Date().toISOString(),
        version: 'habits_v3',
        settings: getSettings(),
        habits: loadHabits()
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habits-export-${getTodayString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    const habits = loadHabits();
    const freqType = getFrequencyType();
    const timesVal = parseInt(document.getElementById('timesPerPeriod')?.value) || DEFAULTS.TIMES_PER_PERIOD;
    const pointsVal = parseInt(document.getElementById('pointsPerPeriod')?.value) || DEFAULTS.POINTS_PER_PERIOD;
    const pointsTargetVal = parseInt(document.getElementById('pointsTarget')?.value) || DEFAULTS.POINTS_TARGET;
    const reminderDaysVal = parseInt(document.getElementById('reminderDays')?.value) || DEFAULTS.REMINDER_DAYS;
    const everyXDaysVal = parseInt(document.getElementById('everyXDays')?.value) || DEFAULTS.EVERY_X_DAYS;
    habits.push({
        id: Date.now(), name,
        icon: formState.icon,
        timeOfDay: formState.time,
        frequency: {
            type: freqType,
            timesPerDay: timesVal,
            timesPerWeek: timesVal,
            timesPerMonth: timesVal,
            everyXDays: everyXDaysVal,
            pointsPerDay: pointsVal,
            pointsPerWeek: pointsVal,
            pointsPerMonth: pointsVal,
            pointsTarget: pointsTargetVal,
            reminderDays: reminderDaysVal
        },
        usePoints: formState.isPointsMode,
        isReminder: formState.isReminderMode,
        allowOptional: formState.allowOptional,
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

function skipHabit(id) {
    const habits = loadHabits();
    const habit = habits.find(h => h.id === id);
    const today = getTodayString();
    if (habit && !habit.skippedDates.includes(today)) {
        habit.skippedDates.push(today);
        saveHabits(habits);
        closeDetails();
        renderHabits();
    }
}

let snoozePopupHabitId = null;

function openSnoozePopup(id) {
    snoozePopupHabitId = id;
    document.getElementById('snoozePopup').innerHTML = `
        <div class="points-popup-header">
            <span class="points-popup-title">Snooze for how long?</span>
        </div>
        <div class="points-popup-buttons">
            <button class="points-btn" onclick="snoozeHabit(1)">1 day</button>
            <button class="points-btn" onclick="snoozeHabit(2)">2 days</button>
            <button class="points-btn" onclick="snoozeHabit(3)">3 days</button>
        </div>
        <div class="points-popup-buttons" style="margin-top:8px">
            <button class="points-btn" onclick="snoozeHabit(7)">1 week</button>
        </div>`;
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
        const snoozeUntil = new Date(getTodayString());
        snoozeUntil.setDate(snoozeUntil.getDate() + days);
        habit.snoozedUntil = toDateString(snoozeUntil);
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
        const target = freqType === FREQ.REMINDER
            ? (habit.frequency.reminderDays || DEFAULTS.REMINDER_DAYS)
            : (habit.frequency.everyXDays || DEFAULTS.EVERY_X_DAYS);
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
        return Math.max(0, daysBetween(last, today) - (habit.frequency.everyXDays || DEFAULTS.EVERY_X_DAYS));
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

// ========================================
// MOMENTUM SCORING
// ========================================

function calculateMomentumScore(habit) {
    const today = getTodayString();
    const freq = habit.frequency;
    const freqType = freq.type;

    // Determine the cycle length for this habit type
    let cycleDays = 1;
    if (freqType === FREQ.DAILY || freqType === FREQ.TWICE_DAILY || freqType === FREQ.POINTS_PER_DAY || freqType === FREQ.TIMES_PER_DAY) cycleDays = 1;
    else if (freqType === FREQ.REMINDER) cycleDays = freq.reminderDays || DEFAULTS.REMINDER_DAYS;
    else if (freqType === FREQ.TIMES_PER_WEEK) cycleDays = 7 / (freq.timesPerWeek || DEFAULTS.TIMES_PER_PERIOD);
    else if (freqType === FREQ.TIMES_PER_MONTH) cycleDays = 30 / (freq.timesPerMonth || DEFAULTS.TIMES_PER_PERIOD);
    else if (freqType === FREQ.EVERY_X_DAYS) cycleDays = freq.everyXDays || DEFAULTS.EVERY_X_DAYS;

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
    if (daysSinceUpdate === 0) {
        return { raw: score, display: getDisplayScore(score) };
    }

    // Apply decay and calculate new score
    const completionDates = new Set(habit.completions.map(c => c.date));

    for (let i = 1; i <= daysSinceUpdate; i++) {
        const checkDate = new Date(lastUpdate);
        checkDate.setDate(checkDate.getDate() + i);
        const checkDateStr = toDateString(checkDate);

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
                score = Math.min(100, score + 15);
            } else {
                // Apply penalty for missed days (reminders get smaller penalty)
                const basePenalty = score < 0 ? Math.max(5, 15 + score * 0.15) : 15;
                const isReminder = habit.isReminder || freqType === FREQ.REMINDER;
                const penalty = isReminder ? basePenalty * 0.5 : basePenalty;
                score = Math.max(-100, score - penalty);
            }
        }

        score = score * 0.97; // Daily decay
    }

    return { raw: Math.round(score), display: getDisplayScore(score) };
}

function wasHabitDueOnDate(habit, dateStr) {
    const freq = habit.frequency;
    const freqType = freq.type;
    if (freqType === FREQ.DAILY || freqType === FREQ.TWICE_DAILY || freqType === FREQ.POINTS_PER_DAY || freqType === FREQ.TIMES_PER_DAY) return true;
    if (freqType === FREQ.TIMES_PER_WEEK || freqType === FREQ.TIMES_PER_MONTH) return true;
    if (freqType === FREQ.EVERY_X_DAYS || freqType === FREQ.REMINDER) {
        const interval = freqType === FREQ.REMINDER
            ? (freq.reminderDays || DEFAULTS.REMINDER_DAYS)
            : (freq.everyXDays || DEFAULTS.EVERY_X_DAYS);
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
        // Update if habit has history (lastScoreUpdate or createdAt) and hasn't been updated today
        const lastUpdate = habit.lastScoreUpdate || habit.createdAt;
        if (lastUpdate && lastUpdate !== today) {
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
        habit.momentumScore = 0;
        habit.lastScoreUpdate = getTodayString();
        saveHabits(habits);
        renderDetails();
        renderHabits();
    }
}

function completeHabit(id, period = null) {
    const habits = loadHabits(), habit = habits.find(h => h.id === id), today = getTodayString();
    if (!habit) return;

    // If habit has subtasks, show popup instead of completing directly
    if (habit.subtasks && habit.subtasks.length > 0) {
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
    } else {
        habit.completions.push({ date: today, period, timestamp: Date.now() });
        // Reset momentum to neutral for reminders when completed
        if (habit.isReminder || freqType === FREQ.REMINDER) {
            habit.momentumScore = 0;
            habit.lastScoreUpdate = today;
        } else if (!habit.lastScoreUpdate) {
            habit.lastScoreUpdate = habit.createdAt || today;
            habit.momentumScore = 0;
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
    if (habit.snoozedUntil) {
        if (habit.snoozedUntil === PERIOD.NIGHT && timeOfDay !== PERIOD.NIGHT) return false;
        if (habit.snoozedUntil !== PERIOD.NIGHT && habit.snoozedUntil > today) return false;
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
    if (!isDueToday(habit)) return false;
    if (habit.timeOfDay === PERIOD.NIGHT && timeOfDay !== PERIOD.NIGHT) return false;
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

    // Night habits during non-night = later
    if (habit.timeOfDay === PERIOD.NIGHT && timeOfDay !== PERIOD.NIGHT) return true;
    // Snoozed habits go to Later
    if (habit.snoozedUntil) {
        if (habit.snoozedUntil === PERIOD.NIGHT && timeOfDay !== PERIOD.NIGHT) return true;
        if (habit.snoozedUntil !== PERIOD.NIGHT && habit.snoozedUntil > today) return true;
    }
    return false;
}

// ========================================
// CATEGORIZATION & RENDERING
// ========================================

function sortHabits(habits) {
    const settings = getSettings();
    const method = settings.sortMethod || 'default';
    if (method === 'default') return habits;
    if (method === 'alphabetical') return [...habits].sort((a, b) => a.name.localeCompare(b.name));
    // 'attention' (and legacy 'overdue'/'score') - sort by momentum score
    if (method === 'attention' || method === 'overdue' || method === 'score') {
        const scoresMap = new Map();
        habits.forEach(h => scoresMap.set(h.id, calculateMomentumScore(h).raw));
        return [...habits].sort((a, b) => scoresMap.get(a.id) - scoresMap.get(b.id));
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
        // For habits with subtasks, also check if there's a completion entry (user may have clicked Complete All)
        const hasCompletionEntry = h.completions.some(c => c.date === getTodayString());
        if (h.timeOfDay === PERIOD.MORNING && timeOfDay === PERIOD.NIGHT && !isCompletedToday(h) && !hasCompletionEntry) {
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

    return { now, optional, later, done, morning, bedtime, anytime, timeOfDay };
}

function renderHabits() {
    const habits = loadHabits(), container = document.getElementById('habitsContainer');
    if (!habits.length) {
        container.innerHTML = '<div class="habits-section"><div class="empty-state"><div class="empty-state-icon">✨</div><div>No habits yet</div></div></div>';
        return;
    }

    const { now: nowHabits, optional: optionalHabits, later: laterHabits, done: completedHabits,
            morning: morningSpecific, bedtime: bedtimeSpecific, anytime: anytimeHabits, timeOfDay } = categorizeHabits(habits);

    // Helper: render a sub-section with header and habits grid
    const subSection = (habits, icon, title) => habits.length
        ? `<div class="sub-header"><span class="sub-header-icon">${icon}</span>${title}</div>
           <div class="habits-grid">${habits.map(h => renderHabitIcon(h)).join('')}</div>`
        : '';

    let html = '';

    // Now section with sub-sections based on time of day
    if (nowHabits.length) {
        let nowContent = '';
        if (timeOfDay === PERIOD.MORNING) {
            nowContent += subSection(morningSpecific, '🌅', 'Morning');
            nowContent += subSection(anytimeHabits, '☀️', 'Anytime');
        } else if (timeOfDay === PERIOD.NIGHT) {
            nowContent += subSection(anytimeHabits, '☀️', 'Anytime');
            nowContent += subSection(bedtimeSpecific, '🌙', 'Bedtime');
        }

        html += `<div class="habits-section">
            <div class="section-header">
                <span class="section-icon">⚡</span>
                <span class="section-title">Now</span>
                <span class="section-count">${nowHabits.length}</span>
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
    html += renderSection(laterHabits, 'later', '🕐', 'Later', true, { inactive: true, isLater: true });
    html += renderSection(completedHabits, 'completed', '✓', 'Finished', true, { inactive: true, isCompleted: true });

    if (!html) html = '<div class="habits-section"><div class="empty-state"><div class="empty-state-icon">✓</div><div>All done!</div></div></div>';
    container.innerHTML = html;
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
    const habitsHtml = habits.map(h => renderHabitIcon(h, renderOpts.isLater, renderOpts.isCompleted)).join('');
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
    // Show neglect indicators if habit has history (lastScoreUpdate or createdAt) and negative score
    const hasHistory = !!(habit.lastScoreUpdate || habit.createdAt);
    const neglectLevel = hasHistory && scoreData.display < 0 ? Math.min(3, Math.abs(scoreData.display)) : 0;
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
        return `<div class="habit-icon-wrapper">
            <div class="habit-icon" onclick="${bothDone ? `openDetails(${habit.id})` : `completeTwiceDaily(${habit.id})`}" oncontextmenu="${rightClick}">
                <div class="habit-ring split ${bothDone ? 'completed' : ''}">
                    <div class="half-fill left ${status.morningDone ? 'filled' : ''}"></div>
                    <div class="half-fill right ${status.nightDone ? 'filled' : ''}"></div>
                    <div class="divider"></div>
                    <span class="habit-emoji">${icon}</span>
                    ${neglectDots}
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

    // Reminder badge for reminder-type habits (subtle dot indicator)
    const isReminder = habit.isReminder || habit.frequency.type === FREQ.REMINDER;
    const reminderBadge = isReminder
        ? '<div class="reminder-badge"></div>' : '';

    return `<div class="habit-icon-wrapper">
        <div class="habit-icon" onclick="${leftClick}" oncontextmenu="${rightClick}">
            <div class="habit-ring ${ringClass}" style="--progress: ${progress}">
                <span class="habit-emoji">${icon}</span>
                ${neglectDots}
                ${reminderBadge}
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
    const timeOfDay = getTimeOfDayNow();
    const period = timeOfDay === PERIOD.NIGHT ? PERIOD.NIGHT : PERIOD.MORNING;

    const existing = habit.completions.find(c => c.date === today && c.period === period);
    if (existing) {
        habit.completions = habit.completions.filter(c => c !== existing);
    } else {
        habit.completions.push({ date: today, period, timestamp: Date.now() });
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
    if (freq === FREQ.DAILY || freq === FREQ.TWICE_DAILY) return today;
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
    if (wasCompleted) {
        delete subtask.completedPeriods[periodKey];
        // When unchecking a subtask, remove today's completion entry since habit is no longer fully done
        const today = getTodayString();
        habit.completions = habit.completions.filter(c => c.date !== today);
    } else {
        subtask.completedPeriods[periodKey] = Date.now();
        // Auto-complete main habit when all subtasks are done
        const allCompleted = habit.subtasks.every(s => s.completedPeriods && s.completedPeriods[periodKey]);
        const today = getTodayString();
        const alreadyCompleted = habit.completions.some(c => c.date === today);

        if (allCompleted && !alreadyCompleted) {
            habit.completions.push({ date: today, timestamp: Date.now() });
            habit.momentumScore = (habit.momentumScore || 0) + 15;
            habit.lastScoreUpdate = today;
        }
    }

    saveHabits(habits);
    renderDetails();
    renderHabits();
}

function addSubtask(habitId) {
    const input = document.getElementById('newSubtaskInput');
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

    // Complete all subtasks
    if (habit.subtasks) {
        habit.subtasks.forEach(s => {
            if (!s.completedPeriods) s.completedPeriods = {};
            s.completedPeriods[periodKey] = Date.now();
        });
    }

    // Complete the habit itself
    habit.completions.push({ date: today, timestamp: Date.now() });
    habit.momentumScore = (habit.momentumScore || 0) + 15;
    habit.lastScoreUpdate = today;

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
    if (wasCompleted) {
        delete subtask.completedPeriods[periodKey];
        // When unchecking a subtask, remove today's completion entry since habit is no longer fully done
        const today = getTodayString();
        habit.completions = habit.completions.filter(c => c.date !== today);
    } else {
        subtask.completedPeriods[periodKey] = Date.now();
    }

    saveHabits(habits);
    renderSubtaskPopup();
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
    const isWeekly = freq.type === FREQ.POINTS_PER_WEEK;
    const target = isWeekly ? (freq.pointsPerWeek || 12) : (freq.pointsPerMonth || 30);
    const period = isWeekly ? PERIOD.WEEK : PERIOD.MONTH;

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
    editMode = false;
    formMode = 'create';
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
    const newName = nameInput ? nameInput.value.trim() : habit.name;
    if (!newName) return;

    habit.name = newName;
    habit.icon = formState.icon || habit.icon || HABIT_EMOJIS[0];
    habit.timeOfDay = formState.time;

    // Use shared frequency type determination
    const finalFreqType = getFrequencyType();
    habit.frequency.type = finalFreqType;
    habit.usePoints = formState.isPointsMode;

    // Save frequency-specific values
    if (finalFreqType === FREQ.TIMES_PER_DAY || finalFreqType === FREQ.TIMES_PER_WEEK || finalFreqType === FREQ.TIMES_PER_MONTH) {
        const input = document.getElementById('editTimesPerPeriod');
        const val = parseInt(input?.value) || DEFAULTS.TIMES_PER_PERIOD;
        habit.frequency.timesPerDay = val;
        habit.frequency.timesPerWeek = val;
        habit.frequency.timesPerMonth = val;
    }
    if (finalFreqType === FREQ.EVERY_X_DAYS) {
        const input = document.getElementById('editEveryXDays');
        habit.frequency.everyXDays = parseInt(input?.value) || DEFAULTS.EVERY_X_DAYS;
        if (formState.isPointsMode) {
            const ptsInput = document.getElementById('editPointsTarget');
            habit.frequency.pointsTarget = parseInt(ptsInput?.value) || DEFAULTS.POINTS_TARGET;
        }
    }
    if (finalFreqType === FREQ.REMINDER) {
        const input = document.getElementById('editReminderDays');
        habit.frequency.reminderDays = parseInt(input?.value) || DEFAULTS.REMINDER_DAYS;
    }
    if (finalFreqType === FREQ.POINTS_PER_DAY || finalFreqType === FREQ.POINTS_PER_WEEK || finalFreqType === FREQ.POINTS_PER_MONTH) {
        const input = document.getElementById('editPointsPerPeriod');
        const val = parseInt(input?.value) || DEFAULTS.POINTS_PER_PERIOD;
        habit.frequency.pointsPerDay = val;
        habit.frequency.pointsPerWeek = val;
        habit.frequency.pointsPerMonth = val;
    }

    // Save subtask visibility preference
    habit.showSubtasksOnMain = formState.hideSubtasksOnMain ? false : undefined;

    // Save allow optional preference
    habit.allowOptional = formState.allowOptional;

    // Save reminder mode flag
    habit.isReminder = formState.isReminderMode;

    saveHabits(habits);
    editMode = false;
    formMode = 'create';
    resetFormState();
    renderDetails();
    renderHabits();
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

        const freqLabel = { daily: 'Daily', reminder: `Every ${habit.frequency.reminderDays || 1} days (gentle)`, twiceDaily: 'Twice daily', timesPerWeek: `${habit.frequency.timesPerWeek || 3}x/week`, timesPerMonth: `${habit.frequency.timesPerMonth || 4}x/month`, everyXDays: `Every ${habit.frequency.everyXDays || 2} days`, pointsPerDay: `${habit.frequency.pointsPerDay || 4} pts/day`, pointsPerWeek: `${habit.frequency.pointsPerWeek || 12} pts/week`, pointsPerMonth: `${habit.frequency.pointsPerMonth || 30} pts/month` }[habit.frequency.type];
        const timeLabel = habit.timeOfDay ? { morning: 'Morning', night: 'Bedtime' }[habit.timeOfDay] : 'Anytime';

        // Momentum score
        const scoreData = calculateMomentumScore(habit);
        const displayScore = scoreData.display;
        const rawScore = scoreData.raw;
        const lastCompletion = getLastCompletionDate(habit);
        const daysSinceCompletion = lastCompletion ? daysBetween(lastCompletion, today) : 999;
        const canFreshStart = daysSinceCompletion >= 60 || displayScore <= -3;

        // Recovery info
        let recoveryText = '';
        if (displayScore < 0) {
            const completionsNeeded = Math.ceil(Math.abs(scoreData.raw) / 15);
            recoveryText = `<div style="color:#888;font-size:0.8rem;margin-top:8px;text-align:center">${completionsNeeded} completion${completionsNeeded > 1 ? 's' : ''} to recover</div>`;
        }

        const scoreClass = rawScore > 0 ? 'positive' : (rawScore < 0 ? 'negative' : 'neutral');
        const icon = habit.icon || '📌';

        // Determine if habit can be completed and how
        const isPointsBased = habit.frequency.type === FREQ.POINTS_PER_WEEK || habit.frequency.type === FREQ.POINTS_PER_MONTH;
        const isTwiceDaily = habit.frequency.type === FREQ.TWICE_DAILY;
        const completedToday = isCompletedToday(habit);
        const status = getCompletionStatus(habit);

        let completeButton = '';
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
        }

        document.getElementById('detailsModal').innerHTML = `
            <div class="modal-header"><span></span><button class="modal-close" onclick="closeDetails()">&times;</button></div>
            <div class="details-icon-header">
                <div class="details-large-icon">${icon}</div>
                <div class="details-habit-name">${escapeHtml(habit.name)}</div>
            </div>
            <div class="momentum-display">
                <div class="momentum-score ${scoreClass}">${rawScore}<span class="momentum-max">/100</span></div>
                <div class="momentum-label">Momentum</div>
            </div>
            <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${timeLabel}</span></div>
            <div class="detail-row"><span class="detail-label">Frequency</span><span class="detail-value">${freqLabel}</span></div>
            ${(habit.frequency.type === FREQ.POINTS_PER_DAY || habit.frequency.type === FREQ.POINTS_PER_WEEK || habit.frequency.type === FREQ.POINTS_PER_MONTH) ? `<div class="detail-row"><span class="detail-label">Progress</span><span class="detail-value">${getCompletionStatus(habit).text}</span></div>` : ''}
            <div class="stats-grid">
                <div class="stat-box"><div class="stat-number">${total}</div><div class="stat-label">Total</div></div>
                <div class="stat-box"><div class="stat-number">${rate}%</div><div class="stat-label">Rate</div></div>
                <div class="stat-box"><div class="stat-number">${avgInterval}</div><div class="stat-label">Avg Gap</div></div>
            </div>
            ${recoveryText}
            <div class="action-buttons">
                <div style="display:flex;gap:6px">
                    ${completeButton || ''}
                    <button class="submit-btn${completeButton ? ' secondary' : ''}" style="flex:1" onclick="toggleEditMode()">Edit</button>
                    ${canSnooze ? `<button class="submit-btn secondary" style="flex:1" onclick="openSnoozePopup(${habit.id})">Snooze</button>` : ''}
                    ${isSnoozed ? `<button class="submit-btn secondary" style="flex:1" onclick="unsnoozeHabit(${habit.id})">Unsnooze</button>` : ''}
                </div>
                <div style="display:flex;gap:6px">
                    <button class="submit-btn secondary" style="flex:1" onclick="skipHabit(${habit.id})">Skip</button>
                    ${canFreshStart ? `<button class="submit-btn secondary" style="flex:1" onclick="freshStartHabit(${habit.id})">Fresh Start</button>` : ''}
                    <button class="submit-btn danger" style="flex:1" onclick="deleteHabit(${habit.id})">Delete</button>
                </div>
            </div>`;
    }
}

// ========================================
// ALL HABITS VIEW
// ========================================

function openAllHabits() {
    renderAllHabits();
    document.getElementById('allHabitsOverlay').classList.add('active');
}

function closeAllHabits() {
    document.getElementById('allHabitsOverlay').classList.remove('active');
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

    // Sort alphabetically for consistent display
    const sorted = [...habits].sort((a, b) => a.name.localeCompare(b.name));

    const habitsHtml = sorted.map(habit => {
        const icon = habit.icon || '📌';
        return `<div class="habit-icon-wrapper">
            <div class="habit-icon" onclick="closeAllHabits();openDetails(${habit.id})">
                <div class="habit-ring" style="--progress: 0%; background: #2a2a3e;">
                    <span class="habit-emoji">${icon}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    modal.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">All Habits</h2>
            <button class="modal-close" onclick="closeAllHabits()">&times;</button>
        </div>
        <div class="habits-grid">${habitsHtml}</div>`;
}

// ========================================
// UTILITIES & TEST DATA
// ========================================

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

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
    // Set time to morning so test data demo makes sense
    debugSetTime('morning');
    renderHabits();
}

function restoreData() {
    if (savedDataBeforeTest !== null) {
        localStorage.setItem('habits_v3', savedDataBeforeTest);
        savedDataBeforeTest = null;
        renderHabits();
    }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDetails(); closeSettings(); closeSubtaskPopup(); closePointsPopup(); closeEmojiPopup(); closeSnoozePopup(); closeAllHabits(); } });

// On first visit (no data), load test data as initial experience
if (!localStorage.getItem('habits_v3')) {
    loadTestData();
}

// Update scores on page load to persist momentum for missed days
updateAllHabitScores();
updateDisplay();

// Initialize PWA and notifications
registerServiceWorker();
if (getSettings().notificationsEnabled) {
    scheduleNotifications();
}