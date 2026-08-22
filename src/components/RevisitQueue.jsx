import { useState } from 'react';
import { todayStr } from '../utils/dates.js';
import { DIFFICULTIES, DSA_TOPICS } from '../utils/categories.js';

const SLOT_LABELS = ['+3d', '+10d', '+25d'];

function RevisitSlot({ revisit, label, onMark }) {
  const today   = todayStr();
  const overdue = !revisit.done && revisit.date <= today;
  let cls = 'revisit-slot';
  if (revisit.done)  cls += ' done';
  else if (overdue)  cls += ' overdue';
  else               cls += ' upcoming';

  return (
    <div className={cls}>
      <span className="slot-label">{label}</span>
      <span className="slot-date">{revisit.date}</span>
      {revisit.done ? (
        <>
          <span className="slot-done-mark">✓</span>
          {revisit.cold !== null && <span className="slot-cold-mark">{revisit.cold ? '❄️ cold' : '💡 hint'}</span>}
        </>
      ) : overdue ? (
        <div className="slot-actions">
          <button className="btn btn-sm btn-success" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onMark(true)}>❄️</button>
          <button className="btn btn-sm btn-ghost"   style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onMark(false)}>💡</button>
        </div>
      ) : (
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>upcoming</span>
      )}
    </div>
  );
}

function TrackerView({ problems, today, markRevisitDone }) {
  function slotCell(r, probId, idx) {
    const overdue = !r.done && r.date <= today;
    if (r.done) {
      return (
        <td key={idx} style={{ textAlign: 'center', padding: '6px 4px' }}>
          <span style={{ color: 'var(--green)', fontSize: 13 }}>✓</span>
          {r.cold !== null && <span style={{ fontSize: 9, display: 'block', color: 'var(--text-3)' }}>{r.cold ? '❄️' : '💡'}</span>}
        </td>
      );
    }
    if (overdue) {
      return (
        <td key={idx} style={{ textAlign: 'center', padding: '4px 2px' }}>
          <div style={{ fontSize: 9, color: 'var(--red)', marginBottom: 2 }}>{r.date}</div>
          <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <button className="btn btn-sm btn-success" style={{ padding: '1px 5px', fontSize: 9 }} onClick={() => markRevisitDone(probId, idx, true)}>❄️</button>
            <button className="btn btn-sm btn-ghost"   style={{ padding: '1px 5px', fontSize: 9 }} onClick={() => markRevisitDone(probId, idx, false)}>💡</button>
          </div>
        </td>
      );
    }
    return (
      <td key={idx} style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--text-3)', fontSize: 10 }}>
        {r.date}
      </td>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, color: 'var(--text-2)', fontSize: 11 }}>Problem</th>
            {SLOT_LABELS.map(l => (
              <th key={l} style={{ textAlign: 'center', padding: '6px 6px', fontWeight: 600, color: 'var(--text-2)', fontSize: 11, minWidth: 64 }}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {problems.map(prob => {
            const anyOverdue = prob.revisits.some(r => !r.done && r.date <= today);
            const allDone    = prob.revisits.every(r => r.done);
            return (
              <tr key={prob.id} style={{ borderBottom: '1px solid var(--border)', background: anyOverdue ? 'rgba(239,68,68,0.05)' : allDone ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                <td style={{ padding: '6px 8px' }}>
                  <div style={{ fontWeight: 500 }}>{prob.problem}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                    {prob.confirmedDate ? <span style={{ color: 'var(--green)' }}>✓ solved</span> : <span>solved {prob.solvedDate}</span>}
                  </div>
                </td>
                {prob.revisits.map((r, i) => slotCell(r, prob.id, i))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AddProblemForm({ onAdd }) {
  const [name,  setName]  = useState('');
  const [date,  setDate]  = useState(todayStr());
  const [diff,  setDiff]  = useState('medium');
  const [topic, setTopic] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), date, diff, topic || null);
    setName(''); setDate(todayStr()); setDiff('medium'); setTopic('');
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Problem name (e.g. Two Sum)" required style={{ flex: 1 }} />
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: 140, flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select className="input" value={diff} onChange={e => setDiff(e.target.value)}>
          {DIFFICULTIES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select className="input" value={topic} onChange={e => setTopic(e.target.value)}>
          <option value="">Topic (optional)</option>
          {DSA_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>+ Add</button>
      </div>
    </form>
  );
}

export default function RevisitQueue({ app }) {
  const { state, markRevisitDone, addManualProblem, getDueToday, exportDSALog, updateProblemNote } = app;
  const [filter,  setFilter]  = useState('pending');
  const [showAdd, setShowAdd] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [notesOpen, setNotesOpen] = useState(new Set());

  function toggleNotes(id) {
    setNotesOpen(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const today  = todayStr();
  const dueNow = getDueToday();

  function filtered() {
    switch (filter) {
      case 'due':     return state.revisitQueue.filter(p => p.revisits.some(r => !r.done && r.date <= today));
      case 'pending': return state.revisitQueue.filter(p => !p.confirmedDate && p.revisits.some(r => !r.done));
      case 'done':    return state.revisitQueue.filter(p => p.confirmedDate || p.revisits.every(r => r.done));
      case 'tracker': return state.revisitQueue;
      default:        return state.revisitQueue;
    }
  }

  function copyLog() {
    navigator.clipboard.writeText(exportDSALog()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  const problems = filtered();

  const FILTERS = [
    { id: 'all',     label: 'All' },
    { id: 'due',     label: '🔴 Due' },
    { id: 'pending', label: 'Pending' },
    { id: 'done',    label: '✓ Done' },
    { id: 'tracker', label: '📋 Tracker' },
  ];

  return (
    <div>
      {dueNow.length > 0 && (
        <div className="due-banner">🔴 {dueNow.length} revisit{dueNow.length > 1 ? 's' : ''} due today</div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.id} className={`btn btn-sm ${filter === f.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-ghost" onClick={copyLog} title="Copy DSA log for Claude">
            {copied ? '✓ Copied!' : '📋 For Claude'}
          </button>
          <button className={`btn btn-sm ${showAdd ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setShowAdd(s => !s)}>
            {showAdd ? '✕' : '+ Problem'}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 12 }}>
          <AddProblemForm onAdd={(name, date, diff, topic) => { addManualProblem(name, date, diff, topic); setShowAdd(false); }} />
        </div>
      )}

      {filter === 'tracker' ? (
        problems.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🧩</div><p>No problems tracked yet.</p></div>
        ) : (
          <TrackerView problems={problems} today={today} markRevisitDone={markRevisitDone} />
        )
      ) : problems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{filter === 'due' ? '🎉' : '🧩'}</div>
          <p>{filter === 'due' ? 'Nothing due today — great work!' : 'No problems match this filter.'}</p>
        </div>
      ) : (
        problems.map(prob => {
          const hasDue  = prob.revisits.some(r => !r.done && r.date <= today);
          const diffObj = DIFFICULTIES.find(d => d.id === prob.difficulty);
          return (
            <div key={prob.id} className={`revisit-item ${hasDue ? 'due-today' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div className="revisit-prob-name">{prob.problem}</div>
                {hasDue && <span className="tag tag-due" style={{ flexShrink: 0 }}>Due</span>}
              </div>
              <div className="revisit-solved-date">Solved: {prob.solvedDate}{prob.confirmedDate ? <span style={{ marginLeft: 6, color: 'var(--green)', fontSize: 11 }}>✓ confirmed {prob.confirmedDate}</span> : null}</div>
              {(prob.difficulty || prob.topic) && (
                <div className="revisit-tags">
                  {prob.difficulty && <span className={`rtag ${diffObj?.cls ?? ''}`}>{prob.difficulty}</span>}
                  {prob.topic      && <span className="rtag rtag-topic">{prob.topic}</span>}
                </div>
              )}
              <div className="revisit-slots">
                {prob.revisits.map((r, i) => (
                  <RevisitSlot key={i} revisit={r} label={SLOT_LABELS[i]} onMark={cold => markRevisitDone(prob.id, i, cold)} />
                ))}
              </div>

              {/* Problem notes */}
              <div style={{ marginTop: 6 }}>
                {notesOpen.has(prob.id) ? (
                  <div>
                    <textarea
                      className="note-textarea"
                      placeholder="Key insight, approach, edge cases to remember…"
                      defaultValue={state.problemNotes[prob.id] || ''}
                      onBlur={e => updateProblemNote(prob.id, e.target.value)}
                    />
                    <button className="btn btn-sm btn-ghost" style={{ fontSize: 10, marginTop: 3 }} onClick={() => toggleNotes(prob.id)}>
                      ✕ Close
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-sm btn-ghost" style={{ fontSize: 10, padding: '2px 7px' }} onClick={() => toggleNotes(prob.id)}>
                    {state.problemNotes[prob.id] ? `📝 ${state.problemNotes[prob.id].split('\n')[0].slice(0, 60)}…` : '+ Notes'}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
        {state.revisitQueue.length} problem{state.revisitQueue.length !== 1 ? 's' : ''} tracked ·{' '}
        {state.revisitQueue.filter(p => p.revisits.every(r => r.done)).length} fully done
      </div>
    </div>
  );
}

function AddProblemForm({ onAdd }) {
  const [name,  setName]  = useState('');
  const [date,  setDate]  = useState(todayStr());
  const [diff,  setDiff]  = useState('medium');
  const [topic, setTopic] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), date, diff, topic || null);
    setName(''); setDate(todayStr()); setDiff('medium'); setTopic('');
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Problem name (e.g. Two Sum)" required style={{ flex: 1 }} />
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: 140, flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select className="input" value={diff} onChange={e => setDiff(e.target.value)}>
          {DIFFICULTIES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select className="input" value={topic} onChange={e => setTopic(e.target.value)}>
          <option value="">Topic (optional)</option>
          {DSA_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>+ Add</button>
      </div>
    </form>
  );
}

export default function RevisitQueue({ app }) {
  const { state, markRevisitDone, addManualProblem, getDueToday, exportDSALog, updateProblemNote } = app;
  const [filter,  setFilter]  = useState('pending');
  const [showAdd, setShowAdd] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [notesOpen, setNotesOpen] = useState(new Set());

  function toggleNotes(id) {
    setNotesOpen(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const today  = todayStr();
  const dueNow = getDueToday();

  function filtered() {
    switch (filter) {
      case 'due':     return state.revisitQueue.filter(p => p.revisits.some(r => !r.done && r.date <= today));
      case 'pending': return state.revisitQueue.filter(p => !p.confirmedDate && p.revisits.some(r => !r.done));
      case 'done':    return state.revisitQueue.filter(p => p.confirmedDate || p.revisits.every(r => r.done));
      default:        return state.revisitQueue;
    }
  }

  function copyLog() {
    navigator.clipboard.writeText(exportDSALog()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  const problems = filtered();

  return (
    <div>
      {dueNow.length > 0 && (
        <div className="due-banner">🔴 {dueNow.length} revisit{dueNow.length > 1 ? 's' : ''} due today</div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['all','due','pending','done'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'due' ? '🔴 Due' : f === 'pending' ? 'Pending' : '✓ Done'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-ghost" onClick={copyLog} title="Copy DSA log for Claude">
            {copied ? '✓ Copied!' : '📋 For Claude'}
          </button>
          <button className={`btn btn-sm ${showAdd ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setShowAdd(s => !s)}>
            {showAdd ? '✕' : '+ Problem'}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 12 }}>
          <AddProblemForm onAdd={(name, date, diff, topic) => { addManualProblem(name, date, diff, topic); setShowAdd(false); }} />
        </div>
      )}

      {problems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{filter === 'due' ? '🎉' : '🧩'}</div>
          <p>{filter === 'due' ? 'Nothing due today — great work!' : 'No problems match this filter.'}</p>
        </div>
      ) : (
        problems.map(prob => {
          const hasDue  = prob.revisits.some(r => !r.done && r.date <= today);
          const diffObj = DIFFICULTIES.find(d => d.id === prob.difficulty);
          return (
            <div key={prob.id} className={`revisit-item ${hasDue ? 'due-today' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div className="revisit-prob-name">{prob.problem}</div>
                {hasDue && <span className="tag tag-due" style={{ flexShrink: 0 }}>Due</span>}
              </div>
              <div className="revisit-solved-date">Solved: {prob.solvedDate}{prob.confirmedDate ? <span style={{ marginLeft: 6, color: 'var(--green)', fontSize: 11 }}>✓ confirmed {prob.confirmedDate}</span> : null}</div>
              {(prob.difficulty || prob.topic) && (
                <div className="revisit-tags">
                  {prob.difficulty && <span className={`rtag ${diffObj?.cls ?? ''}`}>{prob.difficulty}</span>}
                  {prob.topic      && <span className="rtag rtag-topic">{prob.topic}</span>}
                </div>
              )}
              <div className="revisit-slots">
                {prob.revisits.map((r, i) => (
                  <RevisitSlot key={i} revisit={r} label={SLOT_LABELS[i]} onMark={cold => markRevisitDone(prob.id, i, cold)} />
                ))}
              </div>

              {/* Problem notes */}
              <div style={{ marginTop: 6 }}>
                {notesOpen.has(prob.id) ? (
                  <div>
                    <textarea
                      className="note-textarea"
                      placeholder="Key insight, approach, edge cases to remember…"
                      defaultValue={state.problemNotes[prob.id] || ''}
                      onBlur={e => updateProblemNote(prob.id, e.target.value)}
                    />
                    <button className="btn btn-sm btn-ghost" style={{ fontSize: 10, marginTop: 3 }} onClick={() => toggleNotes(prob.id)}>
                      ✕ Close
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-sm btn-ghost" style={{ fontSize: 10, padding: '2px 7px' }} onClick={() => toggleNotes(prob.id)}>
                    {state.problemNotes[prob.id] ? `📝 ${state.problemNotes[prob.id].split('\n')[0].slice(0, 60)}…` : '+ Notes'}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
        {state.revisitQueue.length} problem{state.revisitQueue.length !== 1 ? 's' : ''} tracked ·{' '}
        {state.revisitQueue.filter(p => p.revisits.every(r => r.done)).length} fully done
      </div>
    </div>
  );
}
