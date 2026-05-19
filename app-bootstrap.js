        // Only initialize with default habits if no habits exist
        if (!localStorage.getItem('habits_v3')) {
            saveHabits(getDefaultHabits());
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
