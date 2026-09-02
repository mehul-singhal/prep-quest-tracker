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

      // Migrate: replace old Week 1 seed that had Two Pointers problems (Two Sum II, Valid Palindrome)
      // instead of staying within Arrays & Hashing for the full week
      const OLD_WEEK1_PROBLEMS = new Set([
        'Two Sum', 'Contains Duplicate', 'Two Sum II', 'Valid Palindrome',
        'Group Anagrams', 'Best Time to Buy and Sell Stock', 'Top K Frequent Elements',
      ]);
      const hasOldSeed = weeks[0]?.days[1]?.acceptanceCriteria?.some(c => c.includes('Two Sum II'));
      if (hasOldSeed) {
        weeks = [processWeek(SEED_WEEK), ...weeks.slice(1)];
        const nonSeed = revisitQueue.filter(p => !OLD_WEEK1_PROBLEMS.has(p.problem));
        revisitQueue = [...buildRevisitEntries(SEED_WEEK.newProblemsSolved), ...nonSeed];
      }

      // Migration: restore correct Week 1 (Aug 21 start, Two Sum Day 1, Contains Duplicate Day 2).
      // isBrokenSeed: bc2924d (Aug 22 start) or f187ffd (Aug 21 + Day 5 had 4 criteria) → full reset.
      // isMissingQueue: correct seed but W1 queue entries were stripped → queue rebuild only.
      const isBrokenSeed =
        weeks[0]?.days[0]?.date === '2026-08-22' ||
        (weeks[0]?.days[0]?.date === '2026-08-21' &&
         weeks[0]?.days[1]?.date !== '2026-08-29' &&
         weeks[0]?.days[4]?.acceptanceCriteria?.length === 4);
      const isMissingQueue =
        weeks[0]?.days[0]?.date === '2026-08-21' &&
        weeks[0]?.days[1]?.date === '2026-08-22' &&
        !revisitQueue.some(p => p.problem === 'Group Anagrams');
      if (isBrokenSeed || isMissingQueue) {
        weeks = [processWeek(SEED_WEEK), ...weeks.slice(1)];
        const W1_PROBLEMS = new Set([
          'Two Sum', 'Contains Duplicate', 'Valid Anagram', 'Group Anagrams',
          'Top K Frequent Elements', 'Product of Array Except Self', 'Longest Consecutive Sequence',
        ]);
        const nonW1 = revisitQueue.filter(p => !W1_PROBLEMS.has(p.problem));
        const allW1Entries = buildRevisitEntries([
          { problem: 'Two Sum',                     solvedDate: '2026-08-21' },
          { problem: 'Contains Duplicate',           solvedDate: '2026-08-22' },
          { problem: 'Valid Anagram',                solvedDate: '2026-08-22' },
          { problem: 'Group Anagrams',               solvedDate: '2026-08-24' },
          { problem: 'Top K Frequent Elements',      solvedDate: '2026-08-25' },
          { problem: 'Product of Array Except Self', solvedDate: '2026-08-26' },
          { problem: 'Longest Consecutive Sequence', solvedDate: '2026-08-27' },
        ]);
        allW1Entries[0].confirmedDate = '2026-08-21'; // Two Sum
        allW1Entries[1].confirmedDate = '2026-08-22'; // Contains Duplicate
        revisitQueue = [...allW1Entries, ...nonW1];

        if (isBrokenSeed) {
          const kept = {};
          for (const [k, v] of Object.entries(parsed.checkedCriteria || {})) {
            const dn = parseInt(k.split('-')[0], 10);
            if (dn >= 1 && dn <= 7) continue;
            kept[k] = v;
          }
          kept['1-0'] = true;
          kept['1-1'] = true;
          kept['1-2'] = true;
          kept['2-2'] = true;
          parsed.checkedCriteria = kept;
          parsed.totalXP = 65;
          parsed.currentStreak = 0;
          parsed.longestStreak = Math.max(parsed.longestStreak || 0, 1);
          parsed.lastClearedDate = '2026-08-21';
          const newEarly = {};
          for (const [k, v] of Object.entries(parsed.earlyCompletions || {})) {
            const dn = parseInt(k, 10);
            if (dn >= 1 && dn <= 7) continue;
            newEarly[k] = v;
          }
          parsed.earlyCompletions = newEarly;
        }
      }

      // Migration: user resumed Aug 29 after break; shift days 2-7 forward.
      // Detects old Day 2 date (Aug 22); one-shot — after migration Day 2 is Aug 29.
      const isDateShifted =
        weeks[0]?.days[0]?.date === '2026-08-21' &&
        weeks[0]?.days[1]?.date === '2026-08-22';
      if (isDateShifted) {
        weeks = [processWeek(SEED_WEEK), ...weeks.slice(1)];
        const W1_PROBLEMS = new Set([
          'Two Sum', 'Contains Duplicate', 'Valid Anagram', 'Group Anagrams',
          'Top K Frequent Elements', 'Product of Array Except Self', 'Longest Consecutive Sequence',
        ]);
        const nonW1 = revisitQueue.filter(p => !W1_PROBLEMS.has(p.problem));
        const allW1Entries = buildRevisitEntries([
          { problem: 'Two Sum',                     solvedDate: '2026-08-21' },
          { problem: 'Contains Duplicate',           solvedDate: '2026-08-29' },
          { problem: 'Valid Anagram',                solvedDate: '2026-08-29' },
          { problem: 'Group Anagrams',               solvedDate: '2026-08-31' },
          { problem: 'Top K Frequent Elements',      solvedDate: '2026-09-01' },
          { problem: 'Product of Array Except Self', solvedDate: '2026-09-02' },
          { problem: 'Longest Consecutive Sequence', solvedDate: '2026-09-03' },
        ]);
        allW1Entries[0].confirmedDate = '2026-08-21'; // Two Sum — only actually solved so far
        revisitQueue = [...allW1Entries, ...nonW1];
        const kept = {};
        for (const [k, v] of Object.entries(parsed.checkedCriteria || {})) {
          const dn = parseInt(k.split('-')[0], 10);
          if (dn >= 2 && dn <= 7) continue;
          kept[k] = v;
        }
        kept['1-0'] = true;
        kept['1-1'] = true;
        kept['1-2'] = true;
        parsed.checkedCriteria = kept;
        parsed.totalXP = 65;
        parsed.currentStreak = 0;
        parsed.longestStreak = Math.max(parsed.longestStreak || 0, 1);
        parsed.lastClearedDate = '2026-08-21';
        const newEarly = {};
        for (const [k, v] of Object.entries(parsed.earlyCompletions || {})) {
          const dn = parseInt(k, 10);
          if (dn >= 2 && dn <= 7) continue;
          newEarly[k] = v;
        }
        parsed.earlyCompletions = newEarly;
      }

      // Migration: isDateShifted previously ran but only kept Two Sum; add remaining W1 planned problems.
      // Detects Aug 29 Day 2 (post-shift) without Contains Duplicate in queue.
      const isQueueMissingPlanned =
        weeks[0]?.days[0]?.date === '2026-08-21' &&
        weeks[0]?.days[1]?.date === '2026-08-29' &&
        !revisitQueue.some(p => p.problem === 'Contains Duplicate');
      if (isQueueMissingPlanned) {
        const W1_PROBLEMS = new Set([
          'Two Sum', 'Contains Duplicate', 'Valid Anagram', 'Group Anagrams',
          'Top K Frequent Elements', 'Product of Array Except Self', 'Longest Consecutive Sequence',
        ]);
        const nonW1 = revisitQueue.filter(p => !W1_PROBLEMS.has(p.problem));
        const existingTwoSum = revisitQueue.find(p => p.problem === 'Two Sum');
        const allW1Entries = buildRevisitEntries([
          { problem: 'Two Sum',                     solvedDate: '2026-08-21' },
          { problem: 'Contains Duplicate',           solvedDate: '2026-08-29' },
          { problem: 'Valid Anagram',                solvedDate: '2026-08-29' },
          { problem: 'Group Anagrams',               solvedDate: '2026-08-31' },
          { problem: 'Top K Frequent Elements',      solvedDate: '2026-09-01' },
          { problem: 'Product of Array Except Self', solvedDate: '2026-09-02' },
          { problem: 'Longest Consecutive Sequence', solvedDate: '2026-09-03' },
        ]);
        if (existingTwoSum?.confirmedDate) allW1Entries[0].confirmedDate = existingTwoSum.confirmedDate;
        else allW1Entries[0].confirmedDate = '2026-08-21';
        revisitQueue = [...allW1Entries, ...nonW1];
      }

      // Migration: W1 queue has old solvedDates (Aug 22-27 schedule) but week already has new schedule (Day 2 = Aug 29).
      // importData from gist bypasses loadState, so this can arrive undetected by earlier migrations.
      const hasOldQueueDates =
        weeks[0]?.days[1]?.date === '2026-08-29' &&
        revisitQueue.some(p => p.problem === 'Contains Duplicate' && p.solvedDate < '2026-08-29');
      if (hasOldQueueDates) {
        const W1_PROBLEMS = new Set([
          'Two Sum', 'Contains Duplicate', 'Valid Anagram', 'Group Anagrams',
          'Top K Frequent Elements', 'Product of Array Except Self', 'Longest Consecutive Sequence',
        ]);
        const nonW1 = revisitQueue.filter(p => !W1_PROBLEMS.has(p.problem));
        const confirmedByProblem = {};
        for (const p of revisitQueue) {
          if (p.confirmedDate) confirmedByProblem[p.problem] = p.confirmedDate;
        }
        const allW1Entries = buildRevisitEntries([
          { problem: 'Two Sum',                     solvedDate: '2026-08-21' },
          { problem: 'Contains Duplicate',           solvedDate: '2026-08-29' },
          { problem: 'Valid Anagram',                solvedDate: '2026-08-29' },
          { problem: 'Group Anagrams',               solvedDate: '2026-08-31' },
          { problem: 'Top K Frequent Elements',      solvedDate: '2026-09-01' },
          { problem: 'Product of Array Except Self', solvedDate: '2026-09-02' },
          { problem: 'Longest Consecutive Sequence', solvedDate: '2026-09-03' },
        ]);
        for (const entry of allW1Entries) {
          if (confirmedByProblem[entry.problem]) entry.confirmedDate = confirmedByProblem[entry.problem];
        }
        if (!allW1Entries[0].confirmedDate) allW1Entries[0].confirmedDate = '2026-08-21';
        revisitQueue = [...allW1Entries, ...nonW1];
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
      const wasChecked   = !!prev.checkedCriteria[key];
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

      // When checking (not unchecking) a criterion, see if its text contains a
      // problem name from the revisit queue and stamp confirmedDate on it.
      let revisitQueue = prev.revisitQueue;
      if (!wasChecked) {
        const criterionText = (day.acceptanceCriteria[criterionIdx] || '').toLowerCase();
        revisitQueue = prev.revisitQueue.map(p =>
          !p.confirmedDate && criterionText.includes(p.problem.toLowerCase())
            ? { ...p, confirmedDate: todayStr() }
            : p
        );
      }

      const newStreak = computeStreak(newChecked, prev.frozenDates, prev.weeks);
      return {
        ...prev,
        checkedCriteria: newChecked,
        totalXP,
        earlyCompletions,
        revisitQueue,
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
      // Persist first so loadState migrations run on the imported data
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch {}
      setState(loadState());
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
