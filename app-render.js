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
