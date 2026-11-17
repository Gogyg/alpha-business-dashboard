import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import * as Modal from '@radix-ui/react-dialog';
import { TaskSelect } from './TaskSelect';
import { memberLabel, newId, type Board, type Task, type TaskWorkspace } from './taskModel';

export function TaskDialog({ title, children, busy, onClose }: {
  title: string;
  children: ReactNode;
  busy: boolean;
  onClose: () => void;
}) {
  return <Modal.Root open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <Modal.Portal>
      <Modal.Overlay className="ht-dialog-overlay" />
      <Modal.Content className="hermes-tasks ht-dialog" aria-describedby={undefined}>
        <header className="ht-dialog-heading"><Modal.Title>{title}</Modal.Title>
          <Modal.Close className="ht-quiet" type="button" disabled={busy} aria-label="Закрыть"><X size={18} /></Modal.Close>
        </header>
        {children}
      </Modal.Content>
    </Modal.Portal>
  </Modal.Root>;
}

function FormFooter({ busy, ready = true, onClose }: { busy: boolean; ready?: boolean; onClose: () => void }) {
  return <footer className="ht-form-footer">
    <button className="ht-button" type="button" disabled={busy} onClick={onClose}>Отмена</button>
    <button className="ht-primary" type="submit" disabled={busy || !ready}>{busy ? 'Сохранение…' : 'Сохранить'}</button>
  </footer>;
}

interface FormProps {
  busy: boolean;
  error: string;
  onClose: () => void;
}

export function NameForm({ initial = '', label, maxLength, busy, error, onClose, onSave }: FormProps & {
  initial?: string;
  label: string;
  maxLength: number;
  onSave: (value: string) => void;
}) {
  const [name, setName] = useState(initial);
  return <form className="ht-form" onSubmit={event => {
    event.preventDefault();
    if (name.trim()) onSave(name.trim());
  }}>
    <label>{label}<input required autoFocus maxLength={maxLength} value={name}
      onChange={event => setName(event.target.value)} /></label>
    {error && <p role="alert" className="ht-error">{error}</p>}
    <FormFooter busy={busy} ready={Boolean(name.trim())} onClose={onClose} />
  </form>;
}

export function TaskForm({ board, initial, members, memberNames, busy, error, onClose, onSave }: FormProps & {
  board: Board;
  initial: Task;
  members: string[];
  memberNames?: TaskWorkspace['memberNames'];
  onSave: (task: Task) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [invalid, setInvalid] = useState('');
  const field = (key: keyof Task, value: string) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    setInvalid('');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return setInvalid('Укажите название задачи.');
    if (draft.start && draft.end && draft.start > draft.end) {
      return setInvalid('Срок не может быть раньше даты начала.');
    }
    onSave({ ...draft, title: draft.title.trim() });
  };
  return <form className="ht-form" onSubmit={submit}>
    <label>Название<input autoFocus required maxLength={160} value={draft.title} onChange={event => field('title', event.target.value)} /></label>
    <label>Описание<textarea rows={3} maxLength={1500} value={draft.description} onChange={event => field('description', event.target.value)} /></label>
    <div className="ht-form-pair">
      <TaskSelect label="Статус" value={draft.status} onChange={value => field('status',value)}
        options={board.columns.filter(column => !column.archived || column.id === draft.status)
          .map(column => [column.id, column.name])} />
      <TaskSelect label="Ответственный" value={draft.assignee} onChange={value => field('assignee',value)}
        options={[['','Без ответственного'], ...Array.from(new Set([...members,draft.assignee])).filter(Boolean)
          .map((member): [string, string] => [member, memberLabel(member, memberNames)])]} />
    </div>
    <div className="ht-form-pair">
      <label>Начало<input type="date" value={draft.start} max={draft.end || undefined} onChange={event => field('start', event.target.value)} /></label>
      <label>Срок<input type="date" value={draft.end} min={draft.start || undefined} onChange={event => field('end', event.target.value)} /></label>
    </div>
    <div className="ht-form-pair">
      <TaskSelect label="Метка" value={draft.label} onChange={value => field('label',value)}
        options={[['','Без метки'], ...board.labels.map((label): [string, string] => [label, label])]} />
      <TaskSelect label="Критичность" value={draft.priority} onChange={value => field('priority',value)}
        options={board.priorities.map(priority => [priority, priority])} />
    </div>
    {(invalid || error) && <p role="alert" className="ht-error">{invalid || error}</p>}
    <FormFooter busy={busy} onClose={onClose} />
  </form>;
}

function OptionsEditor({ title, items, colors, onAdd, onRemove, onColor, required = false }: {
  title: string;
  items: string[];
  colors: Record<string, string>;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  onColor: (value: string, color: string) => void;
  required?: boolean;
}) {
  const [name, setName] = useState('');
  const normalized = name.trim();
  const duplicate = items.some(item => item.toLocaleLowerCase('ru') === normalized.toLocaleLowerCase('ru'));
  function add() {
    if (!normalized || duplicate) return;
    onAdd(normalized);
    setName('');
  }
  return <fieldset className="ht-settings-group"><legend>{title}</legend>
    {items.map(value => <div className="ht-option" key={value}>
      <input type="color" value={colors[value] || '#a78bfa'} aria-label={`Цвет «${value}»`}
        onChange={event => onColor(value, event.target.value)} />
      <span>{value}</span>
      <button type="button" className="ht-quiet" disabled={required && items.length === 1}
        aria-label={`Убрать «${value}»`} onClick={() => onRemove(value)}><X size={16} /></button>
    </div>)}
    <div className="ht-option ht-inline-name">
      <input aria-label={`Название: ${title.toLowerCase()}`} placeholder="Название" maxLength={32} value={name}
        onChange={event => setName(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} />
      <button className="ht-button" type="button" disabled={!normalized || duplicate} onClick={add}><Plus size={16} /> Добавить</button>
    </div>
  </fieldset>;
}

export function BoardForm({ initial, busy, error, onClose, onSave }: FormProps & {
  initial: Board;
  onSave: (board: Board) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [columnName, setColumnName] = useState('');
  function change(next: Partial<Board>) {
    setDraft(previous => ({ ...previous, ...next }));
  }
  function addColumn() {
    if (!columnName.trim()) return;
    change({ columns: [...draft.columns, { id: newId(), name: columnName.trim() }] });
    setColumnName('');
  }
  function moveColumn(index: number, step: number) {
    const columns = [...draft.columns];
    [columns[index], columns[index + step]] = [columns[index + step], columns[index]];
    change({ columns });
  }
  function removeLabel(value: string) {
    const labelColors = { ...draft.labelColors };
    delete labelColors[value];
    change({ labelColors, labels: draft.labels.filter(label => label !== value) });
  }
  function removePriority(value: string) {
    const priorityColors = { ...draft.priorityColors };
    delete priorityColors[value];
    const priorities = draft.priorities.filter(priority => priority !== value);
    change({ priorityColors, priorities, defaultPriority: draft.defaultPriority === value ? priorities[0] : draft.defaultPriority });
  }
  const ready = Boolean(draft.title.trim() && draft.columns.every(column => column.name.trim()));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    onSave({
      ...draft, title: draft.title.trim(),
      columns: draft.columns.map(column => ({ ...column, name: column.name.trim() })),
      tasks: draft.tasks.map(task => ({
        ...task,
        label: draft.labels.includes(task.label) ? task.label : '',
        priority: draft.priorities.includes(task.priority) ? task.priority : draft.defaultPriority,
      })),
    });
  }
  return <form className="ht-form" onSubmit={submit}>
    <label>Название доски<input autoFocus required maxLength={64} value={draft.title}
      onChange={event => change({ title: event.target.value })} /></label>
    <fieldset className="ht-settings-group"><legend>Колонки</legend>
      {draft.columns.map((column, index) => <div className="ht-column-setting" key={column.id}>
        <input aria-label={`Название колонки ${index + 1}`} required maxLength={36} value={column.name}
          onChange={event => change({ columns: draft.columns.map(item => item.id === column.id ? { ...item, name: event.target.value } : item) })} />
        <div className="ht-column-actions">
          <button type="button" className="ht-quiet" disabled={index === 0} aria-label={`Поднять «${column.name}»`} onClick={() => moveColumn(index, -1)}><ArrowUp size={16} /></button>
          <button type="button" className="ht-quiet" disabled={index === draft.columns.length - 1} aria-label={`Опустить «${column.name}»`} onClick={() => moveColumn(index, 1)}><ArrowDown size={16} /></button>
          <button type="button" className="ht-button" disabled={!column.archived && draft.columns.filter(item => !item.archived).length === 1}
            onClick={() => change({ columns: draft.columns.map(item => item.id === column.id ? { ...item, archived: !item.archived } : item) })}>
            {column.archived ? 'Вернуть' : 'В архив'}
          </button>
        </div>
      </div>)}
      <div className="ht-inline-name">
        <input maxLength={36} aria-label="Название новой колонки" placeholder="Новая колонка" value={columnName}
          onChange={event => setColumnName(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addColumn(); } }} />
        <button className="ht-button" type="button" onClick={addColumn} disabled={!columnName.trim()}><Plus size={16} /> Добавить</button>
      </div>
    </fieldset>
    <OptionsEditor title="Метки" items={draft.labels} colors={draft.labelColors}
      onAdd={label => change({ labels: [...draft.labels, label] })} onRemove={removeLabel}
      onColor={(label, color) => change({ labelColors: { ...draft.labelColors, [label]: color } })} />
    <OptionsEditor title="Критичность" items={draft.priorities} colors={draft.priorityColors} required
      onAdd={priority => change({ priorities: [...draft.priorities, priority] })} onRemove={removePriority}
      onColor={(priority, color) => change({ priorityColors: { ...draft.priorityColors, [priority]: color } })} />
    <TaskSelect label="Критичность по умолчанию" value={draft.defaultPriority}
      onChange={value => change({ defaultPriority: value })} options={draft.priorities.map(priority => [priority, priority])} />
    {error && <p role="alert" className="ht-error">{error}</p>}
    <FormFooter busy={busy} ready={ready} onClose={onClose} />
  </form>;
}
