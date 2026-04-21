import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import { CalendarDays, Loader2, Plus, X } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { buttonVariants } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { cn } from '../components/ui/utils';
import { PasswordModal } from '../components/PasswordModal';
import { eventsAPI } from '../utils/api';
import { addMonths, format, isSameDay, isWeekend, startOfDay, startOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

interface OutletContext {
  isEditingMode: boolean;
  setIsEditingMode: (value: boolean) => void;
}

type EventColor = 'green' | 'emerald' | 'blue' | 'violet' | 'red' | 'amber';
type EventStatus = 'not_started' | 'in_progress' | 'ready' | 'passed';
type CalendarKey = 'directorate' | 'prp' | 'other';

const CALENDAR_OPTIONS: Array<{ key: CalendarKey; label: string }> = [
  { key: 'directorate', label: 'Дирекция' },
  { key: 'prp', label: 'ПрП' },
  { key: 'other', label: 'Прочее' },
];

interface EventItem {
  id: string;
  title: string;
  description: string;
  date: Date;
  color: EventColor;
  status: EventStatus;
  updatedAt: string;
  calendarKey: CalendarKey;
}

interface AddEventDraft {
  title: string;
  date: string;
  description: string;
  color: EventColor;
  status: EventStatus;
}

interface DetailDraft {
  id: string;
  title: string;
  description: string;
  dateInput: string;
  color: EventColor;
  status: EventStatus;
}

const STATUS_LABELS: Record<EventStatus, string> = {
  not_started: 'Подготовка не начата',
  in_progress: 'В работе',
  ready: 'Готовы к событию',
  passed: 'Пройдено',
};

const statusChipClasses: Record<EventStatus, string> = {
  not_started: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
  in_progress: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ready: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  passed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

const EDITABLE_STATUSES: EventStatus[] = ['not_started', 'in_progress', 'ready'];

const colorStyles: Record<
  EventColor,
  {
    dot: string;
    titleBg: string;
    titleBorder: string;
    titleSubtext: string;
    calendarBg: string;
    calendarBorder: string;
    calendarText: string;
  }
> = {
  green: {
    dot: 'bg-[#34D399]',
    titleBg: 'bg-[#34D399]/18',
    titleBorder: 'border-[#34D399]/60',
    titleSubtext: 'text-[#A7F3D0]',
    calendarBg: 'bg-[#34D399]/35',
    calendarBorder: 'border-[#34D399]/90',
    calendarText: 'text-white',
  },
  emerald: {
    dot: 'bg-[#06B6D4]',
    titleBg: 'bg-[#06B6D4]/20',
    titleBorder: 'border-[#06B6D4]/60',
    titleSubtext: 'text-[#A5F3FC]',
    calendarBg: 'bg-[#06B6D4]/40',
    calendarBorder: 'border-[#06B6D4]/90',
    calendarText: 'text-white',
  },
  blue: {
    dot: 'bg-[#3B82F6]',
    titleBg: 'bg-[#3B82F6]/20',
    titleBorder: 'border-[#3B82F6]/60',
    titleSubtext: 'text-[#BFDBFE]',
    calendarBg: 'bg-[#3B82F6]/36',
    calendarBorder: 'border-[#3B82F6]/90',
    calendarText: 'text-white',
  },
  violet: {
    dot: 'bg-[#8B5CF6]',
    titleBg: 'bg-[#8B5CF6]/20',
    titleBorder: 'border-[#8B5CF6]/60',
    titleSubtext: 'text-[#DDD6FE]',
    calendarBg: 'bg-[#8B5CF6]/36',
    calendarBorder: 'border-[#8B5CF6]/90',
    calendarText: 'text-white',
  },
  red: {
    dot: 'bg-[#EF4444]',
    titleBg: 'bg-[#EF4444]/20',
    titleBorder: 'border-[#EF4444]/60',
    titleSubtext: 'text-[#FECACA]',
    calendarBg: 'bg-[#EF4444]/36',
    calendarBorder: 'border-[#EF4444]/90',
    calendarText: 'text-white',
  },
  amber: {
    dot: 'bg-[#F59E0B]',
    titleBg: 'bg-[#F59E0B]/20',
    titleBorder: 'border-[#F59E0B]/60',
    titleSubtext: 'text-[#FDE68A]',
    calendarBg: 'bg-[#F59E0B]/36',
    calendarBorder: 'border-[#F59E0B]/90',
    calendarText: 'text-white',
  },
};

const EVENT_COLORS: EventColor[] = ['green', 'emerald', 'blue', 'violet', 'red', 'amber'];

const isEventColor = (value: unknown): value is EventColor =>
  typeof value === 'string' && EVENT_COLORS.includes(value as EventColor);

const normalizeStatus = (value: unknown): EventStatus => {
  if (value === 'not_started' || value === 'in_progress' || value === 'ready' || value === 'passed') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v.includes('не нач')) return 'not_started';
    if (v.includes('готов')) return 'ready';
    if (v.includes('работ')) return 'in_progress';
    if (v.includes('пройден')) return 'passed';
  }
  return 'in_progress';
};

const deriveEventTitle = (description: string, fallback = 'Событие') => {
  const clean = description.trim();
  if (!clean) return fallback;
  const firstLine = clean.split('\n')[0].trim().replace(/[.!?]+$/, '');
  if (!firstLine) return fallback;
  return firstLine.length > 58 ? `${firstLine.slice(0, 55)}...` : firstLine;
};

const PRODUCTION_CALENDAR_2026_NON_WORKING_DAYS = new Set<string>([
  '2026-01-01',
  '2026-01-02',
  '2026-01-03',
  '2026-01-04',
  '2026-01-05',
  '2026-01-06',
  '2026-01-07',
  '2026-01-08',
  '2026-01-09', // перенос выходного с 03.01.2026
  '2026-02-23',
  '2026-03-08',
  '2026-03-09', // перенос выходного с 08.03.2026
  '2026-05-01',
  '2026-05-09',
  '2026-05-11', // перенос выходного с 09.05.2026
  '2026-06-12',
  '2026-11-04',
  '2026-12-31', // перенос выходного с 04.01.2026
]);

const makeHolidayKeys = (year: number) => {
  if (year === 2026) {
    return Array.from(PRODUCTION_CALENDAR_2026_NON_WORKING_DAYS);
  }

  const statutoryDays: Array<[number, number]> = [
    [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8],
    [2, 23],
    [3, 8],
    [5, 1], [5, 9],
    [6, 12],
    [11, 4],
  ];

  return statutoryDays.map(([month, day]) => format(new Date(year, month - 1, day), 'yyyy-MM-dd'));
};

const countWorkingDaysUntil = (from: Date, to: Date, holidayKeys: Set<string>) => {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (end.getTime() <= start.getTime()) return 0;

  const cursor = new Date(start);
  let count = 0;

  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const key = format(cursor, 'yyyy-MM-dd');
    if (!isWeekend(cursor) && !holidayKeys.has(key)) {
      count += 1;
    }
  }

  return count;
};

const parseDateInputValue = (value: string) => {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const isPastEventDate = (date: Date, today: Date) => startOfDay(date).getTime() < today.getTime();
const toMonthKey = (date: Date) => format(date, 'yyyy-MM');
const normalizeEventId = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return crypto.randomUUID();
};
const normalizeEventUpdatedAt = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : new Date().toISOString();
const normalizeCalendarKey = (value: unknown): CalendarKey => {
  if (value === 'directorate' || value === 'prp' || value === 'other') return value;
  return 'directorate';
};

const normalizeEventStatusByDate = (status: EventStatus, date: Date, today: Date): EventStatus => {
  if (isPastEventDate(date, today)) return 'passed';
  return status === 'passed' ? 'not_started' : status;
};

const modalCalendarClassNames = {
  months: 'flex flex-col gap-2',
  month: 'flex flex-col gap-2',
  caption_label: 'text-sm font-semibold text-white',
  head_cell: 'w-9 text-[10px] font-semibold uppercase text-gray-400',
  row: 'mt-1 flex w-full',
  day: 'h-9 w-9 rounded-md p-0 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:text-white',
  day_today: 'border border-white/20 bg-white/5 text-white',
  day_selected: 'bg-emerald-600 text-white hover:bg-emerald-500',
  day_outside: 'text-gray-600 opacity-50',
  nav_button: 'h-7 w-7 border border-white/10 bg-white/5 p-0 text-gray-200 hover:bg-white/10',
};

export function EventsDashboard() {
  const { isEditingMode, setIsEditingMode } = useOutletContext<OutletContext>();
  const today = useMemo(() => startOfDay(new Date()), []);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const nextMonthDate = useMemo(
    () => addMonths(new Date(currentYear, currentMonth, 1), 1),
    [currentMonth, currentYear],
  );
  const [calendarStartMonth, setCalendarStartMonth] = useState<Date>(() =>
    startOfMonth(new Date(currentYear, currentMonth, 1)),
  );

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditModeAuthorized, setIsEditModeAuthorized] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddDatePopoverOpen, setIsAddDatePopoverOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isDetailDatePopoverOpen, setIsDetailDatePopoverOpen] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState<CalendarKey>('directorate');
  const [pendingCreateDate, setPendingCreateDate] = useState<Date | null>(null);
  const [detailDraft, setDetailDraft] = useState<DetailDraft | null>(null);
  const [newEventDraft, setNewEventDraft] = useState<AddEventDraft>({
    title: '',
    date: format(today, 'yyyy-MM-dd'),
    description: '',
    color: 'blue',
    status: 'not_started',
  });
  const baseEventsRef = useRef<EventItem[]>([]);

  const holidayKeys = useMemo(() => {
    const firstVisibleMonth = startOfMonth(calendarStartMonth);
    const secondVisibleMonth = addMonths(firstVisibleMonth, 1);
    const years = new Set<number>([firstVisibleMonth.getFullYear(), secondVisibleMonth.getFullYear()]);
    return new Set(Array.from(years).flatMap((year) => makeHolidayKeys(year)));
  }, [calendarStartMonth]);

  const defaultEvents = useMemo<EventItem[]>(() => {
    const entries: Array<Omit<EventItem, 'id' | 'updatedAt'>> = [
      {
        title: 'Закрытие квартального отчета',
        description: 'Согласовать финальную версию квартального отчета и статус ключевых рисков.',
        date: new Date(currentYear, currentMonth, 6),
        color: 'green',
        status: 'in_progress',
        calendarKey: 'directorate',
      },
      {
        title: 'Ревью KPI дирекции',
        description: 'Подготовить сводку KPI и подтвердить отклонения относительно плана.',
        date: new Date(currentYear, currentMonth, 12),
        color: 'blue',
        status: 'not_started',
        calendarKey: 'directorate',
      },
      {
        title: 'Синхронизация продуктовых стримов',
        description: 'Уточнить зависимости между стримами и финальные сроки релизов.',
        date: new Date(currentYear, currentMonth, 18),
        color: 'amber',
        status: 'in_progress',
        calendarKey: 'directorate',
      },
      {
        title: 'Комитет по рискам',
        description: 'Проверить критические риски и определить компенсирующие действия.',
        date: new Date(currentYear, currentMonth, 24),
        color: 'red',
        status: 'ready',
        calendarKey: 'directorate',
      },
      {
        title: 'Планирование следующего месяца',
        description: 'Утвердить фокус следующего месяца и распределение зон ответственности.',
        date: new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 4),
        color: 'violet',
        status: 'not_started',
        calendarKey: 'directorate',
      },
      {
        title: 'Запуск обновления витрины',
        description: 'Подготовить релизную заметку и финальную проверку релиз-чеклиста.',
        date: new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 11),
        color: 'emerald',
        status: 'in_progress',
        calendarKey: 'directorate',
      },
      {
        title: 'ПрП: согласование дорожной карты',
        description: 'Проверить этапы ПрП и утвердить владельцев задач.',
        date: new Date(currentYear, currentMonth, 9),
        color: 'blue',
        status: 'not_started',
        calendarKey: 'prp',
      },
      {
        title: 'ПрП: контроль milestone',
        description: 'Сверка выполнения milestone по блоку ПрП.',
        date: new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 15),
        color: 'violet',
        status: 'in_progress',
        calendarKey: 'prp',
      },
      {
        title: 'Прочее: организационный слот',
        description: 'Буфер под организационные события команды.',
        date: new Date(currentYear, currentMonth, 21),
        color: 'amber',
        status: 'not_started',
        calendarKey: 'other',
      },
    ];

    const nowIso = new Date().toISOString();
    return entries.map((item) => ({ id: crypto.randomUUID(), updatedAt: nowIso, ...item }));
  }, [currentMonth, currentYear, nextMonthDate]);

  const parseStorageEvents = useCallback((rawEvents: any[]): EventItem[] =>
    rawEvents.map((item: any) => {
      const rawDate = typeof item.date === 'string' ? item.date : '';
      const parsedDate = rawDate
        ? new Date(`${rawDate}T00:00:00`)
        : item.date instanceof Date
          ? item.date
          : new Date();

      const description = typeof item.description === 'string'
        ? item.description
        : typeof item.title === 'string'
          ? item.title
          : '';

      const status = normalizeEventStatusByDate(normalizeStatus(item.status), parsedDate, today);

      return {
        id: normalizeEventId(item.id),
        title:
          typeof item.title === 'string' && item.title.trim().length > 0
            ? item.title.trim()
            : deriveEventTitle(description, 'Событие'),
        description: description.trim(),
        date: parsedDate,
        color: isEventColor(item.color) ? item.color : 'blue',
        status,
        updatedAt: normalizeEventUpdatedAt(item.updatedAt),
        calendarKey: normalizeCalendarKey(item.calendarKey),
      } as EventItem;
    }), [today]);

  useEffect(() => {
    if (isEditingMode && !isEditModeAuthorized) {
      setIsPasswordModalOpen(true);
      return;
    }
    if (!isEditingMode) {
      setIsPasswordModalOpen(false);
      setIsEditModeAuthorized(false);
    }
  }, [isEditingMode, isEditModeAuthorized]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await eventsAPI.get();
        const source = Array.isArray(result) ? result : result?.events;
        const base = Array.isArray(source) && source.length > 0 ? source : defaultEvents;
        const parsed = parseStorageEvents(base);

        setEvents(parsed);
        baseEventsRef.current = parsed;
      } catch (err) {
        console.error('Failed to load events:', err);
        setEvents(defaultEvents);
        baseEventsRef.current = defaultEvents;
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [defaultEvents, parseStorageEvents]);

  useEffect(() => {
    const unsubscribe = eventsAPI.subscribe(async () => {
      try {
        const latest = await eventsAPI.get();
        const source = Array.isArray(latest) ? latest : latest?.events;
        if (!Array.isArray(source)) return;
        const parsed = parseStorageEvents(source);
        setEvents(parsed);
        baseEventsRef.current = parsed;
      } catch (err) {
        console.error('Failed to sync events in realtime:', err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [parseStorageEvents]);

  useEffect(() => {
    setSelectedEventId(null);
  }, [activeCalendar]);

  const activeEvents = useMemo(
    () => events.filter((event) => event.calendarKey === activeCalendar),
    [activeCalendar, events],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    activeEvents.forEach((event) => {
      const key = format(event.date, 'yyyy-MM-dd');
      const existing = map.get(key) || [];
      existing.push(event);
      map.set(key, existing);
    });
    return map;
  }, [activeEvents]);

  const visibleMonthKeys = useMemo(() => {
    const firstMonth = startOfMonth(calendarStartMonth);
    const secondMonth = addMonths(firstMonth, 1);
    return new Set<string>([toMonthKey(firstMonth), toMonthKey(secondMonth)]);
  }, [calendarStartMonth]);

  const listItems = useMemo(() => {
    const visibleEvents = activeEvents.filter((event) => visibleMonthKeys.has(toMonthKey(event.date)));
    return visibleEvents.sort((a, b) => {
      const aPast = isPastEventDate(a.date, today);
      const bPast = isPastEventDate(b.date, today);
      if (aPast !== bPast) return aPast ? 1 : -1;
      return a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id);
    });
  }, [activeEvents, today, visibleMonthKeys]);
  const firstPastIndex = useMemo(
    () => listItems.findIndex((event) => isPastEventDate(event.date, today)),
    [listItems, today],
  );

  const nearestFutureEvent = useMemo(
    () => listItems.find((item) => startOfDay(item.date).getTime() >= today.getTime()) ?? null,
    [listItems, today],
  );

  const nearestFutureLabel = useMemo(() => {
    if (!nearestFutureEvent) {
      return 'Ближайших будущих событий нет';
    }

    if (isSameDay(nearestFutureEvent.date, today)) {
      return 'Ближайшее событие: сегодня';
    }

    const workingDays = countWorkingDaysUntil(today, nearestFutureEvent.date, holidayKeys);

    const mod10 = workingDays % 10;
    const mod100 = workingDays % 100;
    let suffix = 'раб. дней';
    if (mod10 === 1 && mod100 !== 11) suffix = 'раб. день';
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) suffix = 'раб. дня';

    return `Ближайшее событие через ${workingDays} ${suffix}`;
  }, [holidayKeys, nearestFutureEvent, today]);

  const selectedEvent = useMemo(
    () => (selectedEventId == null ? null : events.find((event) => event.id === selectedEventId) ?? null),
    [events, selectedEventId],
  );
  const newEventDraftDate = useMemo(() => parseDateInputValue(newEventDraft.date), [newEventDraft.date]);
  const detailDraftDate = useMemo(() => parseDateInputValue(detailDraft?.dateInput ?? ''), [detailDraft?.dateInput]);

  useEffect(() => {
    if (!selectedEvent) {
      setDetailDraft(null);
      return;
    }

    setDetailDraft({
      id: selectedEvent.id,
      title: selectedEvent.title,
      description: selectedEvent.description,
      dateInput: format(selectedEvent.date, 'yyyy-MM-dd'),
      color: selectedEvent.color,
      status: selectedEvent.status,
    });
  }, [selectedEvent]);

  const toStorageEvent = (event: EventItem) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    date: format(event.date, 'yyyy-MM-dd'),
    color: event.color,
    status: event.status,
    updatedAt: event.updatedAt,
    calendarKey: event.calendarKey,
  });

  const persistEvents = async (localEvents: EventItem[]) => {
    try {
      setLoading(true);
      const isSameData = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
      const baseEvents = baseEventsRef.current || [];
      const baseMap = new Map<string, EventItem>(baseEvents.map((event) => [event.id, event]));
      const localMap = new Map<string, EventItem>(localEvents.map((event) => [event.id, event]));
      const maxAttempts = 5;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const latestSnapshot = await eventsAPI.getSnapshot();
        const latestEvents = parseStorageEvents(latestSnapshot.events || []);
        const mergedMap = new Map<string, EventItem>(latestEvents.map((event) => [event.id, event]));

        const ids = new Set<string>([
          ...Array.from(baseMap.keys()),
          ...Array.from(localMap.keys()),
        ]);

        ids.forEach((id) => {
          const baseEvent = baseMap.get(id);
          const localEvent = localMap.get(id);

          if (baseEvent && !localEvent) {
            mergedMap.delete(id);
            return;
          }

          if (!baseEvent && localEvent) {
            mergedMap.set(id, localEvent);
            return;
          }

          if (baseEvent && localEvent && !isSameData(baseEvent, localEvent)) {
            mergedMap.set(id, localEvent);
          }
        });

        const mergedEvents = Array.from(mergedMap.values()).sort((a, b) => a.id.localeCompare(b.id));
        const payload = mergedEvents.map(toStorageEvent);
        const saveResult = await eventsAPI.saveWithSnapshot(payload, {
          rowId: latestSnapshot.rowId,
          updatedAt: latestSnapshot.updatedAt,
        });

        if (saveResult.conflict) {
          continue;
        }

        setEvents(mergedEvents);
        baseEventsRef.current = mergedEvents;
        return mergedEvents;
      }

      throw new Error('Конфликт параллельного сохранения. Повторите действие.');
    } catch (err) {
      alert('Ошибка при сохранении: ' + (err as any).message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (prefillDate?: Date) => {
    const nextDate = prefillDate ? startOfDay(prefillDate) : today;
    setIsAddDatePopoverOpen(false);
    setNewEventDraft({
      title: '',
      date: format(nextDate, 'yyyy-MM-dd'),
      description: '',
      color: 'blue',
      status: 'not_started',
    });
    setIsAddModalOpen(true);
  };

  const requestCreateOnDate = (date: Date) => {
    setPendingCreateDate(startOfDay(date));
  };

  const createEventFromDraft = async () => {
    const trimmedTitle = newEventDraft.title.trim();
    const trimmedDescription = newEventDraft.description.trim();
    if (!newEventDraft.date) {
      alert('Укажите дату события');
      return;
    }
    if (!trimmedTitle) {
      alert('Добавьте название события');
      return;
    }

    const parsedDate = new Date(`${newEventDraft.date}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      alert('Некорректная дата');
      return;
    }

    const nowIso = new Date().toISOString();
    const newEvent: EventItem = {
      id: crypto.randomUUID(),
      date: parsedDate,
      color: newEventDraft.color,
      status: normalizeEventStatusByDate(newEventDraft.status, parsedDate, today),
      description: trimmedDescription,
      title: trimmedTitle,
      updatedAt: nowIso,
      calendarKey: activeCalendar,
    };

    const nextEvents = [newEvent, ...events];
    setEvents(nextEvents);
    setIsAddDatePopoverOpen(false);
    setIsAddModalOpen(false);
    setSelectedEventId(null);
    await persistEvents(nextEvents);
  };

  const removeEvent = async (id: string) => {
    const nextEvents = events.filter((event) => event.id !== id);
    setEvents(nextEvents);
    if (selectedEventId === id) {
      setSelectedEventId(null);
    }
    await persistEvents(nextEvents);
  };

  const applyDetailDraft = async () => {
    if (!detailDraft) return;
    const parsedDate = new Date(`${detailDraft.dateInput}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      alert('Некорректная дата события');
      return;
    }

    const title = detailDraft.title.trim();
    if (!title) {
      alert('Название не может быть пустым');
      return;
    }

    const nextEvents = events.map((event) =>
      event.id === detailDraft.id
        ? {
            ...event,
            date: parsedDate,
            color: detailDraft.color,
            status: normalizeEventStatusByDate(detailDraft.status, parsedDate, today),
            description: detailDraft.description.trim(),
            title,
            updatedAt: new Date().toISOString(),
          }
        : event,
    );

    setEvents(nextEvents);
    setIsDetailDatePopoverOpen(false);
    setSelectedEventId(null);
    await persistEvents(nextEvents);
  };

  const isDetailDateInPast = detailDraftDate ? isPastEventDate(detailDraftDate, today) : false;

  if (loading && events.length === 0) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 pt-4">
      <div className="mx-auto max-w-5xl space-y-2.5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {CALENDAR_OPTIONS.map((option) => {
              const isActive = option.key === activeCalendar;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setActiveCalendar(option.key)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                    isActive
                      ? 'border-red-500/50 bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/20'
                      : 'border-white/15 bg-white/5 text-gray-300 hover:border-white/25 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[462px_minmax(0,1fr)] xl:[grid-template-rows:520px]">
            <div className="relative rounded-2xl border border-white/5 bg-[#0a0a0a]/40 p-2 pb-2">
              <div className="pointer-events-none absolute left-2 right-2 top-2 z-10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCalendarStartMonth((prev) => addMonths(prev, -1))}
                  className="pointer-events-auto rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-gray-200 transition hover:bg-white/10 hover:text-white"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarStartMonth((prev) => addMonths(prev, 1))}
                  className="pointer-events-auto rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-gray-200 transition hover:bg-white/10 hover:text-white"
                >
                  →
                </button>
              </div>

              <Calendar
                locale={ru}
                numberOfMonths={2}
                month={calendarStartMonth}
                onMonthChange={(month) => setCalendarStartMonth(startOfMonth(month))}
                onDayClick={(date) => {
                  requestCreateOnDate(date);
                }}
                className="mx-auto w-fit p-0"
                classNames={{
                  months: 'flex flex-col gap-0.5',
                  month: 'mx-auto flex w-fit flex-col gap-0.5 [&:nth-child(2)]:mt-[6px]',
                  caption: 'relative mb-0.5 flex items-center justify-center',
                  caption_label: 'text-lg font-bold text-white',
                  head_cell:
                    'w-[2.72rem] text-[12px] font-semibold uppercase text-gray-400 [&:nth-child(6)]:text-red-400 [&:nth-child(7)]:text-red-400',
                  row: 'mt-0 flex w-full',
                  day: cn(
                    buttonVariants({ variant: 'ghost' }),
                    'h-[2.3rem] w-[2.72rem] rounded-md p-0 text-[15px] font-semibold text-gray-200 aria-selected:opacity-100 hover:bg-white/15 hover:text-white focus:bg-white/15 focus:text-white',
                  ),
                  day_today: 'bg-transparent text-inherit',
                  day_outside: 'text-gray-600 opacity-50',
                  nav: 'hidden',
                }}
                components={{
                  DayContent: ({ date }) => {
                    const key = format(date, 'yyyy-MM-dd');
                    const dayEvents = eventsByDay.get(key) || [];
                    const primaryEvent = dayEvents[0];
                    const visibleEventIndicators = dayEvents.slice(0, 3);
                    const extraEventsCount = Math.max(dayEvents.length - 3, 0);
                    const tooltip = primaryEvent
                      ? dayEvents.length > 1
                        ? `${primaryEvent.title} (+${dayEvents.length - 1})`
                        : primaryEvent.title
                      : '';
                    const weekendOrHoliday = isWeekend(date) || holidayKeys.has(key);
                    const isCurrentDay = isSameDay(date, today);

                    const dayClass = isCurrentDay
                      ? 'border border-red-400/80 bg-red-500 text-white'
                        : primaryEvent
                        ? `border ${colorStyles[primaryEvent.color].calendarBorder} ${colorStyles[primaryEvent.color].calendarBg} ${colorStyles[primaryEvent.color].calendarText} shadow-[0_0_0_1px_rgba(255,255,255,0.16)]`
                        : weekendOrHoliday
                          ? 'border border-transparent bg-transparent text-red-400'
                          : 'border border-transparent bg-transparent text-gray-200';

                    return (
                      <div className="group/day relative flex h-[2.3rem] w-[2.72rem] items-center justify-center">
                        {tooltip && (
                          <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/15 bg-[#141821] px-2 py-1 text-[11px] font-medium text-gray-100 opacity-0 shadow-xl transition-opacity group-hover/day:opacity-100">
                            {tooltip}
                          </span>
                        )}
                        {extraEventsCount > 0 && (
                          <span className="absolute right-0 top-0 z-20 rounded-full border border-white/20 bg-[#1B2030] px-1 text-[9px] font-bold leading-[1.2] text-gray-100">
                            +{extraEventsCount}
                          </span>
                        )}
                        <span className={cn('flex h-[2.12rem] w-[2.12rem] items-center justify-center rounded-[8px] text-[15px] font-semibold', dayClass)}>
                          {date.getDate()}
                        </span>
                        {visibleEventIndicators.length > 0 && (
                          <span className="pointer-events-none absolute bottom-0.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-[#141821]/90 px-1 py-[1px]">
                            {visibleEventIndicators.map((event) => (
                              <span
                                key={event.id}
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full ring-1 ring-[#141821]',
                                  colorStyles[event.color].dot,
                                )}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                    );
                  },
                }}
              />
            </div>

            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a]/35 p-3 xl:h-[520px]">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="relative px-1 py-1.5 pr-20 sm:max-w-[calc(100%-176px)] sm:flex-1">
                  <div className="whitespace-nowrap text-[30px] font-bold leading-[1.05] text-white md:text-[40px]">
                    {format(today, 'd MMMM yyyy', { locale: ru })}
                  </div>
                  <div className="mt-0.5 text-sm text-amber-300">{nearestFutureLabel}</div>
                  <span className="absolute bottom-2 right-2.5 text-xs text-gray-400">Всего: {listItems.length}</span>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1 self-start sm:pr-2 sm:self-auto">
                  <button
                    onClick={() => openAddModal()}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-emerald-600"
                  >
                    <Plus size={14} />
                    Добавить событие
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1">
                <div className="pointer-events-none absolute right-0.5 top-0 h-full w-1 rounded-full bg-white/12" />
                <div className="h-full min-h-0 overflow-y-scroll pr-3 [scrollbar-color:rgba(248,250,252,0.55)_rgba(255,255,255,0.10)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200/55 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/10">
                  <div className="flex min-h-full flex-col gap-2 justify-start">
                    {listItems.map((event, index) => {
                      const isPast = isPastEventDate(event.date, today);

                      return (
                        <div key={event.id}>
                          {index === firstPastIndex && (
                            <div className="mb-1 mt-2 w-full border-t border-white/15 pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                              Прошедшие события
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedEventId(event.id)}
                            className={cn(
                              'w-full rounded-xl border p-2 text-left transition-all focus-visible:ring-2 focus-visible:ring-blue-500',
                              isPast
                                ? `border-white/5 bg-[#10131B]/55 hover:border-white/10 hover:bg-[#141923] ${index === firstPastIndex ? 'mt-[10px]' : ''}`
                                : 'border-white/10 bg-[#141821] hover:border-white/20 hover:bg-[#1A1F2A]',
                            )}
                          >
                            <div
                              className={cn(
                                'rounded-lg border px-3 py-1.5',
                                colorStyles[event.color].titleBg,
                                colorStyles[event.color].titleBorder,
                                isPast && 'opacity-65 saturate-50',
                              )}
                            >
                              <div className={cn('flex items-center gap-2', isPast ? 'text-gray-300' : 'text-white')}>
                                <span className={cn('h-2.5 w-2.5 rounded-full', colorStyles[event.color].dot)} />
                                <span className="line-clamp-1 text-[14px] font-semibold">{event.title}</span>
                              </div>
                            </div>

                            <div className="mt-1.5 flex items-center justify-between">
                              <span className={cn('text-sm font-semibold', isPast ? 'text-gray-500' : 'text-gray-300')}>
                                {format(event.date, 'dd.MM.yyyy')}
                              </span>
                              <span
                                className={cn(
                                  'rounded-full border px-2 py-0.5 text-[11px]',
                                  statusChipClasses[event.status],
                                  isPast && 'opacity-70',
                                )}
                              >
                                {STATUS_LABELS[event.status]}
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-20" aria-hidden="true" />

      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => {
              setIsAddDatePopoverOpen(false);
              setIsAddModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-[#141821] p-5 shadow-2xl">
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => {
                  setIsAddDatePopoverOpen(false);
                  setIsAddModalOpen(false);
                }}
                className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={cn(
                'rounded-xl border px-4 py-3',
                colorStyles[newEventDraft.color].titleBg,
                colorStyles[newEventDraft.color].titleBorder,
              )}
            >
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">Название события</label>
              <div className="mt-2 flex items-center gap-2 text-white">
                <span className={cn('h-3 w-3 rounded-full', colorStyles[newEventDraft.color].dot)} />
                <input
                  type="text"
                  value={newEventDraft.title}
                  onChange={(e) => setNewEventDraft((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/50"
                  placeholder="Название события"
                />
              </div>
              <div className={cn('mt-1 text-xs', colorStyles[newEventDraft.color].titleSubtext)}>
                Цвет события задается подложкой названия
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Индикаторы</div>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((color) => {
                  const selected = newEventDraft.color === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewEventDraft((prev) => ({ ...prev, color }))}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all',
                        selected ? colorStyles[color].titleBorder : 'border-white/20',
                        'cursor-pointer',
                      )}
                    >
                      <span className={cn('h-3 w-3 rounded-full', colorStyles[color].dot)} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Дата</label>
                  <Popover open={isAddDatePopoverOpen} onOpenChange={setIsAddDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border border-gray-700/50 bg-[#1A1F2A] px-3 py-2 text-left text-sm text-white"
                      >
                        <span>{newEventDraftDate ? format(newEventDraftDate, 'dd.MM.yyyy') : 'Выберите дату'}</span>
                        <CalendarDays size={16} className="text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="z-[160] w-auto border border-white/10 bg-[#141821] p-2">
                      <Calendar
                        mode="single"
                        locale={ru}
                        selected={newEventDraftDate}
                        onSelect={(date) => {
                          if (!date) return;
                          setNewEventDraft((prev) => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
                          setIsAddDatePopoverOpen(false);
                        }}
                        className="p-0"
                        classNames={modalCalendarClassNames}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Статус</label>
                  <select
                    value={newEventDraft.status}
                    onChange={(e) => setNewEventDraft((prev) => ({ ...prev, status: e.target.value as EventStatus }))}
                    className="w-full rounded-lg border border-gray-700/50 bg-[#1A1F2A] px-3 py-2 text-sm text-white"
                  >
                    {EDITABLE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Описание (опционально)</label>
                <textarea
                  value={newEventDraft.description}
                  onChange={(e) => setNewEventDraft((prev) => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  className="w-full resize-none rounded-xl border border-gray-700/50 bg-[#1A1F2A] px-3 py-2 text-sm text-gray-100"
                  placeholder="Добавьте описание события"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddDatePopoverOpen(false);
                  setIsAddModalOpen(false);
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={createEventFromDraft}
                className="rounded-lg border border-red-500/40 bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                Сохранить событие
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingCreateDate && (
        <div className="fixed inset-0 z-[121] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPendingCreateDate(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-gray-700/30 bg-[#1a1a1a] p-8 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setPendingCreateDate(null)}
              className="absolute right-4 top-4 text-gray-500 transition-colors hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Добавление события</h3>
              <p className="mt-2 text-sm text-gray-400">
                Вы хотите добавить событие на дату {format(pendingCreateDate, 'dd.MM.yyyy')}?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingCreateDate(null)}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2.5 text-white transition-colors hover:bg-gray-600"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  const date = pendingCreateDate;
                  setPendingCreateDate(null);
                  if (date) openAddModal(date);
                }}
                className="flex-1 rounded-lg border border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-emerald-600"
              >
                Да, добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && detailDraft && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => {
              setIsDetailDatePopoverOpen(false);
              setSelectedEventId(null);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-[#141821] p-5 shadow-2xl">
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => {
                  setIsDetailDatePopoverOpen(false);
                  setSelectedEventId(null);
                }}
                className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={cn(
                'rounded-xl border px-4 py-3',
                colorStyles[detailDraft.color].titleBg,
                colorStyles[detailDraft.color].titleBorder,
              )}
            >
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">Название события</label>
              <div className="mt-2 flex items-center gap-2 text-white">
                <span className={cn('h-3 w-3 rounded-full', colorStyles[detailDraft.color].dot)} />
                <input
                  type="text"
                  value={detailDraft.title}
                  onChange={(e) => setDetailDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                  className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/50"
                  placeholder="Название события"
                />
              </div>
              <div className={cn('mt-1 text-xs', colorStyles[detailDraft.color].titleSubtext)}>
                Цвет события задается подложкой названия
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Индикаторы</div>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((color) => {
                  const selected = detailDraft.color === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setDetailDraft((prev) => (prev ? { ...prev, color } : prev))}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all',
                        selected ? colorStyles[color].titleBorder : 'border-white/20',
                        'cursor-pointer',
                      )}
                    >
                      <span className={cn('h-3 w-3 rounded-full', colorStyles[color].dot)} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Дата</label>
                  <Popover open={isDetailDatePopoverOpen} onOpenChange={setIsDetailDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border border-gray-700/50 bg-[#1A1F2A] px-3 py-2 text-left text-sm text-white"
                      >
                        <span>{detailDraftDate ? format(detailDraftDate, 'dd.MM.yyyy') : 'Выберите дату'}</span>
                        <CalendarDays size={16} className="text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="z-[160] w-auto border border-white/10 bg-[#141821] p-2">
                      <Calendar
                        mode="single"
                        locale={ru}
                        selected={detailDraftDate}
                        onSelect={(date) => {
                          if (!date) return;
                          setDetailDraft((prev) => (prev ? { ...prev, dateInput: format(date, 'yyyy-MM-dd') } : prev));
                          setIsDetailDatePopoverOpen(false);
                        }}
                        className="p-0"
                        classNames={modalCalendarClassNames}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Статус</label>
                  {isDetailDateInPast ? (
                    <div className="w-full rounded-lg border border-slate-500/40 bg-slate-500/10 px-3 py-2 text-sm font-semibold text-slate-200">
                      {STATUS_LABELS.passed}
                    </div>
                  ) : (
                    <select
                      value={detailDraft.status === 'passed' ? 'not_started' : detailDraft.status}
                      onChange={(e) =>
                        setDetailDraft((prev) => (prev ? { ...prev, status: e.target.value as EventStatus } : prev))
                      }
                      className="w-full rounded-lg border border-gray-700/50 bg-[#1A1F2A] px-3 py-2 text-sm text-white"
                    >
                      {EDITABLE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Описание (опционально)</label>
                <textarea
                  value={detailDraft.description}
                  onChange={(e) => setDetailDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                  rows={6}
                  className="w-full resize-none rounded-xl border border-gray-700/50 bg-[#1A1F2A] px-3 py-2 text-sm text-gray-100"
                  placeholder="Добавьте описание события"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => removeEvent(detailDraft.id)}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20"
              >
                Удалить событие
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDetailDatePopoverOpen(false);
                  setSelectedEventId(null);
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={applyDetailDraft}
                className="rounded-lg border border-red-500/40 bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      )}

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setIsEditingMode(false);
        }}
        onSuccess={() => {
          setIsPasswordModalOpen(false);
          setIsEditModeAuthorized(true);
        }}
      />
    </div>
  );
}
