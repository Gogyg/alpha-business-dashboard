import { ArrowDown, ArrowUp, CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useRef, type CSSProperties } from 'react';
import { memberLabel, isOverdue, shiftDate, shortDate, weekStart, type Board, type SortKey, type Task, type TaskWorkspace } from './taskModel';

function markColor(color?: string) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : undefined;
}

function Tags({ board, task }: { board: Board; task: Task }) {
  return <span className="ht-tags">
    {task.label && <span style={{ borderColor: markColor(board.labelColors[task.label]) }}>{task.label}</span>}
    {task.priority !== board.defaultPriority && <span style={{ borderColor: markColor(board.priorityColors[task.priority]) }}>{task.priority}</span>}
  </span>;
}

function Assignee({ value, names }: { value: string; names?: TaskWorkspace['memberNames'] }) {
  const label = memberLabel(value, names);
  return <span className="ht-person">
    {value && <span className="ht-avatar" aria-hidden="true">{label.slice(0, 2).toUpperCase()}</span>}
    {label || 'Без ответственного'}
  </span>;
}

function Deadline({ task, today }: { task: Task; today: string }) {
  return <span className={isOverdue(task, today) ? 'ht-deadline ht-late' : 'ht-deadline'}>
    {task.end ? <><CalendarDays size={14} aria-hidden="true" /> {shortDate(task.end)}</> : 'Без срока'}
  </span>;
}

interface ViewProps {
  board: Board;
  tasks: Task[];
  today: string;
  onTask: (task: Task) => void;
  memberNames?: TaskWorkspace['memberNames'];
}

export function TasksList({ board, tasks, today, onTask, sort, onSort, archive, memberNames }: ViewProps & {
  sort: { key: SortKey; direction: number } | null;
  onSort: (key: SortKey) => void;
  archive: boolean;
}) {
  const headers: Array<[SortKey, string]> = [
    ['title', 'Задача'], ['status', 'Статус'], ['assignee', 'Ответственный'],
    ['date', archive ? 'Выполнено' : 'Срок'],
  ];
  return <div className="ht-list">
    <div className="ht-list-grid ht-list-header">
      {headers.map(([key, title]) => {
        const direction = sort?.key === key ? sort.direction : 0;
        const Arrow = direction === -1 ? ArrowDown : ArrowUp;
        return <button key={key} type="button" className="ht-quiet" aria-pressed={direction !== 0}
          aria-label={title + (direction ? (direction === 1 ? ', по возрастанию' : ', по убыванию') : '')}
          onClick={() => onSort(key)}>
          {title}{direction !== 0 && <Arrow size={14} aria-hidden="true" />}
        </button>;
      })}
    </div>
    {tasks.length === 0 && <p className="ht-empty">Задач с такими фильтрами нет.</p>}
    {tasks.map(task => <button type="button" className="ht-list-grid ht-card ht-list-row" key={task.id} onClick={() => onTask(task)}>
      <span className="ht-title">{task.title}<Tags board={board} task={task} /></span>
      <span className="ht-status">{board.columns.find(column => column.id === task.status)?.name}</span>
      <Assignee value={task.assignee} names={memberNames} />
      {archive ? <span className="ht-deadline">{shortDate(task.completedAt)}</span> : <Deadline task={task} today={today} />}
    </button>)}
  </div>;
}

export function Kanban({ board, tasks, today, onTask, busy, onMove, onAdd, onAddColumn, status, memberNames }: ViewProps & {
  busy: boolean;
  status: string;
  onMove: (task: Task, status: string) => void;
  onAdd: (status: string) => void;
  onAddColumn: () => void;
}) {
  const dragged = useRef<string | undefined>(undefined);
  const columns = board.columns.filter(column => !column.archived && (!status || column.id === status));
  return <div className="ht-scroll" tabIndex={0} aria-label="Колонки Канбана">
    <div className="ht-kanban">
      {columns.map(column => <section className="ht-lane" key={column.id}
        onDragOver={event => { if (!busy && dragged.current) event.preventDefault(); }}
        onDrop={event => {
          event.preventDefault();
          const task = tasks.find(item => item.id === dragged.current);
          dragged.current = undefined;
          if (task && !busy && task.status !== column.id) onMove(task, column.id);
        }}>
        <h3>{column.name} <span aria-label="Количество задач">{tasks.filter(task => task.status === column.id).length}</span></h3>
        <div className="ht-stack">
          {tasks.filter(task => task.status === column.id).map(task => <button type="button"
            className="ht-card ht-task" key={task.id} draggable={!busy}
            onDragStart={event => {
              dragged.current = task.id;
              event.dataTransfer.setData('text/plain', task.id);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => { dragged.current = undefined; }}
            onClick={() => onTask(task)}>
            <span className="ht-title">{task.title}</span>
            <Tags board={board} task={task} />
            <span className="ht-meta"><Assignee value={task.assignee} names={memberNames} /><Deadline task={task} today={today} /></span>
          </button>)}
        </div>
        <button type="button" className="ht-quiet ht-add" disabled={busy} onClick={() => onAdd(column.id)}>
          <Plus size={16} aria-hidden="true" /> Добавить задачу
        </button>
      </section>)}
      {!status && <button type="button" className="ht-quiet ht-new-column" disabled={busy} onClick={onAddColumn}>
        <Plus size={16} aria-hidden="true" /> Новая колонка
      </button>}
    </div>
  </div>;
}

export function TasksGantt({ tasks, today, onTask, period, onPeriod }: ViewProps & {
  period: string;
  onPeriod: (period: string) => void;
}) {
  const days = Array.from({ length: 14 }, (_, index) => shiftDate(period, index));
  const lastDay = days[days.length - 1];
  const scheduled = tasks.filter(task => {
    const start = task.start || task.end;
    const end = task.end || task.start;
    return start && start <= lastDay && end >= period;
  });
  const undated = tasks.filter(task => !task.start && !task.end);
  return <>
    <div className="ht-gantt-toolbar">
      <button type="button" className="ht-button" aria-label="Предыдущие две недели" onClick={() => onPeriod(shiftDate(period, -14))}><ChevronLeft size={17} /></button>
      <strong>{shortDate(period)} – {shortDate(lastDay)}</strong>
      <button type="button" className="ht-button" aria-label="Следующие две недели" onClick={() => onPeriod(shiftDate(period, 14))}><ChevronRight size={17} /></button>
      <button type="button" className="ht-quiet" onClick={() => onPeriod(weekStart(today))}>Сегодня</button>
    </div>
    {scheduled.length > 0
      ? <div className="ht-scroll" tabIndex={0} aria-label="Календарная шкала"><div className="ht-gantt">
        <div className="ht-timeline"><span>Задача</span>{days.map(day => <span key={day} className={day === today ? 'ht-today' : ''}>{shortDate(day)}</span>)}</div>
        {scheduled.map(task => {
          const startDay = task.start || task.end;
          const endDay = task.end || task.start;
          const first = startDay < period ? 0 : days.indexOf(startDay);
          const last = endDay > lastDay ? days.length - 1 : days.indexOf(endDay);
          const style: CSSProperties = { gridColumn: `${first + 2} / span ${last - first + 1}`, gridRow: 1 };
          return <div className="ht-timeline" key={task.id}>
            <button type="button" className="ht-quiet ht-timeline-task" onClick={() => onTask(task)}>{task.title}</button>
            <span className={isOverdue(task, today) ? 'ht-bar ht-bar-late' : 'ht-bar'} style={style}
              title={`${task.title} · ${shortDate(startDay)} – ${shortDate(endDay)}`} />
          </div>;
        })}
      </div></div>
      : <p className="ht-empty">В этом периоде нет задач с датами.</p>}
    {undated.length > 0 && <section className="ht-undated"><h3>Без дат</h3>
      {undated.map(task => <button type="button" className="ht-card ht-task" key={task.id} onClick={() => onTask(task)}>{task.title}</button>)}
    </section>}
  </>;
}
