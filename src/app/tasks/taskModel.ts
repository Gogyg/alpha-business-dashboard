export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  status: string;
  start: string;
  end: string;
  label: string;
  priority: string;
  completedAt: string;
}

export interface Column {
  id: string;
  name: string;
  archived?: boolean;
}

export interface Board {
  id: string;
  revision: number;
  title: string;
  columns: Column[];
  labels: string[];
  labelColors: Record<string, string>;
  priorities: string[];
  priorityColors: Record<string, string>;
  defaultPriority: string;
  tasks: Task[];
}

export interface TaskWorkspace {
  boards: Board[];
  user: string;
  members: string[];
  memberNames?: Record<string, string>;
}

// Hermes uses login strings; Supabase users have stable UUIDs and optional display names.
export function memberLabel(member: string, names?: TaskWorkspace['memberNames']) {
  const name = names?.[member];
  if (name) return name;
  return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(member)
    ? `Участник ${member.slice(0, 8)}`
    : member;
}

export type TaskView = 'list' | 'kanban' | 'gantt';
export type SortKey = 'title' | 'status' | 'assignee' | 'date';
export type Period = 'week' | 'previous' | 'month' | 'quarter';

export const ARCHIVE_AFTER_DAYS = 10;
export const dateInMoscow = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export function shiftDate(date: string, days: number) {
  const instant = new Date(date + 'T00:00:00Z');
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'short', timeZone: 'UTC',
});
export function shortDate(date: string) {
  return date ? dateFormatter.format(new Date(date + 'T00:00:00Z')).replace('.', '') : '';
}

export function isoDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export function weekStart(date: string) {
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  return shiftDate(date, -((day + 6) % 7));
}

export function periodRange(period: Period, today: string): [string, string] {
  const monday = weekStart(today);
  if (period === 'week') return [monday, shiftDate(monday, 6)];
  if (period === 'previous') return [shiftDate(monday, -7), shiftDate(monday, -1)];
  const [year, month] = today.split('-').map(Number);
  if (period === 'month') return [isoDate(year, month - 1, 1), isoDate(year, month, 0)];
  const quarter = Math.floor((month - 1) / 3) * 3;
  return [isoDate(year, quarter, 1), isoDate(year, quarter + 3, 0)];
}

export const isArchived = (task: Task, today: string) =>
  Boolean(task.completedAt && task.completedAt <= shiftDate(today, -ARCHIVE_AFTER_DAYS));

export const isOverdue = (task: Task, today: string) =>
  Boolean(task.end && task.end < today && !task.completedAt);

export function taskStatistics(tasks: Task[], range: [string, string], today: string) {
  const [from, through] = range;
  const inRange = (value: string) => value >= from && value <= through;
  const cutoff = through < today ? through : shiftDate(today, -1);
  const asOf = through < today ? through : today;
  const completed = tasks.filter(task => inRange(task.completedAt));
  const withDeadline = completed.filter(task => task.end);
  return {
    total: tasks.filter(task => inRange(task.end) || inRange(task.completedAt)).length,
    overdue: tasks.filter(task => inRange(task.end) && task.end <= cutoff &&
      (!task.completedAt || task.completedAt > asOf)).length,
    completed: completed.length,
    onTime: withDeadline.length
      ? Math.round(100 * withDeadline.filter(task => task.completedAt <= task.end).length / withDeadline.length)
      : null,
  };
}

const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

export function sortTasks(tasks: Task[], board: Board, key: SortKey, direction: number, archive: boolean, names?: TaskWorkspace['memberNames']) {
  const positions = new Map(board.columns.map((column, index) => [column.id, index]));
  const value = (task: Task): string | number => {
    switch (key) {
      case 'status': return positions.get(task.status) ?? positions.size;
      case 'assignee': return memberLabel(task.assignee, names);
      case 'date': return archive ? task.completedAt : task.end;
      default: return task.title;
    }
  };
  return [...tasks].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (a === '' || b === '') return Number(a === '') - Number(b === '');
    return direction * (typeof a === 'number' && typeof b === 'number'
      ? a - b : collator.compare(String(a), String(b)));
  });
}

export function emptyTask(board: Board, status: string): Task {
  return {
    id: newId(), title: '', description: '', assignee: '',
    status, start: '', end: '', label: '', priority: board.defaultPriority, completedAt: '',
  };
}

// Hermes can be served over an internal HTTP URL where randomUUID is unavailable.
export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}
