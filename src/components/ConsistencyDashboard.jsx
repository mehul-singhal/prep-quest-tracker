import { useMemo } from 'react';
import { todayStr, addDays } from '../utils/dates.js';
import { CATEGORIES } from '../utils/categories.js';

function lastNDates(n) {
  const t = todayStr();
  return Array.from({ length: n }, (_, i) => addDays(t, -(n - 1 - i)));
}

export default function ConsistencyDashboard({ app }) {
  const { state, getClearedDates, getHoursForDate, getCategoryBreakdown, getTotalHoursLogged, getDayStatus } = app;

  const today  = todayStr();
  const last90 = useMemo(() => lastNDates(90), []);
  const last14 = useMemo(() => lastNDates(14), []);
  const last30 = useMemo(() => lastNDates(30), []);

  const clearedSet    = useMemo(() => new Set(getClearedDates()), [state.checkedCriteria, state.weeks]); // eslint-disable-line
  const catBreakdown  = useMemo(() => getCategoryBreakdown(last30), [state.timeBlocks]); // eslint-disable-line
  const totalCatMins  = Object.values(catBreakdown).reduce((s, v) => s + v, 0);
  const daysCleared   = clearedSet.size;
  const totalHours    = getTotalHoursLogged();
  const maxHours      = Math.max(0.5, ...last14.map(d => getHoursForDate(d)));

  function hmLevel(d) {
    const status = getDayStatus(d);
    if (status === 'future' || status === '') return '';
    if (status === 'cleared') {
      const h = getHoursForDate(d);
      return h >= 2 ? 'lv4' : 'lv3';
    }
    if (status === 'partial') return 'lv-partial';
    if (status === 'unattended') return 'lv-unattended';
    // today — use hours
    const h = getHoursForDate(d);
    if (h >= 0.5) return 'lv2';
    if ((state.timeBlocks[d] || []).length > 0) return 'lv1';
    return '';
  }

  function fh(h) { return h >= 10 ? h.toFixed(0) : h.toFixed(1); }

  return (
    <div>
      {/* Streak hero */}
      <div className="streak-hero">
        <div className="streak-fire-icon">🔥</div>
        <div className="streak-number">{state.currentStreak}</div>
        <div className="streak-label">
          {state.currentStreak === 1 ? '1 day streak' : `${state.currentStreak} day streak`}
        </div>
        {state.longestStreak > 0 && (
          <div className="streak-best">Personal best: {state.longestStreak} days</div>
        )}
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--gold)' }}>{state.totalXP}</div>
          <div className="stat-label">Total XP</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{daysCleared}</div>
          <div className="stat-label">Days Cleared</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{fh(totalHours)}</div>
          <div className="stat-label">Hours Logged</div>
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="card">
        <div className="section-title">Activity — Last 3 Months</div>
        <div className="heatmap">
          {last90.map(d => (
            <div key={d} className={`hm-cell ${hmLevel(d)}`} title={d} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 8, fontSize: 10, color: 'var(--text-3)', flexWrap: 'wrap' }}>
          <div className="hm-cell lv-unattended" style={{ width: 11, height: 11, borderRadius: 3, flexShrink: 0 }} />
          <span style={{ marginRight: 4 }}>Missed</span>
          <div className="hm-cell lv-partial" style={{ width: 11, height: 11, borderRadius: 3, flexShrink: 0 }} />
          <span style={{ marginRight: 4 }}>Partial</span>
          {['lv1', 'lv2', 'lv3', 'lv4'].map(l => (
            <div key={l} className={`hm-cell ${l}`} style={{ width: 11, height: 11, borderRadius: 3, flexShrink: 0 }} />
          ))}
          <span>Cleared</span>
        </div>
      </div>

      {/* Daily hours bar chart */}
      <div className="card">
        <div className="section-title">Daily Hours — Last 14 Days</div>
        <div className="hours-chart">
          {last14.map(d => {
            const h   = getHoursForDate(d);
            const pct = (h / maxHours) * 100;
            const isToday = d === today;
            return (
              <div key={d} className="hbar-wrap">
                <div className={`hbar ${isToday ? 'today' : ''}`} style={{ height: `${Math.max(pct, h > 0 ? 4 : 0)}%` }} title={`${fh(h)}h`} />
                <div className="hbar-lbl" style={{ color: isToday ? 'var(--accent-hi)' : undefined }}>{d.slice(8)}</div>
              </div>
            );
          })}
        </div>
        {totalHours === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, textAlign: 'center' }}>
            Add time blocks in Today → Time Plan to track hours.
          </p>
        )}
      </div>

      {/* Category breakdown */}
      <div className="card">
        <div className="section-title">Time by Category — Last 30 Days</div>
        {totalCatMins > 0 ? (
          <div className="cat-breakdown">
            {CATEGORIES.filter(c => (catBreakdown[c.id] || 0) > 0).map(c => {
              const mins = catBreakdown[c.id] || 0;
              const pct  = Math.round((mins / totalCatMins) * 100);
              return (
                <div key={c.id} className="cat-row">
                  <div className="cat-name">{c.label}</div>
                  <div className="cat-track">
                    <div className="cat-fill" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                  <div className="cat-pct">{pct}%</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '8px 0' }}>
            Log time blocks with categories to see the breakdown.
          </p>
        )}
      </div>
    </div>
  );
}
