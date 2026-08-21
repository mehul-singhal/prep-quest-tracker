import { useState } from 'react';
import { validateWeekSchema } from '../utils/schema.js';

const EXAMPLE = `{
  "weekNumber": 2,
  "world": 1,
  "theme": "Week theme",
  "days": [
    {
      "dayNumber": 8,
      "date": "2026-08-25",
      "label": "Tue, Aug 25",
      "objective": "Day objective",
      "resources": [{"name": "Resource", "url": "https://..."}],
      "timeBudgetMinutes": 150,
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "xp": 65
    }
  ],
  "newProblemsSolved": [
    {"problem": "Problem Name", "solvedDate": "2026-08-25"}
  ]
}`;

export default function ImportWeek({ app, onSuccess }) {
  const { importWeek, state } = app;
  const [json,   setJson]   = useState('');
  const [result, setResult] = useState(null);

  function handleParse() {
    setResult(null);
    if (!json.trim()) { setResult({ type: 'err', errors: ['Paste the week JSON first.'] }); return; }

    let parsed;
    try { parsed = JSON.parse(json); }
    catch (e) { setResult({ type: 'err', errors: [`JSON syntax error: ${e.message}`] }); return; }

    const errors = validateWeekSchema(parsed);
    if (errors.length > 0) { setResult({ type: 'err', errors }); return; }

    const existing = state.weeks.find(w => w.weekNumber === parsed.weekNumber);
    importWeek(parsed);
    const msg = existing
      ? `Week ${parsed.weekNumber} updated (${parsed.days.length} days, ${parsed.newProblemsSolved?.length ?? 0} problems).`
      : `Week ${parsed.weekNumber} added — ${parsed.days.length} days unlocked! ${parsed.newProblemsSolved?.length ?? 0} problems added to DSA queue.`;
    setResult({ type: 'ok', msg });
    setJson('');
    if (onSuccess) setTimeout(onSuccess, 1200);
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
          Paste the JSON for the upcoming week from your Claude conversation. The schema is validated before importing.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--accent-hi)' }}>Tip:</strong> Use the 📋 For Claude button in the DSA tab to copy your problem log and share it with Claude when requesting next week's JSON — your solved problems will be included in the plan.
        </p>
      </div>

      <textarea
        className="import-textarea"
        value={json}
        onChange={e => { setJson(e.target.value); setResult(null); }}
        placeholder={`Paste week JSON here…\n\nExpected shape:\n${EXAMPLE}`}
        spellCheck={false}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={handleParse} disabled={!json.trim()}>
          Parse &amp; Add Week
        </button>
        {json.trim() && (
          <button className="btn btn-ghost" onClick={() => { setJson(''); setResult(null); }}>Clear</button>
        )}
      </div>

      {result?.type === 'err' && (
        <div className="error-box">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            ✕ Validation failed — {result.errors.length} error{result.errors.length > 1 ? 's' : ''}:
          </div>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {result.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
      {result?.type === 'ok' && <div className="success-box">✓ {result.msg}</div>}

      <div className="divider" />

      <div>
        <div className="section-title" style={{ marginBottom: 8 }}>Loaded weeks</div>
        {state.weeks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No weeks loaded.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...state.weeks].sort((a, b) => a.weekNumber - b.weekNumber).map(w => (
              <div key={w.weekNumber} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '9px 14px', fontSize: 13 }}>
                <span className="tag tag-world">W{w.weekNumber}</span>
                <span style={{ color: 'var(--text-2)', flex: 1 }}>{w.theme}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{w.days.length} days</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
