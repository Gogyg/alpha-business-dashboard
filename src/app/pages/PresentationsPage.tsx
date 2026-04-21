import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { CalendarDays, Loader2, Plus, Trash2, X, Settings, FileUp } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '../components/dashboard_new/ui/card';
import { Button } from '../components/dashboard_new/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { PasswordModal } from '../components/PasswordModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/dashboard_new/ui/dialog';
import {
  presentationsAPI,
  type PresentationAssetPayload,
  type PresentationPagePayload,
  type PresentationPackagePayload,
} from '../utils/api';

interface OutletContext {
  isEditingMode: boolean;
  setIsEditingMode: (value: boolean) => void;
}

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file as text'));
    reader.readAsText(file);
  });

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file as base64'));
    reader.readAsDataURL(file);
  });

const isHtmlFile = (name: string) => /\.(html?|xhtml)$/i.test(name);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

const formatEventDate = (value: string | null) => {
  if (!value) return 'Не указана';
  const safeDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(safeDate.getTime())) return value;
  return formatDate(safeDate.toISOString());
};

const getTodayKey = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toPackagePath = (file: File) => {
  const customPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return (customPath && customPath.trim()) || file.name;
};

const parseDateInputValue = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatPickerDateLabel = (value: string | null | undefined) => {
  const parsed = parseDateInputValue(value);
  if (!parsed) return 'Выберите дату';
  return format(parsed, 'dd.MM.yyyy');
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

export function PresentationsPage() {
  const { isEditingMode, setIsEditingMode } = useOutletContext<OutletContext>();

  const [items, setItems] = useState<PresentationPackagePayload[]>([]);
  const [draftItems, setDraftItems] = useState<PresentationPackagePayload[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const loadItems = async () => {
    try {
      const data = await presentationsAPI.getAll();
      setItems(data);
      setDraftItems(data);
    } catch (err) {
      console.error('Failed to load presentations', err);
      setItems([]);
      setDraftItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    if (isEditingMode && !isEditing) {
      setIsPasswordModalOpen(true);
    } else if (!isEditingMode) {
      setIsEditing(false);
    }
  }, [isEditingMode, isEditing]);

  const visibleItems = useMemo(() => (isEditing ? draftItems : items), [draftItems, isEditing, items]);
  const todayKey = useMemo(() => getTodayKey(), []);

  const { activeItems, archivedItems } = useMemo(() => {
    const active: PresentationPackagePayload[] = [];
    const archived: PresentationPackagePayload[] = [];

    visibleItems.forEach((item) => {
      const isPast = !item.isRecurring && !!item.eventDate && item.eventDate < todayKey;
      if (isPast) {
        archived.push(item);
      } else {
        active.push(item);
      }
    });

    return { activeItems: active, archivedItems: archived };
  }, [todayKey, visibleItems]);

  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setIsEditing(true);
  };

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    setIsEditingMode(false);
  };

  const handleEditTitle = (id: string, title: string) => {
    setDraftItems((prev) => prev.map((item) => (item.id === id ? { ...item, title } : item)));
  };

  const handleEditEventDate = (id: string, eventDate: string | null) => {
    setDraftItems((prev) => prev.map((item) => (item.id === id ? { ...item, eventDate } : item)));
  };

  const handleEditRecurring = (id: string, isRecurring: boolean) => {
    setDraftItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRecurring } : item)));
  };

  const handleSaveStructure = async () => {
    try {
      const changed = draftItems.filter((item) => {
        const source = items.find((src) => src.id === item.id);
        return (
          source &&
          (source.title !== item.title ||
            source.eventDate !== item.eventDate ||
            source.isRecurring !== item.isRecurring)
        );
      });

      for (const item of changed) {
        await presentationsAPI.updateMeta(item.id, {
          title: item.title.trim() || 'Без названия',
          eventDate: item.eventDate || null,
          isRecurring: item.isRecurring,
        });
      }

      setIsEditing(false);
      setIsEditingMode(false);
      await loadItems();
      alert('Изменения сохранены!');
    } catch (err) {
      alert('Ошибка при сохранении: ' + (err as Error).message);
    }
  };

  const handleCancelEditing = async () => {
    setIsEditing(false);
    setIsEditingMode(false);
    await loadItems();
  };

  const handleDelete = async (id: string) => {
    await presentationsAPI.delete(id);
    await loadItems();
    setDeleteTarget(null);
  };

  const resetCreateModal = () => {
    setNewTitle('');
    setNewEventDate('');
    setNewIsRecurring(false);
    setNewFiles([]);
    setIsCreateModalOpen(false);
  };

  const buildPayloadFromFiles = async (files: File[]) => {
    const pages: PresentationPagePayload[] = [];
    const assets: PresentationAssetPayload[] = [];

    for (const file of files) {
      const fileName = toPackagePath(file);

      if (isHtmlFile(fileName)) {
        const htmlContent = await readFileAsText(file);
        pages.push({
          id: crypto.randomUUID(),
          fileName,
          htmlContent,
        });
        continue;
      }

      const isTextAsset = /^text\//.test(file.type) || /\.(css|js|json|map|svg|txt)$/i.test(fileName);
      const content = isTextAsset ? await readFileAsText(file) : await readFileAsBase64(file);

      assets.push({
        id: crypto.randomUUID(),
        fileName,
        mimeType: file.type || 'application/octet-stream',
        encoding: isTextAsset ? 'text' : 'base64',
        content,
      });
    }

    if (pages.length === 0) {
      throw new Error('Добавьте минимум один HTML-файл.');
    }

    return { pages, assets };
  };

  const handleCreate = async () => {
    try {
      const title = newTitle.trim();
      if (!title) {
        alert('Введите название пакета презентации.');
        return;
      }
      if (newFiles.length === 0) {
        alert('Загрузите HTML-файлы и связанные ассеты.');
        return;
      }

      setIsCreating(true);
      const payload = await buildPayloadFromFiles(newFiles);
      await presentationsAPI.create({
        title,
        eventDate: newEventDate || null,
        isRecurring: newIsRecurring,
        ...payload,
      });
      resetCreateModal();
      await loadItems();
    } catch (err) {
      alert('Ошибка при создании: ' + (err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-4 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Презентации</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {activeItems.map((item) => (
            <div key={item.id} className="relative group">
              {isEditing ? (
                <div className="h-[320px] w-full transition-all bg-white/[0.03] border border-white/10 rounded-3xl px-6 pt-8 flex flex-col items-center text-center overflow-hidden relative">
                  <CardHeader className="w-full p-0">
                    <div className="space-y-4 w-full">
                      <div className="bg-gradient-to-r from-[#34d399] to-[#3b82f6] bg-clip-text text-transparent text-[10px] font-bold uppercase tracking-widest mb-1">
                        Название
                      </div>
                      <input
                        value={item.title}
                        onChange={(event) => handleEditTitle(item.id, event.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xl font-bold text-center focus:border-[#34d399] outline-none transition-all"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white transition-all hover:border-[#34d399]/60"
                          >
                            <span>{formatPickerDateLabel(item.eventDate)}</span>
                            <CalendarDays size={16} className="text-gray-400" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="z-[160] w-auto border border-white/10 bg-[#141821] p-2">
                          <Calendar
                            mode="single"
                            locale={ru}
                            selected={parseDateInputValue(item.eventDate) ?? undefined}
                            onSelect={(date) => {
                              if (!date) return;
                              handleEditEventDate(item.id, format(date, 'yyyy-MM-dd'));
                            }}
                            className="p-0"
                            classNames={modalCalendarClassNames}
                          />
                        </PopoverContent>
                      </Popover>
                      <label className="flex items-center justify-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={item.isRecurring}
                          onChange={(event) => handleEditRecurring(item.id, event.target.checked)}
                          className="w-4 h-4"
                        />
                        Регулярная презентация
                      </label>
                    </div>
                  </CardHeader>

                  <CardContent className="w-full p-0 mt-6 h-auto relative z-20 space-y-4">
                    <div className="text-gray-400 text-sm">Страниц: {item.pages.length}</div>
                    <div className="text-gray-500 text-sm">Дата проведения: {formatEventDate(item.eventDate)}</div>
                  </CardContent>

                  <button
                    onClick={() => setDeleteTarget({ id: item.id, title: item.title })}
                    className="absolute top-4 right-4 p-2.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all z-[100] shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              ) : (
                <Link to={`/presentations/${item.id}`}>
                  <Card className="h-[220px] w-full transition-all bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 rounded-3xl px-7 py-7 flex flex-col justify-between text-center overflow-hidden relative cursor-pointer">
                    <CardHeader className="w-full p-0">
                      <div className="min-h-[82px] flex items-center justify-center">
                        <CardTitle className="text-[19px] md:text-[21px] font-bold bg-gradient-to-r from-[#34d399] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent leading-snug break-words whitespace-normal line-clamp-2">
                          {item.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="w-full p-0">
                      <div className="min-h-[54px] flex flex-col items-center justify-center gap-2">
                        <p className="text-white/85 font-medium text-lg leading-snug">Страниц: {item.pages.length}</p>
                        <p className="text-gray-400 text-sm">Дата проведения: {formatEventDate(item.eventDate)}</p>
                        {item.isRecurring ? <p className="text-emerald-300 text-xs">Регулярная</p> : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          ))}

          {isEditing && (
            <Card
              onClick={() => setIsCreateModalOpen(true)}
              className="h-[320px] w-full border border-dashed border-white/10 bg-transparent hover:bg-white/[0.02] hover:border-[#34d399]/30 transition-all cursor-pointer rounded-3xl flex flex-col items-center justify-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#34d399]/10 transition-colors">
                <Plus className="text-gray-500 group-hover:text-[#34d399] transition-colors" />
              </div>
              <span className="text-gray-500 group-hover:text-gray-300 transition-colors font-medium">Добавить новую презентацию</span>
            </Card>
          )}
        </div>

        {archivedItems.length > 0 && (
          <div className="space-y-4">
            <div className="pt-6 border-t border-white/10">
              <h2 className="text-2xl font-bold text-white">Архив</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {archivedItems.map((item) => (
                <div key={item.id} className="relative group">
                  {isEditing ? (
                    <div className="h-[320px] w-full transition-all bg-white/[0.02] border border-white/10 rounded-3xl px-6 pt-8 flex flex-col items-center text-center overflow-hidden relative opacity-85">
                      <CardHeader className="w-full p-0">
                        <div className="space-y-4 w-full">
                          <div className="bg-gradient-to-r from-[#34d399] to-[#3b82f6] bg-clip-text text-transparent text-[10px] font-bold uppercase tracking-widest mb-1">
                            Название
                          </div>
                          <input
                            value={item.title}
                            onChange={(event) => handleEditTitle(item.id, event.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xl font-bold text-center focus:border-[#34d399] outline-none transition-all"
                          />
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white transition-all hover:border-[#34d399]/60"
                              >
                                <span>{formatPickerDateLabel(item.eventDate)}</span>
                                <CalendarDays size={16} className="text-gray-400" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="z-[160] w-auto border border-white/10 bg-[#141821] p-2">
                              <Calendar
                                mode="single"
                                locale={ru}
                                selected={parseDateInputValue(item.eventDate) ?? undefined}
                                onSelect={(date) => {
                                  if (!date) return;
                                  handleEditEventDate(item.id, format(date, 'yyyy-MM-dd'));
                                }}
                                className="p-0"
                                classNames={modalCalendarClassNames}
                              />
                            </PopoverContent>
                          </Popover>
                          <label className="flex items-center justify-center gap-2 text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={item.isRecurring}
                              onChange={(event) => handleEditRecurring(item.id, event.target.checked)}
                              className="w-4 h-4"
                            />
                            Регулярная презентация
                          </label>
                        </div>
                      </CardHeader>

                      <CardContent className="w-full p-0 mt-6 h-auto relative z-20 space-y-4">
                        <div className="text-gray-400 text-sm">Страниц: {item.pages.length}</div>
                        <div className="text-gray-500 text-sm">Дата проведения: {formatEventDate(item.eventDate)}</div>
                      </CardContent>

                      <button
                        onClick={() => setDeleteTarget({ id: item.id, title: item.title })}
                        className="absolute top-4 right-4 p-2.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all z-[100] shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  ) : (
                    <Link to={`/presentations/${item.id}`}>
                      <Card className="h-[220px] w-full transition-all bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20 rounded-3xl px-7 py-7 flex flex-col justify-between text-center overflow-hidden relative cursor-pointer opacity-80">
                        <CardHeader className="w-full p-0">
                          <div className="min-h-[82px] flex items-center justify-center">
                            <CardTitle className="text-[19px] md:text-[21px] font-bold bg-gradient-to-r from-[#34d399] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent leading-snug break-words whitespace-normal line-clamp-2">
                              {item.title}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="w-full p-0">
                          <div className="min-h-[54px] flex flex-col items-center justify-center gap-2">
                            <p className="text-white/85 font-medium text-lg leading-snug">Страниц: {item.pages.length}</p>
                            <p className="text-gray-400 text-sm">Дата проведения: {formatEventDate(item.eventDate)}</p>
                            {item.isRecurring ? <p className="text-emerald-300 text-xs">Регулярная</p> : null}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="fixed bottom-8 right-8 flex gap-3 z-[100]">
          <Button onClick={() => void handleCancelEditing()} variant="outline" className="bg-white/5 border-white/10 text-white rounded-xl">
            <X size={16} className="mr-2" /> Отмена
          </Button>
          <Button onClick={() => void handleSaveStructure()} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
            <Settings size={16} className="mr-2" /> Сохранить структуру
          </Button>
        </div>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={(value) => (!isCreating ? setIsCreateModalOpen(value) : undefined)}>
        <DialogContent className="max-w-2xl bg-[#0a0a0a] border border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Новая презентация</DialogTitle>
            <DialogDescription className="text-gray-400">
              Загрузите один или несколько HTML-файлов и связанные ассеты. Внутренние ссылки между страницами будут обработаны в рамках пакета.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Название виджета-презентации</label>
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Например: Q2 Product Story"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#34d399] outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Дата проведения</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-left text-sm text-white transition-all hover:border-[#34d399]/60"
                    >
                      <span>{formatPickerDateLabel(newEventDate)}</span>
                      <CalendarDays size={16} className="text-gray-400" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="z-[160] w-auto border border-white/10 bg-[#141821] p-2">
                    <Calendar
                      mode="single"
                      locale={ru}
                      selected={parseDateInputValue(newEventDate) ?? undefined}
                      onSelect={(date) => {
                        if (!date) return;
                        setNewEventDate(format(date, 'yyyy-MM-dd'));
                      }}
                      className="p-0"
                      classNames={modalCalendarClassNames}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end pb-3">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={newIsRecurring}
                    onChange={(event) => setNewIsRecurring(event.target.checked)}
                    className="w-4 h-4"
                  />
                  Регулярная презентация
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Загрузить лендинг (HTML) и ассеты</label>
              <label className="w-full h-28 border border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#34d399]/40 hover:bg-white/[0.02] transition-all">
                <FileUp className="text-gray-400" size={24} />
                <span className="text-sm text-gray-300">Выбрать файлы</span>
                <input
                  type="file"
                  accept=".html,.htm,.css,.js,.json,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.woff,.woff2,.ttf,.otf"
                  multiple
                  className="hidden"
                  onChange={(event) => setNewFiles(Array.from(event.target.files || []))}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">Выбрано файлов: {newFiles.length}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={resetCreateModal}
              disabled={isCreating}
              className="bg-white/5 border-white/10 text-white"
            >
              Отмена
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={isCreating} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus size={16} className="mr-2" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void handleDelete(deleteTarget.id);
          }
        }}
        title={deleteTarget?.title || ''}
      />

      <PasswordModal isOpen={isPasswordModalOpen} onClose={handlePasswordCancel} onSuccess={handlePasswordSuccess} />
    </div>
  );
}
