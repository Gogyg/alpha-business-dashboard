import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router';
import { CalendarDays, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { buttonVariants } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { PasswordModal } from '../components/PasswordModal';
import { eventsAPI } from '../utils/api';
import { addMonths, format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

interface OutletContext {
  currentQuarter: string;
  setCurrentQuarter: (quarter: string) => void;
  currentYear: number;
  isEditingMode: boolean;
  setIsEditingMode: (value: boolean) => void;
}

interface EventItem {
  id: number;
  title: string;
  date: Date;
  color: 'emerald' | 'blue' | 'amber' | 'red' | 'violet';
  tag: string;
}

const colorClasses = {
  emerald: {
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  },
  blue: {
    dot: 'bg-blue-400',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  },
  amber: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  },
  red: {
    dot: 'bg-red-400',
    badge: 'bg-red-500/15 text-red-300 border-red-500/20',
  },
  violet: {
    dot: 'bg-violet-400',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  },
};

export function EventsDashboard() {
  const { isEditingMode, setIsEditingMode } = useOutletContext<OutletContext>();
  const today = useMemo(() => new Date(), []);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const nextMonthDate = useMemo(
    () => addMonths(new Date(currentYear, currentMonth, 1), 1),
    [currentMonth, currentYear],
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [originalEvents, setOriginalEvents] = useState<EventItem[]>([]);

  const defaultEvents = useMemo<EventItem[]>(
    () => [
      {
        id: 1,
        title: 'Закрытие квартального отчета',
        date: new Date(currentYear, currentMonth, 6),
        color: 'emerald',
        tag: 'Финансы',
      },
      {
        id: 2,
        title: 'Ревью KPI дирекции',
        date: new Date(currentYear, currentMonth, 12),
        color: 'blue',
        tag: 'KPI',
      },
      {
        id: 3,
        title: 'Синхронизация продуктовых стримов',
        date: new Date(currentYear, currentMonth, 18),
        color: 'amber',
        tag: 'Стримы',
      },
      {
        id: 4,
        title: 'Комитет по рискам',
        date: new Date(currentYear, currentMonth, 24),
        color: 'red',
        tag: 'Риски',
      },
      {
        id: 5,
        title: 'Планирование следующего месяца',
        date: new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 4),
        color: 'violet',
        tag: 'Планирование',
      },
      {
        id: 6,
        title: 'Запуск обновления витрины',
        date: new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 11),
        color: 'blue',
        tag: 'Продукт',
      },
      {
        id: 7,
        title: 'День стабильности платформы',
        date: new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 17),
        color: 'emerald',
        tag: 'Стабильность',
      },
      {
        id: 8,
        title: 'Итоговая встреча с бизнесом',
        date: new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 25),
        color: 'amber',
        tag: 'Бизнес',
      },
    ],
    [currentMonth, currentYear, nextMonthDate],
  );

  useEffect(() => {
    if (isEditingMode && !isEditing) {
      setIsPasswordModalOpen(true);
    } else if (!isEditingMode) {
      setIsEditing(false);
    }
  }, [isEditingMode, isEditing]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await eventsAPI.get();
        const source = Array.isArray(result) ? result : result?.events;
        const base = Array.isArray(source) && source.length > 0 ? source : defaultEvents;
        const parsed = base.map((item: any, index: number) => {
          const rawDate = typeof item.date === 'string' ? item.date : '';
          const parsedDate = rawDate
            ? new Date(`${rawDate}T00:00:00`)
            : item.date instanceof Date
              ? item.date
              : new Date();
          return {
            id: typeof item.id === 'number' ? item.id : index + 1,
            title: item.title || 'Без названия',
            date: parsedDate,
            color: item.color || 'emerald',
            tag: item.tag || 'Событие',
          } as EventItem;
        });
        setEvents(parsed);
        setOriginalEvents(parsed);
      } catch (err) {
        console.error('Failed to load events:', err);
        setEvents(defaultEvents);
        setOriginalEvents(defaultEvents);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [defaultEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    events.forEach((event) => {
      const key = format(event.date, 'yyyy-MM-dd');
      const existing = map.get(key) || [];
      existing.push(event);
      map.set(key, existing);
    });
    return map;
  }, [events]);

  const listItems = useMemo(
    () =>
      [...events].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [events],
  );

  const legendItems = useMemo(() => {
    const map = new Map<string, { color: EventItem['color']; tag: string }>();
    events.forEach((event) => {
      const key = `${event.tag}-${event.color}`;
      if (!map.has(key)) {
        map.set(key, { color: event.color, tag: event.tag });
      }
    });
    return Array.from(map.values());
  }, [events]);

  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setIsEditing(true);
  };

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    setIsEditingMode(false);
  };

  const handleSave = async () => {
    if (!isEditing) return;
    try {
      setLoading(true);
      const payload = events.map((event) => ({
        ...event,
        date: format(event.date, 'yyyy-MM-dd'),
      }));
      await eventsAPI.save(payload);
      setOriginalEvents(events);
      setIsEditing(false);
      setIsEditingMode(false);
    } catch (err) {
      alert('Ошибка при сохранении: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEvents(originalEvents);
    setIsEditing(false);
    setIsEditingMode(false);
  };

  const updateEvent = (id: number, updates: Partial<EventItem>) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === id ? { ...event, ...updates } : event)),
    );
  };

  const addEvent = () => {
    const nextId = events.length > 0 ? Math.max(...events.map((e) => e.id)) + 1 : 1;
    const newEvent: EventItem = {
      id: nextId,
      title: 'Новое событие',
      date: today,
      color: 'blue',
      tag: 'Событие',
    };
    setEvents((prev) => [newEvent, ...prev]);
  };

  const deleteEvent = (id: number) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  const colorOptions: Array<{ value: EventItem['color']; label: string }> = [
    { value: 'emerald', label: 'Зеленый' },
    { value: 'blue', label: 'Синий' },
    { value: 'amber', label: 'Желтый' },
    { value: 'red', label: 'Красный' },
    { value: 'violet', label: 'Фиолетовый' },
  ];

  if (loading && events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-4 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
            <CalendarDays className="text-emerald-300" size={20} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Дашборд событий</h2>
            <p className="text-sm text-gray-400">Календарь важных встреч и ключевых контрольных точек</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">Текущий и следующий месяц</div>
              <div className="text-lg text-white font-semibold">
                {format(today, 'LLLL yyyy', { locale: ru })} · {format(nextMonthDate, 'LLLL yyyy', { locale: ru })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {legendItems.map((item) => (
                <span
                  key={`${item.tag}-${item.color}`}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${colorClasses[item.color].badge}`}
                >
                  <span className={`h-2 w-2 rounded-full ${colorClasses[item.color].dot}`} />
                  <span>{item.tag}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <Calendar
              locale={ru}
              numberOfMonths={2}
              pagedNavigation
              defaultMonth={today}
              className="rounded-2xl bg-[#0a0a0a]/40 border border-white/5 p-2 md:p-3"
              classNames={{
                months: 'flex flex-col xl:flex-row gap-8',
                month: 'flex flex-col gap-5',
                caption_label: 'text-base font-semibold text-white',
                head_cell: 'text-gray-400 rounded-md w-12 font-normal text-[0.85rem]',
                row: 'flex w-full mt-3',
                day: cn(
                  buttonVariants({ variant: 'ghost' }),
                  'size-12 p-0 font-normal text-gray-200 aria-selected:opacity-100',
                ),
                day_outside: 'text-gray-600 opacity-60',
                nav_button: 'text-gray-300 hover:text-white',
              }}
              modifiers={{
                hasEvent: (date) => {
                  const key = format(date, 'yyyy-MM-dd');
                  return eventsByDay.has(key);
                },
              }}
              modifiersClassNames={{
                hasEvent: 'bg-white/5 border border-white/10',
              }}
              components={{
                DayContent: ({ date }) => {
                  const key = format(date, 'yyyy-MM-dd');
                  const eventsForDay = eventsByDay.get(key) || [];

                  return (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-sm text-white/90">
                        {date.getDate()}
                      </span>
                      {eventsForDay.length > 0 && (
                        <span className="flex gap-1">
                          {eventsForDay.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className={`h-1.5 w-1.5 rounded-full ${colorClasses[event.color].dot}`}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  );
                },
              }}
            />

            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-500 uppercase tracking-wider">Список событий</div>
                  <div className="text-lg font-semibold text-white">Ближайшие 6 недель</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Всего: {listItems.length}</span>
                  {isEditing && (
                    <button
                      onClick={addEvent}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-all text-xs"
                    >
                      <Plus size={14} />Добавить
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                {listItems.map((event) => (
                  <div
                    key={event.id}
                    className="group flex items-start gap-3 rounded-2xl border border-white/5 bg-[#0a0a0a]/40 p-3 transition-all hover:border-white/10"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${colorClasses[event.color].dot}`}
                    />
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr] gap-2">
                          <input
                            type="text"
                            value={event.title}
                            onChange={(e) => updateEvent(event.id, { title: e.target.value })}
                            className="w-full bg-[#0a0a0a]/60 border border-gray-700/40 rounded-lg px-3 py-2 text-white text-sm"
                          />
                          <input
                            type="date"
                            value={format(event.date, 'yyyy-MM-dd')}
                            onChange={(e) => updateEvent(event.id, { date: new Date(`${e.target.value}T00:00:00`) })}
                            className="w-full bg-[#0a0a0a]/60 border border-gray-700/40 rounded-lg px-3 py-2 text-white text-sm"
                          />
                          <input
                            type="text"
                            value={event.tag}
                            onChange={(e) => updateEvent(event.id, { tag: e.target.value })}
                            className="w-full bg-[#0a0a0a]/60 border border-gray-700/40 rounded-lg px-3 py-2 text-white text-sm"
                          />
                          <select
                            value={event.color}
                            onChange={(e) => updateEvent(event.id, { color: e.target.value as EventItem['color'] })}
                            className="w-full bg-[#0a0a0a]/60 border border-gray-700/40 rounded-lg px-3 py-2 text-white text-sm"
                          >
                            {colorOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>{format(event.date, 'd MMMM', { locale: ru })}</span>
                            <span className="text-gray-600">•</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${colorClasses[event.color].badge}`}>
                              {event.tag}
                            </span>
                          </div>
                          <div className="text-white font-medium mt-1 group-hover:text-white/90">
                            {event.title}
                          </div>
                        </>
                      )}
                    </div>
                    {isEditing ? (
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <div className="text-xs text-gray-500">
                        {isSameDay(event.date, today) ? 'Сегодня' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="fixed bottom-8 right-8 flex gap-3 z-[100]">
            <button
              onClick={handleCancel}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
            >
              <Trash2 size={16} />Отменить
            </button>
            <button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/50 shadow-lg shadow-emerald-500/30 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
            >
              <Save size={16} />Сохранить
            </button>
          </div>
        )}
      </div>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handlePasswordCancel}
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
}
