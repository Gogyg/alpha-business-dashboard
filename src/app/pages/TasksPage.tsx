import { Archive, BarChart3, CalendarRange, ChevronDown, Columns3, Filter, List, Plus, RefreshCw, Settings } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { BoardForm, NameForm, TaskDialog, TaskForm } from '../tasks/TaskForms';
import { createBoard, listBoards, saveBoard, TasksApiError } from '../tasks/tasksApi';
import {
  dateInMoscow, emptyTask, isArchived, isOverdue, memberLabel, newId, periodRange, shortDate, sortTasks,
  taskStatistics, weekStart, type Board, type Period, type SortKey, type Task, type TaskView, type TaskWorkspace,
} from '../tasks/taskModel';
import { TaskSelect } from '../tasks/TaskSelect';
import { Kanban, TasksGantt, TasksList } from '../tasks/TaskViews';
import '../tasks/tasks.css';

const views = [
  { key: 'list', name: 'Список', icon: List },
  { key: 'kanban', name: 'Канбан', icon: Columns3 },
  { key: 'gantt', name: 'Гант', icon: CalendarRange },
] as const;

const periods: Array<[Period, string]> = [
  ['week', 'Текущая неделя'], ['previous', 'Прошлая неделя'],
  ['month', 'Текущий месяц'], ['quarter', 'Текущий квартал'],
];

interface Filters {
  assignee: string;
  status: string;
  priority: string;
  overdue: boolean;
  from: string;
  to: string;
}

const noFilters: Filters = { assignee: '', status: '', priority: '', overdue: false, from: '', to: '' };
type Dialog = { kind: 'board'; id: string } | { kind: 'column' } | { kind: 'settings' } | { kind: 'task'; task: Task };

function describeError(error: unknown) {
  return error instanceof TasksApiError ? error.message : 'Не удалось связаться с сервером задач. Повторите попытку.';
}

function BoardStatistics({ tasks, today }: { tasks: Task[]; today: string }) {
  const [period, setPeriod] = useState<Period>('week');
  const range = periodRange(period, today);
  const statistics = taskStatistics(tasks, range, today);
  return <section className="ht-statistics" aria-label="Статистика по задачам">
    <div className="ht-stat-heading">
      <div><h2>Статистика</h2><p>{shortDate(range[0])} – {shortDate(range[1])} · По сроку или дате выполнения</p></div>
      <TaskSelect label="Период" value={period} onChange={value => setPeriod(value as Period)} options={periods} />
    </div>
    <dl className="ht-stat-grid">
      <div><dt>Всего задач</dt><dd>{statistics.total}</dd></div>
      <div className="ht-stat-late"><dt>Просрочено</dt><dd>{statistics.overdue}</dd></div>
      <div className="ht-stat-done">
        <dt>Выполнено</dt><dd>{statistics.completed}</dd>
        <dd className="ht-stat-note">{statistics.onTime === null ? 'Нет выполненных задач со сроком' : `${statistics.onTime}% в срок`}</dd>
      </div>
    </dl>
  </section>;
}

function FilterChips({ label, value, choices, onChange }: {
  label: string;
  value: string;
  choices: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  const name = useId();
  return <fieldset className="ht-chip-group">
    <legend>{label}</legend>
    <div className="ht-chips">
      {choices.map(([key, caption]) => <label key={key} className="ht-chip">
        <input type="radio" name={name} checked={value === key} onChange={() => onChange(key)} />
        <span>{caption}</span>
      </label>)}
    </div>
  </fieldset>;
}

function TaskFilters({ board, members, memberNames, archive, filters, onChange }: {
  board: Board;
  members: string[];
  memberNames?: TaskWorkspace['memberNames'];
  archive: boolean;
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const count = [filters.assignee, filters.status, filters.priority,
    ...(archive ? [filters.from, filters.to] : [filters.overdue])].filter(Boolean).length;
  return <Popover>
    <PopoverTrigger asChild>
      <button className="ht-button ht-filter-trigger" type="button"><Filter size={15} aria-hidden="true" /> Фильтры {count > 0 && <span className="ht-count">{count}</span>}</button>
    </PopoverTrigger>
    <PopoverContent align="end" sideOffset={8} className="hermes-tasks ht-popover ht-filter" aria-label="Фильтры задач">
      <FilterChips label="Участник" value={filters.assignee}
        choices={[['','Все'],...members.map((member): [string,string]=>[member, memberLabel(member, memberNames)])]}
        onChange={assignee=>onChange({ ...filters, assignee })} />
      <FilterChips label="Статус" value={filters.status}
        choices={[['','Все'],...board.columns.filter(column=>archive || !column.archived).map((column): [string,string]=>[column.id,column.name])]}
        onChange={status=>onChange({ ...filters, status })} />
      <FilterChips label="Критичность" value={filters.priority}
        choices={[['','Все'],...board.priorities.map((priority): [string,string]=>[priority,priority])]}
        onChange={priority=>onChange({ ...filters, priority })} />
      {archive
        ? <div className="ht-form-pair">
          <label>Выполнено с<input type="date" value={filters.from} max={filters.to || undefined} onChange={event => onChange({ ...filters, from: event.target.value })} /></label>
          <label>Выполнено по<input type="date" value={filters.to} min={filters.from || undefined} onChange={event => onChange({ ...filters, to: event.target.value })} /></label>
        </div>
        : <label className="ht-checkbox"><input type="checkbox" checked={filters.overdue}
          onChange={event => onChange({ ...filters, overdue: event.target.checked })} /> Только просроченные</label>}
      <button className="ht-quiet" type="button" onClick={() => onChange(noFilters)}>Сбросить фильтры</button>
    </PopoverContent>
  </Popover>;
}

export function TasksPage() {
  const [workspace, setWorkspace] = useState<TaskWorkspace>();
  const [selected, setSelected] = useState('');
  const [view, setView] = useState<TaskView>(() => matchMedia('(max-width: 660px)').matches ? 'list' : 'kanban');
  const [archive, setArchive] = useState(false);
  const [filters, setFilters] = useState(noFilters);
  const [sort, setSort] = useState<{ key: SortKey; direction: number } | null>(null);
  const [stats, setStats] = useState(false);
  const [boardMenu, setBoardMenu] = useState(false);
  const [ganttStart, setGanttStart] = useState(() => weekStart(dateInMoscow()));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const activeLoad = useRef<AbortController | undefined>(undefined);
  const writeInProgress = useRef(false);
  const today = dateInMoscow();
  const board = workspace?.boards.find(item => item.id === selected) || workspace?.boards[0];

  async function reload() {
    if (writeInProgress.current) return;
    activeLoad.current?.abort();
    const request = new AbortController();
    activeLoad.current = request;
    setLoading(true);
    setLoadError('');
    try {
      const fresh = await listBoards(request.signal);
      if (request.signal.aborted) return;
      setWorkspace(fresh);
      setNeedsRefresh(false);
      setSaveError('');
    } catch (error) {
      if (!request.signal.aborted) setLoadError(describeError(error));
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    return () => activeLoad.current?.abort();
  }, []);

  function selectBoard(id: string) {
    setSelected(id);
    setFilters(noFilters);
    setBoardMenu(false);
  }

  function openDialog(next: Dialog) {
    setBoardMenu(false);
    if (!needsRefresh) setSaveError('');
    setDialog(next);
  }

  function closeDialog() {
    setDialog(null);
    if (!needsRefresh) setSaveError('');
  }

  async function persist(write: () => Promise<Board>) {
    if (writeInProgress.current || loading || needsRefresh) return;
    writeInProgress.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await write();
      setWorkspace(previous => {
        if (!previous) return previous;
        const exists = previous.boards.some(item => item.id === updated.id);
        return {
          ...previous,
          boards: exists ? previous.boards.map(item => item.id === updated.id ? updated : item) : [...previous.boards, updated],
        };
      });
      setFilters(previous => ({
        ...previous,
        status: updated.columns.some(column => column.id === previous.status && (archive || !column.archived)) ? previous.status : '',
        priority: updated.priorities.includes(previous.priority) ? previous.priority : '',
      }));
      setSelected(updated.id);
      setDialog(null);
    } catch (error) {
      setSaveError(describeError(error));
      if (error instanceof TasksApiError && error.status === 409) setNeedsRefresh(true);
    } finally {
      writeInProgress.current = false;
      setSaving(false);
    }
  }

  function saveTask(task: Task) {
    if (!board) return;
    const exists = board.tasks.some(item => item.id === task.id);
    const tasks = exists ? board.tasks.map(item => item.id === task.id ? task : item) : [...board.tasks, task];
    void persist(() => saveBoard({ ...board, tasks }));
  }

  const busy = loading || saving || needsRefresh;
  const columns = board?.columns.filter(column => !column.archived) ?? [];
  const activeStatuses = new Set(columns.map(column => column.id));
  const matches = (task: Task) => (!filters.assignee || task.assignee === filters.assignee)
    && (!filters.status || task.status === filters.status) && (!filters.priority || task.priority === filters.priority);
  const statisticsTasks = board?.tasks.filter(task => matches(task) && (archive
    ? isArchived(task, today) && (!filters.from || task.completedAt >= filters.from) && (!filters.to || task.completedAt <= filters.to)
    : (isArchived(task, today) || activeStatuses.has(task.status)) && (!filters.overdue || isOverdue(task, today)))) ?? [];
  const visible = archive ? statisticsTasks
    : statisticsTasks.filter(task => activeStatuses.has(task.status) && !isArchived(task, today));
  const sorted = sort && board ? sortTasks(visible, board, sort.key, sort.direction, archive, workspace?.memberNames) : visible;
  const members = [...new Set([...(workspace?.members ?? []), workspace?.user ?? '', ...(board?.tasks.map(task => task.assignee) ?? [])])].filter(Boolean);
  const openTask = (task: Task) => openDialog({ kind: 'task', task });
  const addTask = (status: string) => { if (board && status) openTask(emptyTask(board, status)); };
  const editControls = board && workspace;
  return <section className="hermes-tasks ht-page" aria-label="Задачи" aria-busy={loading || saving}>
    <header className="ht-heading">
      <h1>Доска</h1>
      {workspace && <Popover open={boardMenu} onOpenChange={setBoardMenu}>
        <PopoverTrigger asChild><button type="button" className="ht-button ht-board-trigger">
          {board?.title ?? 'Доски'} <ChevronDown size={15} aria-hidden="true" />
        </button></PopoverTrigger>
        <PopoverContent align="start" className="hermes-tasks ht-popover ht-board-menu" aria-label="Выбор доски">
          {workspace.boards.map(item => <div className="ht-board-option" key={item.id}>
            <button type="button" className="ht-quiet" aria-current={item.id === board?.id ? 'true' : undefined}
              onClick={() => selectBoard(item.id)}>{item.title}</button>
            <button type="button" className="ht-quiet ht-settings-button" disabled={busy} aria-label={`Настройки доски «${item.title}»`}
              onClick={() => { selectBoard(item.id); openDialog({ kind: 'settings' }); }}><Settings size={17} /></button>
          </div>)}
          <button type="button" className="ht-quiet" disabled={busy} onClick={() => openDialog({ kind: 'board', id: newId() })}>
            <Plus size={16} aria-hidden="true" /> Новая доска
          </button>
        </PopoverContent>
      </Popover>}
      {workspace && <button className="ht-quiet ht-refresh" type="button" disabled={loading || saving} onClick={() => void reload()}>
        <RefreshCw size={16} aria-hidden="true" /> <span>Обновить</span>
      </button>}
    </header>
    {loadError && <div className="ht-error" role="alert">{loadError} <button type="button" className="ht-button" onClick={() => void reload()}>Повторить</button></div>}
    {!dialog && saveError && <p className="ht-error" role="alert">{saveError}</p>}
    {!workspace && loading && <p className="ht-empty" role="status">Загружаем доски…</p>}
    {workspace && !board && <div className="ht-empty">
      <p>Пока нет досок. Создайте первую доску, чтобы добавить задачи.</p>
      <button className="ht-primary" type="button" disabled={busy} onClick={() => openDialog({ kind: 'board', id: newId() })}>
        <Plus size={16} aria-hidden="true" /> Новая доска
      </button>
    </div>}
    {editControls && <>
      <div className="ht-toolbar">
        <div className="ht-views" role="group" aria-label="Вид задач">
          {views.map(({ key, name, icon: Icon }) => <button type="button" className="ht-quiet" key={key}
            aria-pressed={!archive && view === key}
            onClick={() => {
              if (archive) setFilters(previous => ({ ...previous, status: '', from: '', to: '' }));
              setArchive(false);
              setView(key);
            }}>
            <Icon size={16} aria-hidden="true" /> {name}
          </button>)}
        </div>
        <div className="ht-utils">
          <label className="ht-checkbox"><input type="checkbox" checked={filters.assignee === workspace.user}
            onChange={event => setFilters({ ...filters, assignee: event.target.checked ? workspace.user : '' })} /> Мои задачи</label>
          {!archive && view !== 'kanban' && <button type="button" className="ht-primary" disabled={busy || columns.length === 0}
            onClick={() => addTask(columns[0]?.id)}><Plus size={16} aria-hidden="true" /> Новая задача</button>}
          <div className="ht-board-utilities">
            <button type="button" className="ht-button" aria-expanded={stats} onClick={() => setStats(!stats)}>
              <BarChart3 size={15} aria-hidden="true" /> Статистика
            </button>
            <TaskFilters board={board} members={members} memberNames={workspace.memberNames} archive={archive} filters={filters} onChange={setFilters} />
            <button type="button" className="ht-button ht-archive-button" aria-pressed={archive} onClick={() => {
              setArchive(!archive);
              setFilters(previous => ({ ...previous, status: '', overdue: false, from: '', to: '' }));
            }}><Archive size={15} aria-hidden="true" /> <span>{archive ? 'Выйти из архива' : 'Архив'}</span></button>
          </div>
        </div>
      </div>
      {stats && <BoardStatistics tasks={statisticsTasks} today={today} />}
      {archive && <p className="ht-archive-note">Задачи появляются в архиве через 10 дней после выполнения.</p>}
      {archive || view === 'list' ? <TasksList memberNames={workspace.memberNames} board={board} tasks={sorted} today={today} onTask={openTask} sort={sort} archive={archive}
        onSort={key => setSort({ key, direction: sort?.key === key ? -sort.direction : 1 })} />
        : view === 'gantt' ? <TasksGantt board={board} tasks={visible} today={today} onTask={openTask} period={ganttStart} onPeriod={setGanttStart} />
        : <Kanban memberNames={workspace.memberNames} board={board} tasks={visible} today={today} onTask={openTask} status={filters.status} busy={busy}
          onAdd={addTask} onMove={(task, status) => saveTask({ ...task, status })}
          onAddColumn={() => openDialog({ kind: 'column' })} />}
    </>}
    {dialog && <TaskDialog title={dialog.kind === 'board' ? 'Новая доска' : dialog.kind === 'column' ? 'Новая колонка'
      : dialog.kind === 'settings' ? 'Настройки доски'
      : board?.tasks.some(item => item.id === dialog.task.id) ? 'Задача' : 'Новая задача'}
      busy={saving} onClose={closeDialog}>
      {dialog.kind === 'board' && <NameForm label="Название доски" maxLength={64} busy={saving} error={saveError}
        onClose={closeDialog} onSave={title => void persist(() => createBoard(dialog.id, title))} />}
      {dialog.kind === 'column' && board && <NameForm label="Название колонки" maxLength={36} busy={saving} error={saveError}
        onClose={closeDialog} onSave={name => void persist(() => saveBoard({ ...board, columns: [...board.columns, { id: newId(), name }] }))} />}
      {dialog.kind === 'settings' && board && <BoardForm initial={board} busy={saving} error={saveError}
        onClose={closeDialog} onSave={next => void persist(() => saveBoard(next))} />}
      {dialog.kind === 'task' && board && <TaskForm board={board} initial={dialog.task} members={workspace?.members ?? []} memberNames={workspace?.memberNames}
        busy={saving} error={saveError} onClose={closeDialog} onSave={saveTask} />}
    </TaskDialog>}
  </section>;
}
