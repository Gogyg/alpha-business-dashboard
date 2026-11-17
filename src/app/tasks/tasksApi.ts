import type { Board, TaskWorkspace } from './taskModel';

const isHermes = import.meta.env.MODE === 'hermes-sqlite';

export class TasksApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'TasksApiError';
  }
}

function tasksError(status: number, message?: string) {
  if (status === 409) {
    return new TasksApiError(status, 'Доску уже изменили в другой сессии. Закройте форму и обновите данные перед повторной попыткой.');
  }
  if (status === 401 || status === 403) {
    return new TasksApiError(status, isHermes
      ? 'Нет доступа к задачам. Вернитесь в CorpGPT и войдите в Hermes.'
      : 'Нет доступа к задачам. Войдите в Дашборд под своей учётной записью.');
  }
  return new TasksApiError(status, message || 'Не удалось связаться с сервером задач.');
}

type TaskRequest = { action: 'list' } | { action: 'create'; id: string; title: string } | { action: 'save'; board: Board };

async function request<T>(payload: TaskRequest, signal?: AbortSignal): Promise<T> {
  if (isHermes) {
    const response = await fetch('/api/alpha-dashboard/tasks', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.data == null) {
      throw tasksError(response.status, response.status === 400 && typeof body?.error === 'string' ? body.error : undefined);
    }
    return body.data as T;
  }

  const { supabase } = await import('../utils/api');
  const params = payload.action === 'create' ? { p_id: payload.id, p_title: payload.title }
    : payload.action === 'save' ? { p_board: payload.board } : {};
  const query = supabase.rpc(`dashboard_tasks_${payload.action}`, params);
  if (signal) query.abortSignal(signal);
  const { data, error, status } = await query;
  if (error || data == null) {
    const conflict = error?.code === '40001' || error?.code === 'PT409';
    const denied = error?.code === '42501';
    const invalid = error?.code === '22023' || error?.code === 'PT400';
    throw tasksError(conflict ? 409 : denied ? 403 : status, invalid ? error.message : undefined);
  }
  return data as T;
}

export const listBoards = (signal?: AbortSignal) =>
  request<TaskWorkspace>({ action: 'list' }, signal);
export const createBoard = (id: string, title: string) => request<Board>({ action: 'create', id, title });
export const saveBoard = (board: Board) => request<Board>({ action: 'save', board });
