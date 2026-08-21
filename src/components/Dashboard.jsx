import { useState, useEffect } from 'react';
import { todayStr, formatMinutes, formatDate } from '../utils/dates.js';
import { CATEGORIES, catColor, minsToTime, timeToMins } from '../utils/categories.js';

const TL_START = 7 * 60;
const TL_END   = 23 * 60;
const HOUR_PX  = 48;

function px(mins) {
  return Math.max(0, (mins - TL_START) * HOUR_PX / 60);
}

function TimeBlocker({ dateStr, app }) {
  const { state, addTimeBlock, deleteTimeBlock } = app;
  const blocks = (state.timeBlocks[dateStr] || []).slice().sort((a, b) => a.startMinutes - b.startMinutes);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', start: '09:00', end: '10:00', category: 'dsa' });

  const totalH = (TL_END - TL_START) * HOUR_PX / 60;
  const hours  = Array.from({ length: 17 }, (_, i) => i + 7);

  function handleAdd(e) {
    e.preventDefault();
    const sm = timeToMins(form.start), em = timeToMins(form.end);
    if (em <= sm) return;
    addTimeBlock(dateStr, { title: form.title, startMinutes: sm, endMinutes: em, category: form.category });
    setShowForm(false);
    setForm(f => ({ ...f, title: '' }));
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="quest-section-label">🗓 Time Plan</div>
        <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '+ Block'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input className="input" placeholder="What are you working on?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="input" type="time" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} style={{ flex: 1, minWidth: 90 }} />
            <span style={{ color: 'var(--text-3)', fontSize: 12, flexShrink: 0 }}>to</span>
            <input className="input" type="time" value={form.end}   onChange={e => setForm(f => ({ ...f, end:   e.target.value }))} style={{ flex: 1, minWidth: 90 }} />
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ flex: 1, minWidth: 100 }}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Add</button>
          </div>
        </form>
      )}

      {blocks.length === 0 && !showForm ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 0 6px' }}>No blocks yet — click "+ Block" to plan your day.</p>
      ) : blocks.length > 0 && (
        <div style={{ overflowY: 'auto', maxHeight: 320, borderRadius: 12, border: '1px solid var(--glass-border)' }}>
          <div style={{ position: 'relative', height: totalH + 12, paddingLeft: 48 }}>
            {hours.map(h => (
              <div key={h}>
                <div className="tl-hour-label" style={{ top: (h - 7) * HOUR_PX }}>
                  {h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}
                </div>
                <div className="tl-line" style={{ top: (h - 7) * HOUR_PX }} />
              </div>
            ))}
            {blocks.map(b => {
              const top    = px(b.startMinutes);
              const height = Math.max(22, px(b.endMinutes) - top);
              return (
                <div key={b.id} className={`tl-block cat-${b.category}`} style={{ top, height }} onClick={() => deleteTimeBlock(dateStr, b.id)} title="Click to remove">
                  <div className="tl-block-title">{b.title}</div>
                  {height > 30 && <div className="tl-block-time">{minsToTime(b.startMinutes)} – {minsToTime(b.endMinutes)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTasks({ dateStr, app }) {
  const { state, addTask, toggleTask, deleteTask, getMissedTasks } = app;
  const tasks       = state.customTasks[dateStr] || [];
  const missedTasks = getMissedTasks();
  const [showForm, setShowForm] = useState(false);
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState('dsa');
  const [duration, setDuration] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(dateStr, { title: title.trim(), category, durationMinutes: duration ? Number(duration) : null });
    setTitle(''); setDuration(''); setShowForm(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="quest-section-label">✅ Tasks</div>
        <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕' : '+ Task'}
        </button>
      </div>

      {/* Rolled-over missed tasks from previous days */}
      {missedTasks.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>
            ↩ Carried over
          </div>
          <div className="tasks-list">
            {missedTasks.map(t => (
              <div key={`rolled-${t.id}`} className="task-row rolled-over" onClick={() => toggleTask(t.originalDate, t.id)}>
                <div className="task-check" />
                <div className="task-dot" style={{ background: catColor(t.category) }} />
                <div className="task-title">{t.title}</div>
                <div className="task-dur" style={{ color: 'var(--gold)', fontSize: 10 }}>{formatDate(t.originalDate)}</div>
                <button className="task-del" onClick={e => { e.stopPropagation(); deleteTask(t.originalDate, t.id); }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
          <input className="input" placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} required style={{ flex: 3, minWidth: 130 }} />
          <select className="input" value={category} onChange={e => setCategory(e.target.value)} style={{ flex: 1, minWidth: 90 }}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input className="input" type="number" placeholder="mins" min="1" value={duration} onChange={e => setDuration(e.target.value)} style={{ width: 68, flexShrink: 0 }} />
          <button type="submit" className="btn btn-primary btn-sm">Add</button>
        </form>
      )}

      {tasks.length > 0 ? (
        <div className="tasks-list">
          {tasks.map(t => (
            <div key={t.id} className={`task-row ${t.done ? 'done' : ''}`} onClick={() => toggleTask(dateStr, t.id)}>
              <div className="task-check">{t.done ? '✓' : ''}</div>
              <div className="task-dot" style={{ background: catColor(t.category) }} />
              <div className="task-title">{t.title}</div>
              {t.durationMinutes && <div className="task-dur">{t.durationMinutes}m</div>}
              <button className="task-del" onClick={e => { e.stopPropagation(); deleteTask(dateStr, t.id); }}>✕</button>
            </div>
          ))}
        </div>
      ) : !showForm && missedTasks.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 0' }}>No extra tasks for today.</p>
      )}
    </div>
  );
}

export function FullQuestCard({ day, checkedCriteria, isDayCleared, toggleCriterion, dueRevisits, dayNote, onNoteChange, earlyBonus = null }) {
  const cleared = isDayCleared(day.dayNumber);
  const [noteOpen, setNoteOpen] = useState(false);
  const [localNote, setLocalNote] = useState(dayNote || '');

  useEffect(() => { setLocalNote(dayNote || ''); }, [dayNote]);

  function handleNoteBlur() {
    if (onNoteChange) onNoteChange(localNote);
  }
  return (
    <div className={`quest-card ${cleared ? 'cleared' : ''}`}>
      <div className="quest-header">
        <div className="quest-day-info">
          <span className="quest-day-label">Day {day.dayNumber} · {day.label}</span>
          <span className="quest-title">{day.objective}</span>
        </div>
        <div className="quest-meta">
          {cleared ? <span className="cleared-badge">✓ Cleared</span> : <span className="xp-chip">+{day.xp} XP</span>}
          <span className="time-chip">⏱ {formatMinutes(day.timeBudgetMinutes)}</span>
          {onNoteChange && (
            <button className="btn btn-sm btn-ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => setNoteOpen(o => !o)}>
              {noteOpen ? '✕' : localNote ? '📝' : '+ Notes'}
            </button>
          )}
        </div>
      </div>

      <div className="quest-body">
        {dueRevisits?.length > 0 && (
          <div>
            <div className="quest-section-label" style={{ color: 'var(--red)' }}>🔄 Revisits Due Today</div>
            <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.22)', borderRadius: 10, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dueRevisits.map(({ prob, revisitIdx }) => (
                <div key={`${prob.id}-${revisitIdx}`} style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
                  • {prob.problem} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-3)' }}>(+{[3,10,25][revisitIdx]}d)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {day.resources.length > 0 && (
          <div>
            <div className="quest-section-label">Resources</div>
            <div className="resource-list">
              {day.resources.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link">{r.name}</a>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="quest-section-label">Acceptance Criteria</div>
          <div className="criteria-list">
            {day.acceptanceCriteria.map((c, i) => {
              const checked = !!checkedCriteria[`${day.dayNumber}-${i}`];
              return (
                <label key={i} className={`criterion-row ${checked ? 'checked' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleCriterion(day.dayNumber, i)} />
                  <span className="criterion-box">{checked ? '✓' : ''}</span>
                  <span className="criterion-text">{c}</span>
                </label>
              );
            })}
          </div>
        </div>

        {cleared && (
          <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(52,211,153,0.28)', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>✓ Quest Cleared — +{day.xp} XP earned</span>
            {earlyBonus && <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, flexShrink: 0 }}>⚡ +{earlyBonus} early bonus</span>}
          </div>
        )}

        {onNoteChange && noteOpen && (
          <div>
            <textarea
              className="note-textarea"
              placeholder="What did you learn? Any blockers or insights…"
              value={localNote}
              onChange={e => setLocalNote(e.target.value)}
              onBlur={handleNoteBlur}
            />
            {localNote !== (dayNote || '') && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>Unsaved — click away to save</div>
            )}
          </div>
        )}

        {onNoteChange && !noteOpen && localNote && (
          <div className="note-preview" onClick={() => setNoteOpen(true)}>
            📝 {localNote.split('\n')[0].slice(0, 120)}{localNote.length > 120 ? '…' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ app }) {
  const { state, getTodayDay, getTomorrowDay, isDayCleared, toggleCriterion, getDueToday, canUseFreeze, activateFreeze, getCurrentWeek, getMissedDays, updateDayNote } = app;
  const today       = getTodayDay();
  const tomorrowDay = getTomorrowDay();
  const dueToday    = getDueToday();
  const currentWeek = getCurrentWeek();
  const todayDate   = todayStr();
  const missedDays  = getMissedDays();

  const tomorrowHasActivity = tomorrowDay
    ? tomorrowDay.acceptanceCriteria.some((_, i) => !!state.checkedCriteria[`${tomorrowDay.dayNumber}-${i}`])
    : false;
  const [showBonus, setShowBonus] = useState(tomorrowHasActivity);

  if (!today) {
    return (
      <div className="no-quest">
        <div style={{ fontSize: 52, marginBottom: 16 }}>🗓️</div>
        <h2>No Quest Today</h2>
        <p>
          {currentWeek
            ? `Week ${currentWeek.weekNumber} is active. Tap ＋ to import next week when ready.`
            : 'Tap ＋ in the top bar to import your first week.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {currentWeek && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="tag tag-world">World {currentWeek.world}</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Week {currentWeek.weekNumber} · {currentWeek.theme}</span>
        </div>
      )}

      {missedDays.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            ↩ Catch Up — {missedDays.length} day{missedDays.length > 1 ? 's' : ''} behind
          </div>
          {missedDays.map(day => (
            <div key={day.dayNumber} style={{ marginBottom: 10 }}>
              <FullQuestCard
                day={day}
                checkedCriteria={state.checkedCriteria}
                isDayCleared={isDayCleared}
                toggleCriterion={toggleCriterion}
                dueRevisits={[]}
                dayNote={state.dayNotes[day.date] || ''}
                onNoteChange={text => updateDayNote(day.date, text)}
              />
            </div>
          ))}
        </div>
      )}

      <FullQuestCard
        day={today}
        checkedCriteria={state.checkedCriteria}
        isDayCleared={isDayCleared}
        toggleCriterion={toggleCriterion}
        dueRevisits={dueToday}
        dayNote={state.dayNotes[today.date] || ''}
        onNoteChange={text => updateDayNote(today.date, text)}
      />

      {tomorrowDay && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showBonus ? 12 : 0 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gold)' }}>⚡ Bonus Quest</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>Day {tomorrowDay.dayNumber} · +20 XP for clearing early</span>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowBonus(s => !s)}>
              {showBonus ? '▲ Hide' : '▼ Show'}
            </button>
          </div>
          {showBonus && (
            <FullQuestCard
              day={tomorrowDay}
              checkedCriteria={state.checkedCriteria}
              isDayCleared={isDayCleared}
              toggleCriterion={toggleCriterion}
              dueRevisits={[]}
              earlyBonus={(state.earlyCompletions || {})[tomorrowDay.dayNumber]?.bonusXP ?? null}
              dayNote={state.dayNotes[tomorrowDay.date] || ''}
              onNoteChange={text => updateDayNote(tomorrowDay.date, text)}
            />
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <CustomTasks dateStr={todayDate} app={app} />
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <TimeBlocker dateStr={todayDate} app={app} />
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🔥</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fire)' }}>
              {state.currentStreak > 0 ? `${state.currentStreak}-day streak` : 'Start your streak today'}
            </div>
            {state.longestStreak > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Best: {state.longestStreak} days</div>
            )}
          </div>
        </div>
        {canUseFreeze() ? (
          <div className="freeze-btn-wrap">
            <button className="btn btn-sm btn-gold" onClick={activateFreeze}>🧊 Streak Freeze</button>
            <span className="freeze-desc">Protects 1 missed day</span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>❄️ Freeze used this week</span>
        )}
      </div>
    </div>
  );
}
