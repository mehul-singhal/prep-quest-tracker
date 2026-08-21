import { useState, useCallback, useEffect, useRef } from 'react';
import { todayStr, addDays, isoWeekKey, computeRevisitDates } from '../utils/dates.js';
import { getPlayerLevel } from '../utils/levels.js';
import { SEED_WEEK } from '../data/seed.js';

const STORAGE_KEY = 'prepquesttracker_v1';
const SYNC_KEY    = 'prepquesttracker_sync';

let _id = 0;
function genId(pfx) { return `${pfx}-${Date.now()}-${_id++}`; }

function buildRevisitEntries(problems) {
  return problems.map(p => ({
    id: genId('prob'),
    problem: p.problem,
    solvedDate: p.solvedDate,
    difficulty: p.difficulty || null,
    topic: p.topic || null,
    revisits: computeRevisitDates(p.solvedDate).map(date => ({ date, done: false, cold: null })),
  }));
}

function processWeek(w) {
  return { weekNumber: w.weekNumber, world: w.world, theme: w.theme, days: w.days };
}

function computeStreak(checkedCriteria, frozenDates, weeks) {
  const allDays = weeks.flatMap(w => w.days);
  const clearedDates = new Set(
    allDays
      .filter(d => d.acceptanceCriteria.every((_, i) => !!checkedCriteria[`${d.dayNumber}-${i}`]))
      .map(d => d.date)
  );
  const effective = new Set([...clearedDates, ...(frozenDates || [])]);
  if (effective.size === 0) return 0;
  const today = todayStr();
  const yesterday = addDays(today, -1);
  let start = effective.has(today) ? today : effective.has(yesterday) ? yesterday : null;
  if (!start) return 0;
  let streak = 0, check = start;
  while (effective.has(check)) { streak++; check = addDays(check, -1); }
  return streak;
}

function getDefault() {
  return {
    weeks: [processWeek(SEED_WEEK)],
    checkedCriteria: {},
    totalXP: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastClearedDate: null,
    frozenDates: [],
    streakFreezeUsedWeek: null,
    revisitQueue: buildRevisitEntries(SEED_WEEK.newProblemsSolved),
    milestones: {},
    customTasks: {},
    timeBlocks: {},
    dayNotes: {},
    problemNotes: {},
    earlyCompletions: {},
    _updatedAt: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const def = getDefault();
      let weeks = parsed.weeks?.length > 0 ? parsed.weeks : def.weeks;
      let revisitQueue = parsed.revisitQueue || def.revisitQueue;

      // Migrate: re-seed Week 1 if it started before Aug 21
      if (weeks[0]?.days[0]?.date < '2026-08-21') {
        weeks = [processWeek(SEED_WEEK), ...weeks.slice(1)];
        const seedNames = new Set(SEED_WEEK.newProblemsSolved.map(p => p.problem));
        const nonSeed = revisitQueue.filter(p => !seedNames.has(p.problem));
        revisitQueue = [...buildRevisitEntries(SEED_WEEK.newProblemsSolved), ...nonSeed];
      }

      return {
        ...def,
        ...parsed,
        weeks,
        revisitQueue,
        customTasks:      parsed.customTasks      || {},
        timeBlocks:       parsed.timeBlocks       || {},
        dayNotes:         parsed.dayNotes         || {},
        problemNotes:     parsed.problemNotes     || {},
        earlyCompletions: parsed.earlyCompletions || {},
      };
    }
  } catch (e) { console.error('load state failed', e); }
  return getDefault();
}

function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.error('persist failed', e); }
}

export function useAppState({ onSyncNeeded } = {}) {
  const [state, setStateRaw] = useState(() => loadState());
  const syncTimerRef = useRef(null);

  const setState = useCallback((updater) => {
    setStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const stamped = { ...next, _updatedAt: Date.now() };
      persist(stamped);
      if (onSyncNeeded) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => onSyncNeeded(stamped), 5000);
      }
      return stamped;
    });
  }, [onSyncNeeded]);

  // ── Getters ──────────────────────────────────────

  const getAllDays = useCallback(() => state.weeks.flatMap(w => w.days), [state.weeks]);

  const isDayCleared = useCallback((dayNumber) => {
    const day = getAllDays().find(d => d.dayNumber === dayNumber);
    if (!day || day.acceptanceCriteria.length === 0) return false;
    return day.acceptanceCriteria.every((_, i) => !!state.checkedCriteria[`${dayNumber}-${i}`]);
  }, [state.checkedCriteria, getAllDays]);

  const getTodayDay = useCallback(() => {
    return getAllDays().find(d => d.date === todayStr()) || null;
  }, [getAllDays]);

  const getTomorrowDay = useCallback(() => {
    return getAllDays().find(d => d.date === addDays(todayStr(), 1)) || null;
  }, [getAllDays]);

  const getCurrentWeek = useCallback(() => {
    const today = todayStr();
    const sorted = [...state.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
    const containing = sorted.find(w => w.days.some(d => d.date === today));
    if (containing) return containing;
    const past = sorted.filter(w => w.days.some(d => d.date <= today));
    return past.length ? past[past.length - 1] : sorted[0] || null;
  }, [state.weeks]);

  const getDueToday = useCallback(() => {
    const today = todayStr();
    const due = [];
    for (const prob of state.revisitQueue) {
      prob.revisits.forEach((r, idx) => {
        if (!r.done && r.date <= today) due.push({ prob, revisitIdx: idx, revisit: r });
      });
    }
    return due;
  }, [state.revisitQueue]);

  const getWorldXP = useCallback((worldNum) => {
    const allDays = state.weeks.filter(w => w.world === worldNum).flatMap(w => w.days);
    const total  = allDays.reduce((s, d) => s + d.xp, 0);
    const earned = allDays.filter(d => isDayCleared(d.dayNumber)).reduce((s, d) => s + d.xp, 0);
    return { earned, total };
  }, [state.weeks, isDayCleared]);

  const getHoursForDate = useCallback((dateStr) => {
    const blocks = state.timeBlocks[dateStr] || [];
    return blocks.reduce((s, b) => s + (b.endMinutes - b.startMinutes), 0) / 60;
  }, [state.timeBlocks]);

  const getCategoryBreakdown = useCallback((dateRange) => {
    // dateRange: array of date strings to aggregate
    const totals = {};
    for (const d of dateRange) {
      for (const b of (state.timeBlocks[d] || [])) {
        const cat = b.category || 'other';
        totals[cat] = (totals[cat] || 0) + (b.endMinutes - b.startMinutes);
      }
    }
    return totals; // { catId: minutes }
  }, [state.timeBlocks]);

  const getTotalHoursLogged = useCallback(() => {
    let total = 0;
    for (const blocks of Object.values(state.timeBlocks)) {
      for (const b of blocks) total += (b.endMinutes - b.startMinutes);
    }
    return total / 60;
  }, [state.timeBlocks]);

  const getClearedDates = useCallback(() => {
    const allDays = getAllDays();
    return allDays
      .filter(d => isDayCleared(d.dayNumber))
      .map(d => d.date);
  }, [getAllDays, isDayCleared]);

  // Returns 'cleared' | 'partial' | 'unattended' | 'today' | 'future'
  // partial = 2+ tasks done but day not fully cleared
  // unattended = 0-1 tasks done on a past scheduled day
  const getDayStatus = useCallback((dateStr) => {
    const today = todayStr();
    if (dateStr > today) return 'future';
    if (dateStr === today) return 'today';

    const day = getAllDays().find(d => d.date === dateStr);
    if (day && isDayCleared(day.dayNumber)) return 'cleared';

    const criteriaDone = day
      ? day.acceptanceCriteria.filter((_, i) => !!state.checkedCriteria[`${day.dayNumber}-${i}`]).length
      : 0;
    const customDone = (state.customTasks[dateStr] || []).filter(t => t.done).length;
    const totalDone = criteriaDone + customDone;

    // Only mark unattended/partial if there was actually something planned
    const hasDay = !!day && day.acceptanceCriteria.length > 0;
    const hasCustom = (state.customTasks[dateStr] || []).length > 0;
    if (!hasDay && !hasCustom) return '';

    return totalDone >= 2 ? 'partial' : 'unattended';
  }, [getAllDays, isDayCleared, state.checkedCriteria, state.customTasks]);

  // Past days that are not yet cleared — for catch-up display
  const getMissedDays = useCallback(() => {
    const today = todayStr();
    return getAllDays()
      .filter(d => d.date < today && !isDayCleared(d.dayNumber))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [getAllDays, isDayCleared]);

  // Undone custom tasks from past days, for rollover display on today
  const getMissedTasks = useCallback(() => {
    const today = todayStr();
    const missed = [];
    for (const [dateStr, tasks] of Object.entries(state.customTasks)) {
      if (dateStr >= today) continue;
      for (const task of tasks) {
        if (!task.done) missed.push({ ...task, originalDate: dateStr });
      }
    }
    return missed.sort((a, b) => a.originalDate.localeCompare(b.originalDate));
  }, [state.customTasks]);

  // ── Criterion (acceptance criteria) ─────────────

  const EARLY_BONUS_XP = 20;

  const toggleCriterion = useCallback((dayNumber, criterionIdx) => {
    const key = `${dayNumber}-${criterionIdx}`;
    setState(prev => {
      const day = prev.weeks.flatMap(w => w.days).find(d => d.dayNumber === dayNumber);
      if (!day) return prev;
      const wasCleared   = day.acceptanceCriteria.every((_, i) => !!prev.checkedCriteria[`${dayNumber}-${i}`]);
      const newChecked   = { ...prev.checkedCriteria, [key]: !prev.checkedCriteria[key] };
      const isNowCleared = day.acceptanceCriteria.every((_, i) => !!newChecked[`${dayNumber}-${i}`]);
      const isEarlyDay   = day.date > todayStr();

      let totalXP = prev.totalXP;
      let earlyCompletions = prev.earlyCompletions || {};

      if (isNowCleared && !wasCleared) {
        totalXP += day.xp;
        if (isEarlyDay) {
          totalXP += EARLY_BONUS_XP;
          earlyCompletions = { ...earlyCompletions, [dayNumber]: { completedOnDate: todayStr(), bonusXP: EARLY_BONUS_XP } };
        }
      }
      if (!isNowCleared && wasCleared) {
        totalXP = Math.max(0, totalXP - day.xp);
        const prior = earlyCompletions[dayNumber];
        if (prior) {
          totalXP = Math.max(0, totalXP - prior.bonusXP);
          earlyCompletions = { ...earlyCompletions };
          delete earlyCompletions[dayNumber];
        }
      }

      const newStreak = computeStreak(newChecked, prev.frozenDates, prev.weeks);
      return {
        ...prev,
        checkedCriteria: newChecked,
        totalXP,
        earlyCompletions,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastClearedDate: isNowCleared && !wasCleared ? day.date : prev.lastClearedDate,
      };
    });
  }, [setState]);

  // ── Streak freeze ────────────────────────────────

  const canUseFreeze = useCallback(() => {
    return state.streakFreezeUsedWeek !== isoWeekKey(todayStr());
  }, [state.streakFreezeUsedWeek]);

  const activateFreeze = useCallback(() => {
    const today = todayStr();
    const weekKey = isoWeekKey(today);
    setState(prev => {
      if (prev.streakFreezeUsedWeek === weekKey) return prev;
      const yesterday = addDays(today, -1);
      const newFrozen  = [...(prev.frozenDates || []), yesterday];
      const newStreak  = computeStreak(prev.checkedCriteria, newFrozen, prev.weeks);
      return { ...prev, frozenDates: newFrozen, streakFreezeUsedWeek: weekKey, currentStreak: newStreak, longestStreak: Math.max(prev.longestStreak, newStreak) };
    });
  }, [setState]);

  // ── Custom Tasks ─────────────────────────────────

  const addTask = useCallback((dateStr, task) => {
    setState(prev => {
      const existing = prev.customTasks[dateStr] || [];
      return { ...prev, customTasks: { ...prev.customTasks, [dateStr]: [...existing, { id: genId('task'), done: false, ...task }] } };
    });
  }, [setState]);

  const toggleTask = useCallback((dateStr, taskId) => {
    setState(prev => {
      const tasks = (prev.customTasks[dateStr] || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t);
      return { ...prev, customTasks: { ...prev.customTasks, [dateStr]: tasks } };
    });
  }, [setState]);

  const deleteTask = useCallback((dateStr, taskId) => {
    setState(prev => {
      const tasks = (prev.customTasks[dateStr] || []).filter(t => t.id !== taskId);
      return { ...prev, customTasks: { ...prev.customTasks, [dateStr]: tasks } };
    });
  }, [setState]);

  // ── Time Blocks ──────────────────────────────────

  const addTimeBlock = useCallback((dateStr, block) => {
    setState(prev => {
      const existing = prev.timeBlocks[dateStr] || [];
      return { ...prev, timeBlocks: { ...prev.timeBlocks, [dateStr]: [...existing, { id: genId('tb'), ...block }] } };
    });
  }, [setState]);

  const deleteTimeBlock = useCallback((dateStr, blockId) => {
    setState(prev => {
      const blocks = (prev.timeBlocks[dateStr] || []).filter(b => b.id !== blockId);
      return { ...prev, timeBlocks: { ...prev.timeBlocks, [dateStr]: blocks } };
    });
  }, [setState]);

  // ── Revisit Queue ────────────────────────────────

  const markRevisitDone = useCallback((problemId, revisitIdx, cold) => {
    setState(prev => ({
      ...prev,
      revisitQueue: prev.revisitQueue.map(p =>
        p.id === problemId
          ? { ...p, revisits: p.revisits.map((r, i) => i === revisitIdx ? { ...r, done: true, cold } : r) }
          : p
      ),
    }));
  }, [setState]);

  const addManualProblem = useCallback((problem, solvedDate, difficulty, topic) => {
    const entries = buildRevisitEntries([{ problem, solvedDate, difficulty: difficulty || null, topic: topic || null }]);
    setState(prev => ({ ...prev, revisitQueue: [...prev.revisitQueue, ...entries] }));
  }, [setState]);

  // ── Week Import ──────────────────────────────────

  const importWeek = useCallback((weekData) => {
    const processed = processWeek(weekData);
    const newProblems = buildRevisitEntries(weekData.newProblemsSolved || []);
    setState(prev => {
      const exists = prev.weeks.find(w => w.weekNumber === weekData.weekNumber);
      const weeks  = exists
        ? prev.weeks.map(w => w.weekNumber === weekData.weekNumber ? processed : w)
        : [...prev.weeks, processed].sort((a, b) => a.weekNumber - b.weekNumber);
      const existingKeys = new Set(prev.revisitQueue.map(p => `${p.problem}|${p.solvedDate}`));
      const fresh = newProblems.filter(p => !existingKeys.has(`${p.problem}|${p.solvedDate}`));
      return { ...prev, weeks, revisitQueue: [...prev.revisitQueue, ...fresh] };
    });
  }, [setState]);

  // ── Notes ────────────────────────────────────────

  const updateDayNote = useCallback((dateStr, text) => {
    setState(prev => ({ ...prev, dayNotes: { ...prev.dayNotes, [dateStr]: text } }));
  }, [setState]);

  const updateProblemNote = useCallback((problemId, text) => {
    setState(prev => ({ ...prev, problemNotes: { ...prev.problemNotes, [problemId]: text } }));
  }, [setState]);

  // ── Milestones ───────────────────────────────────

  const toggleMilestone = useCallback((key) => {
    setState(prev => ({ ...prev, milestones: { ...prev.milestones, [key]: !prev.milestones[key] } }));
  }, [setState]);

  // ── Backup ───────────────────────────────────────

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prep-quest-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const importData = useCallback((jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.weeks || !Array.isArray(parsed.weeks)) return { ok: false, error: 'Invalid backup: missing "weeks" array.' };
      setState({ ...getDefault(), ...parsed, customTasks: parsed.customTasks || {}, timeBlocks: parsed.timeBlocks || {} });
      return { ok: true };
    } catch (e) { return { ok: false, error: `JSON parse error: ${e.message}` }; }
  }, [setState]);

  // ── Weekly Report for Claude ─────────────────────

  const exportWeeklyReport = useCallback(() => {
    const week = getCurrentWeek();
    if (!week) return 'No active week.';

    const lines = [];
    lines.push(`# Prep Quest — Week ${week.weekNumber} Report`);
    lines.push(`Theme: ${week.theme}`);
    lines.push('');

    lines.push('## Day-by-Day Progress');
    const today = todayStr();
    for (const day of week.days) {
      const cleared = isDayCleared(day.dayNumber);
      const critDone = day.acceptanceCriteria.filter((_, i) => !!state.checkedCriteria[`${day.dayNumber}-${i}`]).length;
      const total = day.acceptanceCriteria.length;
      let status;
      if (cleared)           status = 'CLEARED ✓';
      else if (day.date > today)  status = 'upcoming';
      else if (day.date === today) status = 'today (in progress)';
      else if (critDone === 0)     status = 'NOT DONE';
      else                         status = `PARTIAL (${critDone}/${total} criteria)`;

      lines.push(`### Day ${day.dayNumber} — ${day.label}`);
      lines.push(`Objective: ${day.objective}`);
      lines.push(`Status: ${status}`);
      for (let i = 0; i < day.acceptanceCriteria.length; i++) {
        const done = !!state.checkedCriteria[`${day.dayNumber}-${i}`];
        lines.push(`  ${done ? '[x]' : '[ ]'} ${day.acceptanceCriteria[i]}`);
      }
      const note = state.dayNotes[day.date];
      if (note) lines.push(`Note: ${note}`);
      lines.push('');
    }

    // Custom tasks for this week's dates
    const weekDates = new Set(week.days.map(d => d.date));
    const weekTasks = [];
    for (const [dateStr, tasks] of Object.entries(state.customTasks)) {
      if (!weekDates.has(dateStr)) continue;
      for (const t of tasks) weekTasks.push({ dateStr, ...t });
    }
    if (weekTasks.length > 0) {
      lines.push('## Custom Tasks');
      for (const t of weekTasks.sort((a, b) => a.dateStr.localeCompare(b.dateStr))) {
        lines.push(`  ${t.done ? '[x]' : '[ ]'} ${t.title} (${t.dateStr})`);
      }
      lines.push('');
    }

    // DSA problems solved this week
    const weekProblems = state.revisitQueue.filter(p => weekDates.has(p.solvedDate));
    if (weekProblems.length > 0) {
      lines.push('## DSA Problems Solved This Week');
      for (const p of weekProblems) {
        const tags = [p.difficulty, p.topic].filter(Boolean).join(', ');
        lines.push(`  - ${p.problem}${tags ? ` (${tags})` : ''}`);
      }
      lines.push('');
    }

    lines.push(`Total XP: ${state.totalXP} | Streak: ${state.currentStreak} days`);
    return lines.join('\n');
  }, [state, getCurrentWeek, isDayCleared]);

  // ── DSA Export for Claude ────────────────────────

  const exportDSALog = useCallback(() => {
    const problems = state.revisitQueue.map(p => {
      const parts = [`- ${p.problem} (solved ${p.solvedDate}`];
      if (p.difficulty) parts[0] += `, ${p.difficulty}`;
      if (p.topic)      parts[0] += `, ${p.topic}`;
      parts[0] += ')';
      return parts[0];
    });
    return `DSA Problems tracked (${problems.length} total):\n${problems.join('\n')}`;
  }, [state.revisitQueue]);

  return {
    state,
    getAllDays,
    getTodayDay,
    getTomorrowDay,
    getCurrentWeek,
    isDayCleared,
    toggleCriterion,
    canUseFreeze,
    activateFreeze,
    addTask,
    toggleTask,
    deleteTask,
    addTimeBlock,
    deleteTimeBlock,
    markRevisitDone,
    addManualProblem,
    importWeek,
    toggleMilestone,
    exportData,
    importData,
    exportDSALog,
    exportWeeklyReport,
    getDueToday,
    getWorldXP,
    getHoursForDate,
    getCategoryBreakdown,
    getTotalHoursLogged,
    getClearedDates,
    getDayStatus,
    getMissedDays,
    getMissedTasks,
    updateDayNote,
    updateProblemNote,
    getPlayerLevel: () => getPlayerLevel(state.totalXP),
  };
}
