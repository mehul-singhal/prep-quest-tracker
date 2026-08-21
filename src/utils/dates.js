function localDateStr(d) {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

export function todayStr() {
  return localDateStr(new Date());
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

export function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const year = d.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

export function computeRevisitDates(solvedDate) {
  return [
    addDays(solvedDate, 3),
    addDays(solvedDate, 10),
    addDays(solvedDate, 25)
  ];
}

export function formatMinutes(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatDate(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function isToday(dateStr) {
  return dateStr === todayStr();
}

export function isPast(dateStr) {
  return dateStr < todayStr();
}

export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}
