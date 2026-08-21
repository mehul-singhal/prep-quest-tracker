export const CATEGORIES = [
  { id: 'dsa',        label: 'DSA',             color: '#818cf8' },
  { id: 'sysdesign',  label: 'System Design',   color: '#34d399' },
  { id: 'behavioral', label: 'Behavioral',      color: '#fbbf24' },
  { id: 'coding',     label: 'Coding',          color: '#f87171' },
  { id: 'reading',    label: 'Reading',         color: '#60a5fa' },
  { id: 'other',      label: 'Other',           color: '#6b7280' },
];

export const DSA_TOPICS = [
  'Array', 'String', 'Hash Map', 'Stack', 'Queue', 'Linked List',
  'Tree', 'Binary Tree', 'Graph', 'Dynamic Programming', 'Greedy',
  'Binary Search', 'Two Pointers', 'Sliding Window', 'Backtracking',
  'Heap', 'Trie', 'Union Find', 'Bit Manipulation', 'Math', 'Design',
];

export const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy',   cls: 'rtag-easy'   },
  { id: 'medium', label: 'Medium', cls: 'rtag-medium' },
  { id: 'hard',   label: 'Hard',   cls: 'rtag-hard'   },
];

export function catColor(id) {
  return CATEGORIES.find(c => c.id === id)?.color ?? '#6b7280';
}

export function catLabel(id) {
  return CATEGORIES.find(c => c.id === id)?.label ?? 'Other';
}

export function minsToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function timeToMins(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}
