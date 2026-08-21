import { WORLDS, WEEK_THEMES } from '../data/seed.js';

export default function WorldOverview({ app }) {
  const { state, toggleMilestone } = app;

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 14 }}>🗺️ Worlds &amp; Milestones</div>

      {WORLDS.map((world, wi) => {
        const worldXP  = app.getWorldXP(world.world);
        const pct      = worldXP.total > 0 ? Math.round((worldXP.earned / worldXP.total) * 100) : 0;

        return (
          <div key={world.world} className="world-card" style={{ animationDelay: `${wi * 0.06}s` }}>
            <div className="world-header">
              <div className="world-num">World {world.world}</div>
              <div className="world-title">{world.name}</div>
              <div className="world-dates">{world.dateRange}</div>
            </div>

            <div className="world-body">
              <div className="world-theme">{world.theme}</div>

              {worldXP.total > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600 }}>
                    <span>XP Progress</span>
                    <span>{worldXP.earned} / {worldXP.total} ({pct}%)</span>
                  </div>
                  <div className="xp-bar-track">
                    <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              <div>
                <div className="quest-section-label">Milestones</div>
                <div className="milestone-list">
                  {world.milestones.map((m, i) => {
                    const key     = `W${world.world}-M${i}`;
                    const checked = !!state.milestones[key];
                    return (
                      <label key={i} className={`milestone-row ${checked ? 'checked' : ''}`}>
                        <span className="milestone-box">{checked ? '✓' : ''}</span>
                        <span className="milestone-text">{m}</span>
                        <input type="checkbox" checked={checked} onChange={() => toggleMilestone(key)} style={{ display: 'none' }} />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="divider" />

      <div>
        <div className="section-title" style={{ marginBottom: 12 }}>📋 16-Week Plan</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="week-table">
            <thead>
              <tr><th>Week</th><th>Theme</th></tr>
            </thead>
            <tbody>
              {WEEK_THEMES.map(wt => {
                const loaded = state.weeks.find(w => w.weekNumber === wt.week);
                return (
                  <tr key={wt.week} style={loaded ? { background: 'rgba(129,140,248,0.05)' } : {}}>
                    <td className="wk-num">
                      W{wt.week}
                      {loaded && <span style={{ fontSize: 10, color: 'var(--accent-hi)', marginLeft: 5 }}>✓</span>}
                    </td>
                    <td>{wt.theme}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
