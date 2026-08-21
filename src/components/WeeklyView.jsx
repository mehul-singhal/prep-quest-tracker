import { useState } from 'react';
import { todayStr, formatMinutes } from '../utils/dates.js';
import { FullQuestCard } from './Dashboard.jsx';

export default function WeeklyView({ app }) {
  const { state, getCurrentWeek, isDayCleared, toggleCriterion, getDueToday, getAllDays } = app;
  const [weekIdx,    setWeekIdx]    = useState(() => {
    const cw = getCurrentWeek();
    if (!cw) return 0;
    const i = state.weeks.findIndex(w => w.weekNumber === cw.weekNumber);
    return i >= 0 ? i : 0;
  });
  const [selectedDay, setSelectedDay] = useState(null);

  const sorted = [...state.weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📅</div>
        <p>No weeks loaded. Tap ＋ to import a week.</p>
      </div>
    );
  }

  const displayWeek = sorted[weekIdx] || sorted[0];
  const today     = todayStr();
  const dueToday  = getDueToday();

  function handleDayClick(day) {
    setSelectedDay(sd => sd?.dayNumber === day.dayNumber ? null : day);
  }

  return (
    <div>
      {/* Week selector */}
      {sorted.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setWeekIdx(i => Math.max(0, i - 1)); setSelectedDay(null); }} disabled={weekIdx === 0}>◀</button>
          <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>Week {displayWeek.weekNumber}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setWeekIdx(i => Math.min(sorted.length - 1, i + 1)); setSelectedDay(null); }} disabled={weekIdx === sorted.length - 1}>▶</button>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <span className="tag tag-world" style={{ marginRight: 8 }}>World {displayWeek.world}</span>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{displayWeek.theme}</span>
      </div>

      <div className="week-grid">
        {displayWeek.days.map((day, idx) => {
          const cleared    = isDayCleared(day.dayNumber);
          const isToday    = day.date === today;
          const isPast     = day.date < today;
          const isSelected = selectedDay?.dayNumber === day.dayNumber;

          return (
            <div key={day.dayNumber} style={{ animationDelay: `${idx * 0.03}s` }}>
              <div
                className={`day-card ${cleared ? 'cleared' : ''} ${isToday ? 'today-card' : ''}`}
                onClick={() => handleDayClick(day)}
                style={{ outline: isSelected ? '2px solid var(--accent)' : 'none', outlineOffset: 2 }}
              >
                <div className="day-card-label">
                  Day {day.dayNumber}
                  {isToday && <span style={{ color: 'var(--accent-hi)', marginLeft: 4 }}>· Today</span>}
                </div>
                <div className="day-card-objective">{day.objective}</div>
                <div className="day-card-footer">
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatMinutes(day.timeBudgetMinutes)}</span>
                  {cleared
                    ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ Cleared</span>
                    : isPast && !isToday
                      ? <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Missed</span>
                      : <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>+{day.xp} XP</span>
                  }
                </div>
              </div>

              {isSelected && (
                <div style={{ marginTop: 8, marginBottom: 4 }}>
                  <FullQuestCard
                    day={day}
                    checkedCriteria={state.checkedCriteria}
                    isDayCleared={isDayCleared}
                    toggleCriterion={toggleCriterion}
                    dueRevisits={isToday ? dueToday : []}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
