// ========================================
// DEFAULT HABITS
// ========================================
// Seed data loaded when the app has no saved habits (or when the user
// explicitly resets to defaults). Depends on getTodayString() from app.js;
// since this function is invoked lazily, script load order is not critical
// as long as both files are loaded before the call.

function getDefaultHabits() {
    const today = getTodayString();
    return [
        { id: 2, name: 'Shower', icon: '🚿', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2, everyXWeeks: null, everyXMonths: null }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: 'Use towel to push up hair', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 36, name: 'Brush teeth', icon: '🦷', timeOfDay: null, frequency: { type: 'twiceDaily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1, name: 'Use teeth whitening toothpaste', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 3, name: 'Strength training', icon: '🏋️‍♂️', timeOfDay: null, frequency: { type: 'pointsPerWeek', pointsPerWeek: 8, pointsPerDay: 8, pointsPerMonth: 8 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: true, allowOptional: false, isReminder: false, isLarge: true, description: '', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 37, name: 'Social Events', icon: '🎉', timeOfDay: null, frequency: { type: 'pointsPerWeek', pointsPerWeek: 5 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: true, allowOptional: true, isReminder: false, isLarge: true },
        { id: 8, name: 'Shave', icon: '🪒', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2, everyXWeeks: null, everyXMonths: null }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1, name: 'Main cheeks - 3.5+, lower for sideburns', completedPeriods: {} },
            { id: 2, name: 'Mustache - 1.0', completedPeriods: {} },
            { id: 3, name: 'Under chin - 1.6', completedPeriods: {} },
            { id: 4, name: 'Top cheeks - Fade into skin', completedPeriods: {} },
            { id: 5, name: 'Bottom cheeks - Detail trimmer to even out', completedPeriods: {} },
            { id: 6, name: 'Neck edges - One blade, hair stops at chin bend (especially near ears)', completedPeriods: {} },
            { id: 7, name: 'Details trimmer on top of mustache', completedPeriods: {} },
            { id: 1777085976571, name: 'Keep sideburns down to bottom of ears at 5.0', completedPeriods: {} },
            { id: 1777086489835, name: 'Transition sideburns into beard with middle lengths', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false, description: 'Beard max 4.0. One blade = near full shave (good for edges).', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 10, name: 'Vitamins: Biotin', icon: '🍬', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 11, name: 'Set alarms', icon: '⏰', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 38, name: 'Floss', icon: '🧵', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 39, name: 'Journal', icon: '📓', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 41, name: 'Add new songs', icon: '🎵', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 42, name: 'Schedule haircut', icon: '💇', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: 'Get a 1.5 on the sides and back, with a 1.5 fade in the middle of the sides' },
        { id: 43, name: 'Grocery shopping', icon: '🛒', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 13, name: 'Lip balm', icon: '👄', timeOfDay: 'night', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 14, name: 'Dandruff shampoo', icon: '🧴', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2, everyXWeeks: null, everyXMonths: null }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1, name: 'Run hands through scalp', completedPeriods: {} },
            { id: 2, name: 'Puff up hair with hand towel', completedPeriods: {} },
            { id: 1776757317406, name: 'After shower, pull up front hairs with fingers', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: '', isNegative: false, confirmDescription: false, autoCompletes: '2' },
        { id: 15, name: 'Hair helmet', icon: '🪖', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 18, name: 'Hand Exercises', icon: '✋', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 20, name: 'Weekly routine', icon: '📅', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 1 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
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
        { id: 24, name: 'Dandruff', icon: '❄️', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 2 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 25, name: 'Rogaine', icon: '🌱', timeOfDay: null, frequency: { type: 'twiceDaily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 26, name: 'Sunscreen (other than SPF moisturizer)', icon: '🏖️', timeOfDay: 'morning', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false, description: '', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 28, name: 'Body Measurements', icon: '📏', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 1, everyXDays: null, everyXMonths: null }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1, name: 'Weight', completedPeriods: {} },
            { id: 3, name: 'Lean body mass', completedPeriods: {} },
            { id: 2, name: 'Body Fat Percentage', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false, description: 'Use app to read measurements while standing on it instead of the screen on the scale', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 29, name: 'Optional medicine', icon: '💧', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1, name: 'Peroxyl', completedPeriods: {} },
            { id: 2, name: 'Acne cream', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 30, name: 'Protein', icon: '🥩', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 32, name: 'Close tabs', icon: '🗂️', timeOfDay: null, frequency: { type: 'timesPerWeek', timesPerWeek: 1 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 33, name: 'Hair management', icon: '✂️', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2, everyXDays: null, everyXMonths: null }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1777090286860, name: 'Oneblade on forehead', completedPeriods: {} },
            { id: 5, name: 'Forehead hair plucking', completedPeriods: {} },
            { id: 1, name: 'Cut hair', completedPeriods: {} },
            { id: 2, name: 'Clean dandruff', completedPeriods: {} },
            { id: 4, name: 'Nose hairs', completedPeriods: {} },
            { id: 6, name: 'Eyebrow plucking', completedPeriods: {} },
            { id: 7, name: 'Trim eyebrows with scissors', completedPeriods: {} },
            { id: 1777096088684, name: 'Trim down there, with oneblade', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false, description: '', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 34, name: 'Cut fingernails', icon: '💅', timeOfDay: null, frequency: { type: 'timesPerWeek', timesPerWeek: 1 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 35, name: 'Cut toenails', icon: '🦶', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 44, name: 'Face routine', icon: '🧼', timeOfDay: null, frequency: { type: 'twiceDaily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1, name: 'Cleanse', completedPeriods: {} },
            { id: 2, name: 'Moisturize (AM with sunscreen, PM at night)', completedPeriods: {} },
            { id: 3, name: 'Eye cream', completedPeriods: {} },
            { id: 4, name: 'Hairline', completedPeriods: {} },
            { id: 1776330395606, name: 'Eyebrows', completedPeriods: {} },
            { id: 1776927148886, name: 'Ears', completedPeriods: {} },
            { id: 1777044570006, name: 'Mouth corners', completedPeriods: {} },
            { id: 1776929283571, name: 'Hands (when finished)', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: 'Cleanse gently, pat skin slightly damp, apply moisturizer while damp, let it absorb, then apply your prescribed topical treatment to affected areas', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 45, name: 'Dress well', icon: '🎩', timeOfDay: 'morning', frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 46, name: 'Get sun to tan', icon: '☀️', timeOfDay: null, frequency: { type: 'everyXDays', everyXMonths: 1 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 47, name: 'Cut chest hair', icon: '🪮', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 2, everyXDays: null, everyXMonths: null }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1, name: 'cut top, with oneblade, for polo shirts', completedPeriods: {} },
            { id: 1776326887214, name: 'Cut the bottom too, on abs area, with about a 3.0', completedPeriods: {} },
            { id: 1776327114362, name: 'On bottom at least, shave side to side with the head flat', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: 'Your chest does not have enough hair coverage for it took look good, similar to having a beard too long, so shorter on chest is better', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 48, name: 'Limit calorie intake', icon: '🍽️', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 49, name: 'Leaning forward in work desk', icon: '🪑', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 3 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 50, name: 'Conditioner for beard', icon: '🌳', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 3 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 51, name: 'Get good profile photos, new outfits', icon: '📱', timeOfDay: null, frequency: { type: 'everyXDays', everyXWeeks: 1 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 52, name: 'Walk with good posture', icon: '🚶', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 5 }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: true, isLarge: false },
        { id: 54, name: 'Check chats', icon: '📝', timeOfDay: null, frequency: { type: 'everyXDays', everyXDays: 3, everyXWeeks: null, everyXMonths: null }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1, name: 'Mountain Jew', completedPeriods: {} },
            { id: 2, name: 'Add other chats to this list?', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: '', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 55, name: 'Dermodex', icon: '🧽', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false },
        { id: 56, name: 'Body moisturizer', icon: '💪', timeOfDay: null, frequency: { type: 'daily' }, completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 3, name: 'Chest', completedPeriods: {} },
            { id: 1776330906181, name: 'Back of arms (maybe use different cream)', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today, usePoints: false, allowOptional: false, isReminder: false, isLarge: false, description: '', isNegative: false, confirmDescription: false, autoCompletes: '' },
        { id: 1776440242185, name: 'Laundry', description: '', icon: '📖', timeOfDay: null, frequency: { type: 'everyXDays', timesPerDay: 3, timesPerWeek: 3, timesPerMonth: 3, everyXDays: null, everyXWeeks: 1, everyXMonths: null, pointsPerDay: 12, pointsPerWeek: 12, pointsPerMonth: 12, pointsTarget: 5, reminderDays: 3 }, usePoints: false, isReminder: true, allowOptional: false, isLarge: false, isNegative: false, confirmDescription: false, autoCompletes: '', completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today },
        { id: 1776531693539, name: 'Hair serum', description: '', icon: '🪴', timeOfDay: null, frequency: { type: 'twiceDaily', timesPerDay: 3, timesPerWeek: 3, timesPerMonth: 3, everyXDays: 2, everyXWeeks: null, everyXMonths: null, pointsPerDay: 12, pointsPerWeek: 12, pointsPerMonth: 12, pointsTarget: 5, reminderDays: 3 }, usePoints: false, isReminder: false, allowOptional: false, isLarge: false, isNegative: false, confirmDescription: false, autoCompletes: '', completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today },
        { id: 1776927120479, name: 'Clean glasses, with spray', description: '', icon: '💻', timeOfDay: null, frequency: { type: 'daily', timesPerDay: 3, timesPerWeek: 3, timesPerMonth: 3, everyXDays: 2, everyXWeeks: null, everyXMonths: null, pointsPerDay: 12, pointsPerWeek: 12, pointsPerMonth: 12, pointsTarget: 5, reminderDays: 3 }, usePoints: false, isReminder: false, allowOptional: false, isLarge: false, isNegative: false, confirmDescription: false, autoCompletes: '', completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today },
        { id: 1776936635163, name: 'Cardio', description: '', icon: '🏃', timeOfDay: null, frequency: { type: 'everyXDays', timesPerDay: 3, timesPerWeek: 3, timesPerMonth: 3, everyXDays: null, everyXWeeks: 1, everyXMonths: null, pointsPerDay: 12, pointsPerWeek: 12, pointsPerMonth: 12, pointsTarget: 5, reminderDays: 3 }, usePoints: false, isReminder: false, allowOptional: false, isLarge: false, isNegative: false, confirmDescription: false, autoCompletes: '', completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today },
        { id: 1776936737690, name: 'Check pants zipper', description: '', icon: '🛠️', timeOfDay: null, frequency: { type: 'everyXDays', timesPerDay: 3, timesPerWeek: 3, timesPerMonth: 3, everyXDays: null, everyXWeeks: 1, everyXMonths: null, pointsPerDay: 12, pointsPerWeek: 12, pointsPerMonth: 12, pointsTarget: 5, reminderDays: 3 }, usePoints: false, isReminder: true, allowOptional: false, isLarge: false, isNegative: false, confirmDescription: false, autoCompletes: '', completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [], createdAt: today, momentumScore: 0, lastScoreUpdate: today },
        { id: 1777095832486, name: 'Joint strength', description: '', icon: '✏️', timeOfDay: null, frequency: { type: 'everyXDays', timesPerDay: 3, timesPerWeek: 3, timesPerMonth: 3, everyXDays: 3, everyXWeeks: null, everyXMonths: null, pointsPerDay: 12, pointsPerWeek: 12, pointsPerMonth: 12, pointsTarget: 5, reminderDays: 3 }, usePoints: false, isReminder: true, allowOptional: false, isLarge: false, isNegative: false, confirmDescription: false, autoCompletes: '', completions: [], skippedDates: [], snoozedUntil: null, snoozeHistory: [], subtasks: [
            { id: 1777095869280, name: 'Knees, leg machine', completedPeriods: {} },
            { id: 1777095880565, name: 'Elbows, with air machine', completedPeriods: {} }
        ], createdAt: today, momentumScore: 0, lastScoreUpdate: today }
    ];
}
