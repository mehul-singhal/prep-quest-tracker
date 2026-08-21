import { useState, useEffect, useRef } from 'react';
import { useAppState } from './hooks/useAppState.js';
import { getPlayerLevel } from './utils/levels.js';
import { findOrCreateGist, saveToGist, loadFromGist } from './utils/gistSync.js';
import Dashboard from './components/Dashboard.jsx';
import WeeklyView from './components/WeeklyView.jsx';
import RevisitQueue from './components/RevisitQueue.jsx';
import ImportWeek from './components/ImportWeek.jsx';
import WorldOverview from './components/WorldOverview.jsx';
import ConsistencyDashboard from './components/ConsistencyDashboard.jsx';

const SYNC_KEY = 'prepquesttracker_sync';

function loadSyncCfg() {
  try { return JSON.parse(localStorage.getItem(SYNC_KEY)); } catch { return null; }
}

function SettingsModal({ onClose, exportData, importData, syncCfg, onSyncSetup, exportWeeklyReport }) {
  const [importJson, setImportJson] = useState('');
  const [msg, setMsg]   = useState(null);
  const [token, setToken] = useState('');
  const [busy, setBusy]   = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

  function handleImport() {
    if (!importJson.trim()) return;
    const r = importData(importJson);
    setMsg(r.ok ? { type: 'ok', text: 'Data restored successfully.' } : { type: 'err', text: r.error });
  }

  async function connect() {
    if (!token.trim()) return;
    setBusy(true);
    try {
      const gistId = await findOrCreateGist(token.trim());
      onSyncSetup({ token: token.trim(), gistId });
      setMsg({ type: 'ok', text: '✓ Sync connected! Your data will automatically sync across devices.' });
    } catch (e) {
      setMsg({ type: 'err', text: `Connection failed: ${e.message}` });
    }
    setBusy(false);
  }

  function disconnect() {
    localStorage.removeItem(SYNC_KEY);
    onSyncSetup(null);
    setMsg({ type: 'ok', text: 'Sync disconnected.' });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">Settings <button className="modal-close" onClick={onClose}>✕</button></div>

        {msg && <div className={msg.type === 'ok' ? 'success-box' : 'error-box'} style={{ marginBottom: 14 }}>{msg.text}</div>}

        <div className="modal-section">
          <div className="modal-section-label">☁ Cloud Sync — GitHub Gist</div>
          {syncCfg ? (
            <div>
              <p style={{ fontSize: 13, color: 'var(--green)', marginBottom: 10 }}>✓ Connected — syncing to a private Gist automatically.</p>
              <button className="btn btn-danger btn-sm" onClick={disconnect}>Disconnect</button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.5 }}>
                Enter a GitHub Personal Access Token with <code style={{ color: 'var(--accent-hi)', fontSize: 11 }}>gist</code> scope to sync data across devices for free.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="input" placeholder="ghp_xxxxxxxxxxxxxxxx" value={token} onChange={e => setToken(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13, flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={connect} disabled={!token.trim() || busy} style={{ flexShrink: 0 }}>
                  {busy ? '…' : 'Connect'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                github.com → Settings → Developer settings → Personal access tokens (classic) → gist scope
              </p>
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="modal-section">
          <div className="modal-section-label">Export for Claude</div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.5 }}>
            Copy a weekly progress summary — what you did, what you skipped, notes — to paste into a Claude chat.
          </p>
          <button className="btn btn-ghost" onClick={() => {
            const text = exportWeeklyReport();
            navigator.clipboard.writeText(text).then(() => {
              setReportCopied(true);
              setTimeout(() => setReportCopied(false), 2200);
            });
          }}>
            {reportCopied ? '✓ Copied!' : '📋 Copy Weekly Report'}
          </button>
        </div>

        <div className="divider" />

        <div className="modal-section">
          <div className="modal-section-label">Backup</div>
          <button className="btn btn-ghost" onClick={exportData}>⬇ Export JSON Backup</button>
        </div>

        <div className="divider" />

        <div className="modal-section">
          <div className="modal-section-label">Restore from backup</div>
          <textarea className="import-textarea" style={{ minHeight: 100 }} placeholder="Paste backup JSON…" value={importJson} onChange={e => { setImportJson(e.target.value); setMsg(null); }} />
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-danger" onClick={handleImport} disabled={!importJson.trim()}>Restore Data</button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>Warning: replaces all current data.</p>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose, app }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">Import Week <button className="modal-close" onClick={onClose}>✕</button></div>
        <ImportWeek app={app} onSuccess={onClose} />
      </div>
    </div>
  );
}

export default function App() {
  const app = useAppState();
  const [tab,          setTab]          = useState('today');
  const [showSettings, setShowSettings] = useState(false);
  const [showImport,   setShowImport]   = useState(false);
  const [syncCfg,      setSyncCfg]      = useState(() => loadSyncCfg());
  const [syncStatus,   setSyncStatus]   = useState('idle');
  const [bootDone,     setBootDone]     = useState(false);

  // On mount: pull from Gist if configured and Gist is newer
  useEffect(() => {
    async function boot() {
      const cfg = loadSyncCfg();
      if (cfg?.token && cfg?.gistId) {
        setSyncStatus('syncing');
        try {
          const remote = await loadFromGist(cfg.token, cfg.gistId);
          if (remote && (remote._updatedAt || 0) > (app.state._updatedAt || 0)) {
            app.importData(JSON.stringify(remote));
          }
          setSyncStatus('synced');
        } catch { setSyncStatus('error'); }
      }
      setBootDone(true);
    }
    boot();
  }, []); // eslint-disable-line

  // Debounced push to Gist on state change
  useEffect(() => {
    if (!bootDone) return;
    const cfg = loadSyncCfg();
    if (!cfg?.token || !cfg?.gistId) return;
    setSyncStatus('syncing');
    const t = setTimeout(async () => {
      try {
        await saveToGist(cfg.token, cfg.gistId, app.state);
        setSyncStatus('synced');
      } catch { setSyncStatus('error'); }
    }, 4500);
    return () => clearTimeout(t);
  }, [app.state, bootDone]); // eslint-disable-line

  function handleSyncSetup(cfg) {
    setSyncCfg(cfg);
    if (cfg) { localStorage.setItem(SYNC_KEY, JSON.stringify(cfg)); setSyncStatus('idle'); }
    else     { localStorage.removeItem(SYNC_KEY); setSyncStatus('idle'); }
  }

  const dueCount   = app.getDueToday().length;
  const currentWeek = app.getCurrentWeek();
  const worldNum   = currentWeek?.world ?? 1;
  const worldXP    = app.getWorldXP(worldNum);
  const levelInfo  = getPlayerLevel(app.state.totalXP);

  const [levelUpToast, setLevelUpToast] = useState(null);
  const prevRankIdx = useRef(levelInfo.rankIdx);
  useEffect(() => {
    const cur = getPlayerLevel(app.state.totalXP);
    if (cur.rankIdx > prevRankIdx.current) {
      setLevelUpToast(cur.rank);
      const t = setTimeout(() => setLevelUpToast(null), 4000);
      prevRankIdx.current = cur.rankIdx;
      return () => clearTimeout(t);
    }
    prevRankIdx.current = cur.rankIdx;
  }, [app.state.totalXP]); // eslint-disable-line

  const tabs = [
    { id: 'today',    icon: '⚔️',  label: 'Today'    },
    { id: 'week',     icon: '📅',  label: 'Week'     },
    { id: 'dsa',      icon: '🧩',  label: 'DSA',     badge: dueCount > 0 },
    { id: 'progress', icon: '📊',  label: 'Progress' },
    { id: 'worlds',   icon: '🗺️', label: 'Worlds'   },
  ];

  return (
    <div className="app">
      {levelUpToast && (
        <div className="levelup-toast">
          <span className="levelup-icon">🎖️</span>
          <div>
            <div className="levelup-title">Rank Up!</div>
            <div className="levelup-rank">{levelUpToast}</div>
          </div>
        </div>
      )}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          exportData={app.exportData}
          importData={app.importData}
          syncCfg={syncCfg}
          onSyncSetup={handleSyncSetup}
          exportWeeklyReport={app.exportWeeklyReport}
        />
      )}
      {showImport && <ImportModal onClose={() => setShowImport(false)} app={app} />}

      {/* Top bar */}
      <div className="top-bar">
        <span className="app-title">⚔ Prep Quest</span>
        {syncCfg && <span className={`sync-dot ${syncStatus}`} title={`Sync: ${syncStatus}`} />}
        <div className="streak-badge"><span className="flame">🔥</span><span>{app.state.currentStreak}</span></div>
        <div className="xp-badge"><span>⚡</span><span>{app.state.totalXP} XP</span></div>
        <div className="rank-badge" title={levelInfo.next ? `${levelInfo.xpInLevel}/${levelInfo.xpForLevel} XP to ${levelInfo.next}` : 'Max rank!'}>
          {levelInfo.rank}
        </div>
        <button className="icon-btn" onClick={() => setShowImport(true)}  title="Import week">＋</button>
        <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
      </div>

      {/* World XP bar */}
      {worldXP.total > 0 && (
        <div style={{ padding: '7px 16px 0', flexShrink: 0 }}>
          <div className="xp-bar-wrap" style={{ margin: 0, padding: '8px 14px' }}>
            <div className="xp-bar-labels">
              <span>World {worldNum} XP</span>
              <span>{worldXP.earned} / {worldXP.total}</span>
            </div>
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: `${worldXP.total > 0 ? Math.round(worldXP.earned / worldXP.total * 100) : 0}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="content">
        <div key={tab} className="tab-content">
          {tab === 'today'    && <Dashboard            app={app} />}
          {tab === 'week'     && <WeeklyView           app={app} />}
          {tab === 'dsa'      && <RevisitQueue         app={app} />}
          {tab === 'progress' && <ConsistencyDashboard app={app} />}
          {tab === 'worlds'   && <WorldOverview        app={app} />}
        </div>
      </div>

      {/* Bottom tab bar */}
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.badge && <span className="due-dot" />}
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
