import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { BarChart3, Target, ChevronLeft, ChevronRight, Edit3, X, Goal, Download, LogOut, CalendarDays, Settings, EyeOff, Eye, Save, TrendingUp, GripVertical, Plus, FileText, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type DragEvent } from 'react';
import logoImage from '../../assets/5b6ead3363f3911c8fbce32735c6a3c819462945.png';
import * as XLSX from 'xlsx';
import { authAPI, getCurrentUser, goalsAPI, menuAPI } from '../utils/api';
import { PasswordModal } from './PasswordModal';

interface MenuItemConfig {
  id: 'scorecard' | 'events' | 'metrics' | 'goals' | 'ksh-cdpo';
  label: string;
  hidden?: boolean;
  order: number;
}

interface CustomPageConfig {
  id: string;
  label: string;
  hidden?: boolean;
  order: number;
}

interface MenuConfigPayload {
  items?: MenuItemConfig[];
  customPages?: CustomPageConfig[];
}

const DEFAULT_MENU: MenuItemConfig[] = [
  { id: 'scorecard', label: 'Красная шапочка', order: 1 },
  { id: 'events', label: 'Дашборд', order: 2 },
  { id: 'metrics', label: 'Важные метрики', order: 3 },
  { id: 'goals', label: 'Цели квартала', order: 4 },
  { id: 'ksh-cdpo', label: 'КШ CDPO', order: 5 },
];

const MENU_META = {
  scorecard: { path: '/', icon: Target },
  events: { path: '/dashboard', icon: CalendarDays },
  metrics: { path: '/metrics', icon: BarChart3 },
  goals: { path: '/goals', icon: Goal },
  'ksh-cdpo': { path: '/ksh-cdpo', icon: TrendingUp },
};

const normalizeMenuPayload = (raw: any): { items: MenuItemConfig[]; customPages: CustomPageConfig[] } => {
  const data = raw?.items ? raw : { items: raw, customPages: [] };
  const normalized = Array.isArray(data?.items) ? data.items : [];
  const mergedItems: MenuItemConfig[] = DEFAULT_MENU.map((item) => {
    const found = normalized.find((entry: any) => entry.id === item.id);
    return {
      ...item,
      label: found?.label || item.label,
      hidden: typeof found?.hidden === 'boolean' ? found.hidden : false,
      order: typeof found?.order === 'number' ? found.order : item.order,
    };
  });

  const customPages: CustomPageConfig[] = Array.isArray(data?.customPages)
    ? data.customPages
        .filter((page: any) => typeof page?.id === 'string' && page.id)
        .map((page: any, index: number) => ({
          id: page.id,
          label: page.label || `Страница ${index + 1}`,
          hidden: typeof page.hidden === 'boolean' ? page.hidden : false,
          order: typeof page.order === 'number' ? page.order : index + 1,
        }))
    : [];

  return { items: mergedItems, customPages };
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentQuarter, setCurrentQuarter] = useState(() => {
    const month = new Date().getMonth();
    return `Q${Math.floor(month / 3) + 1}`;
  });
  const [currentYear] = useState(() => new Date().getFullYear());
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [menuConfig, setMenuConfig] = useState<MenuItemConfig[]>(DEFAULT_MENU);
  const [customPages, setCustomPages] = useState<CustomPageConfig[]>([]);
  const [menuDraft, setMenuDraft] = useState<MenuItemConfig[]>([]);
  const [customPagesDraft, setCustomPagesDraft] = useState<CustomPageConfig[]>([]);
  const [isMenuSettingsMode, setIsMenuSettingsMode] = useState(false);
  const [isMenuPasswordOpen, setIsMenuPasswordOpen] = useState(false);
  const [draggedMenuItemId, setDraggedMenuItemId] = useState<MenuItemConfig['id'] | null>(null);
  const [dragOverMenuItem, setDragOverMenuItem] = useState<{
    id: MenuItemConfig['id'];
    position: 'before' | 'after';
  } | null>(null);
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const currentUser = getCurrentUser();

  const isActive = (path: string) => location.pathname === path;
  const isMenuPathActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/ksh-cdpo') return location.pathname.startsWith('/ksh-cdpo');
    return location.pathname === path;
  };
  const isEventsDashboard = isActive('/dashboard');
  const showEditButton =
    isActive('/') ||
    isActive('/metrics') ||
    location.pathname.startsWith('/ksh-cdpo') ||
    location.pathname.startsWith('/workspace/');
  const showGoalsExport = isActive('/goals');
  const showQuarterSelector = !isEventsDashboard;

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const result = await menuAPI.get();
        const { items, customPages: pages } = normalizeMenuPayload(result);
        setMenuConfig(items);
        setCustomPages(pages);
      } catch (err) {
        console.error('Failed to load menu config:', err);
        setMenuConfig(DEFAULT_MENU);
        setCustomPages([]);
      }
    };
    loadMenu();
  }, []);

  useEffect(() => {
    if (isEventsDashboard && isEditingMode) {
      setIsEditingMode(false);
    }
  }, [isEventsDashboard, isEditingMode, setIsEditingMode]);

  const visibleMenu = useMemo(() => {
    return [...menuConfig]
      .filter((item) => !item.hidden)
      .sort((a, b) => a.order - b.order);
  }, [menuConfig]);

  const visibleCustomPages = useMemo(() => {
    return [...customPages]
      .filter((item) => !item.hidden)
      .sort((a, b) => a.order - b.order);
  }, [customPages]);

  const sortedMenuDraft = useMemo(
    () => [...menuDraft].sort((a, b) => a.order - b.order),
    [menuDraft],
  );

  const openMenuSettings = () => {
    setMenuDraft([...menuConfig].sort((a, b) => a.order - b.order));
    setCustomPagesDraft([...customPages].sort((a, b) => a.order - b.order));
    setIsMenuSettingsMode(true);
  };

  const handleMenuSave = async () => {
    try {
      const normalized = menuDraft.map((item, index) => ({
        ...item,
        order: index + 1,
      }));
      const normalizedCustomPages = [...customPagesDraft]
        .sort((a, b) => a.order - b.order)
        .map((item, index) => ({ ...item, order: index + 1 }));

      const payload: MenuConfigPayload = { items: normalized, customPages: normalizedCustomPages };
      setMenuConfig(normalized);
      setCustomPages(normalizedCustomPages);
      await menuAPI.save(payload);
      setIsMenuSettingsMode(false);
    } catch (err) {
      alert('Ошибка при сохранении меню: ' + (err as any).message);
    }
  };

  const handleMenuCancel = () => {
    setIsMenuSettingsMode(false);
    setMenuDraft([]);
    setCustomPagesDraft([]);
    setDraggedMenuItemId(null);
    setDragOverMenuItem(null);
  };

  const createCustomPage = () => {
    setCustomPagesDraft((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const nextOrder = sorted.length > 0 ? sorted[sorted.length - 1].order + 1 : 1;
      return [
        ...sorted,
        {
          id: crypto.randomUUID(),
          label: 'Новая страница',
          hidden: false,
          order: nextOrder,
        },
      ];
    });
  };

  const updateCustomPage = (id: string, updates: Partial<CustomPageConfig>) => {
    setCustomPagesDraft((prev) => prev.map((page) => (page.id === id ? { ...page, ...updates } : page)));
  };

  const deleteCustomPage = (id: string) => {
    setCustomPagesDraft((prev) => prev.filter((page) => page.id !== id));
  };

  const reorderMenuDraft = (
    sourceId: MenuItemConfig['id'],
    targetId: MenuItemConfig['id'],
    position: 'before' | 'after',
  ) => {
    setMenuDraft((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const sourceIndex = sorted.findIndex((item) => item.id === sourceId);
      const targetIndex = sorted.findIndex((item) => item.id === targetId);

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return prev;
      }

      const next = [...sorted];
      const [movedItem] = next.splice(sourceIndex, 1);
      const adjustedTargetIndex = next.findIndex((item) => item.id === targetId);
      const insertIndex = position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1;

      next.splice(insertIndex, 0, movedItem);

      return next.map((item, index) => ({
        ...item,
        order: index + 1,
      }));
    });
  };

  const moveMenuItem = (id: MenuItemConfig['id'], direction: 'up' | 'down') => {
    setMenuDraft((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sorted.length) return prev;
      const current = sorted[index];
      const swap = sorted[targetIndex];
      sorted[targetIndex] = { ...current, order: swap.order };
      sorted[index] = { ...swap, order: current.order };
      return sorted;
    });
  };

  const updateMenuItem = (id: MenuItemConfig['id'], updates: Partial<MenuItemConfig>) => {
    setMenuDraft((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleMenuDragStart = (id: MenuItemConfig['id']) => {
    setDraggedMenuItemId(id);
  };

  const handleMenuDragOver = (
    event: DragEvent<HTMLDivElement>,
    id: MenuItemConfig['id'],
  ) => {
    event.preventDefault();
    if (!draggedMenuItemId || draggedMenuItemId === id) {
      setDragOverMenuItem(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = event.clientY < midpoint ? 'before' : 'after';

    setDragOverMenuItem({ id, position });
  };

  const handleMenuDrop = (id: MenuItemConfig['id']) => {
    if (!draggedMenuItemId || draggedMenuItemId === id) return;

    const position =
      dragOverMenuItem?.id === id ? dragOverMenuItem.position : 'after';

    reorderMenuDraft(draggedMenuItemId, id, position);
    setDraggedMenuItemId(null);
    setDragOverMenuItem(null);
  };

  const handleMenuDragEnd = () => {
    setDraggedMenuItemId(null);
    setDragOverMenuItem(null);
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  const handleQuarterChange = (direction: 'prev' | 'next') => {
    const currentIndex = quarters.indexOf(currentQuarter);
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentQuarter(quarters[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < quarters.length - 1) {
      setCurrentQuarter(quarters[currentIndex + 1]);
    }
  };

  const handleExport = () => {
    const dashboardDataStr = localStorage.getItem('dashboard-data');
    const metricsDataStr = localStorage.getItem('metrics-data');
    
    const dashboardData = dashboardDataStr ? JSON.parse(dashboardDataStr) : {};
    const metricsData = metricsDataStr ? JSON.parse(metricsDataStr) : {};
    
    const wb = XLSX.utils.book_new();

    const dashData = dashboardData[currentQuarter] || {};
    const dashRows = [];
    
    dashRows.push(["Виджет", "Показатель", "Вес", "Факт", "Тип", "План", "% Выполнения", "Макс%"]);
    
    if (dashData.digitalMetrics) {
      dashData.digitalMetrics.forEach((m: any) => dashRows.push(["SCORE-КАРТА", m.name, m.weight, m.fact, m.type || '=', m.plan, m.percent, m.maxPercent || '∞']));
    }
    if (dashData.stabilityMetrics) {
      dashData.stabilityMetrics.forEach((m: any) => dashRows.push(["СТАБИЛЬНОСТЬ/ПРОЕКТЫ", m.name, m.weight, m.fact, m.type || '=', m.plan, m.percent, m.maxPercent || '∞']));
    }
    if (dashData.productionMetrics) {
      dashData.productionMetrics.forEach((m: any) => dashRows.push(["ПРОИЗВОДСТВО", m.name, m.weight, m.fact, m.type || '=', m.plan, m.percent, m.maxPercent || '∞']));
    }
    
    if (dashData.vocData) {
      dashRows.push([]);
      dashRows.push(["VOC Канал АБ", "НИБ", "", dashData.vocData.nib, "", dashData.vocData.plan || dashData.vocData.range, "", ""]);
      if (Array.isArray(dashData.vocData.items) && dashData.vocData.items.length > 0) {
        dashData.vocData.items.forEach((item: any) => {
          dashRows.push(["", item.label || "", "", item.value ?? "", "", "", "", ""]);
        });
      } else {
        dashRows.push(["", "ММБ", "", dashData.vocData.mmb, "", "", "", ""]);
        dashRows.push(["", "СБ", "", dashData.vocData.sb, "", "", "", ""]);
        dashRows.push(["", "КИБ", "", dashData.vocData.kib, "", "", "", ""]);
      }
    }
    
    if (dashData.enpsData) {
      dashRows.push([]);
      dashRows.push(["eNPS", "Значение", "", dashData.enpsData.value, "", dashData.enpsData.plan, "", ""]);
    }
    
    if (dashData.visibilityData) {
      dashRows.push([]);
      dashRows.push(["Visibility", "Значение", "", dashData.visibilityData.value, "", dashData.visibilityData.plan, "", ""]);
    }

    const metData = metricsData[currentQuarter] || {};
    const metRows = [];
    metRows.push(["Категория", "Показатель", "Значение", "Дополнительно"]);
    
    if (metData.techStandards) {
      metRows.push(["Стандарты инженерии", "Дирекция", metData.techStandards.direction, ""]);
    }
    if (metData.salesStandard) {
      metRows.push(["Стандарты продаж", "Дирекция", metData.salesStandard.direction, ""]);
    }
    if (metData.designStandard) {
      metRows.push(["Дизайн стандарты", "Дирекция", metData.designStandard.direction, `Канал АБ: ${metData.designStandard.kanalAB}`]);
    }
    
    if (metData.planningNext) {
      metRows.push([]);
      metRows.push(["ПрП: Планирование", "Сотрудник", "Процент", "Статус"]);
      metData.planningNext.forEach((m: any) => metRows.push(["", m.name, `${m.value}%`, m.color]));
    }
    if (metData.convergence) {
      metRows.push([]);
      metRows.push(["ПрП: Сходимость КР", "Сотрудник", "Процент", "Доля"]);
      metData.convergence.forEach((m: any) => metRows.push(["", m.name, `${m.value}%`, `${m.detail?.num}/${m.detail?.denom}`]));
    }
    if (metData.t2m) {
      metRows.push([]);
      metRows.push(["ПрП: T2M", "Сотрудник", "Значение", "Статус"]);
      metData.t2m.forEach((m: any) => metRows.push(["", m.name, `${m.value}`, m.color]));
    }
    if (metData.utilization) {
      metRows.push([]);
      metRows.push(["ПрП: Утилизация", "Сотрудник", "Значение", "Статус"]);
      metData.utilization.forEach((m: any) => metRows.push(["", m.name, `${m.value}%`, m.color]));
    }
    
    if (metData.defects) {
      metRows.push([]);
      metRows.push(["ИТ: Дефекты", "Показатель", "Значение", "Статус"]);
      metData.defects.forEach((m: any) => metRows.push(["", m.name, m.value, m.color]));
    }
    
    if (metData.keshp) {
      metRows.push([]);
      metRows.push(["КЗШР", "Категория", "Процент", "Вакансии"]);
      metData.keshp.forEach((m: any) => metRows.push(["", m.label, `${m.value}%`, m.vacancies]));
    }

    const wsDash = XLSX.utils.aoa_to_sheet(dashRows);
    const wsMet = XLSX.utils.aoa_to_sheet(metRows);
    
    XLSX.utils.book_append_sheet(wb, wsDash, "Красная шапочка");
    XLSX.utils.book_append_sheet(wb, wsMet, "Важные метрики");

    XLSX.writeFile(wb, `Дашборд_${currentQuarter}_${currentYear}.xlsx`);
  };

  const handleExportGoals = async () => {
    try {
      const dbGoals = await goalsAPI.get(currentQuarter);
      const goalsFromDb = dbGoals?.goals || [];

      const goalsDataStr = localStorage.getItem('goals-data');
      const goalsData = goalsDataStr ? JSON.parse(goalsDataStr) : {};
      const goalsFromLocal = goalsData[currentQuarter]?.goals || [];

      const goals = goalsFromDb.length > 0 ? goalsFromDb : goalsFromLocal;

      const wb = XLSX.utils.book_new();
      const rows = [];

      rows.push([
        'ID',
        'Описание цели',
        'Категория',
        'Вес (%)',
        'План',
        'Факт',
        '% выполнения',
        'Статус',
        'Исполнитель',
        'Команда',
        'Стрим',
        'Количество комментариев'
      ]);

      goals.forEach((goal: any) => {
        rows.push([
          goal.id,
          goal.description,
          goal.category,
          goal.weight,
          goal.plan,
          goal.fact,
          goal.completionPercent ?? '',
          goal.status,
          goal.executor,
          goal.team,
          goal.stream,
          goal.comments?.length || 0
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Цели квартала');
      XLSX.writeFile(wb, `Цели_${currentQuarter}_${currentYear}.xlsx`);
    } catch (err) {
      console.error('Failed to export goals:', err);
      alert('Ошибка при выгрузке целей. Проверьте подключение к базе данных.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f14] to-[#0a0a0f] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className={`w-full flex flex-col border-b md:border-r md:border-b-0 border-white/5 shrink-0 bg-gradient-to-b from-[#0f0f14] via-[#0a0a0f] to-[#0a0a0f] transition-[width] duration-300 ${isMenuSettingsMode ? 'md:w-[22rem]' : 'md:w-64'}`}>
        {/* Logo */}
        <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center md:block">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#2563eb] p-0.5">
              <img src={logoImage} alt="Альфа-Бизнес" className="w-full h-full rounded-[10px]" />
            </div>
            <span className="text-white font-semibold hidden sm:inline">Альфа-Бизнес</span>
          </div>
          <div className="md:hidden flex gap-2">
            {visibleMenu.map((item) => {
              const meta = MENU_META[item.id];
              const Icon = meta.icon;
              return (
                <Link
                  key={item.id}
                  to={meta.path}
                  className={`p-2 rounded-xl transition-all ${isActive(meta.path) ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icon size={20} />
                </Link>
              );
            })}
            {visibleCustomPages.map((page) => (
              <Link
                key={page.id}
                to={`/workspace/${page.id}`}
                className={`p-2 rounded-xl transition-all ${isActive(`/workspace/${page.id}`) ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30' : 'text-gray-400 hover:text-white'}`}
                title={page.label}
              >
                <FileText size={20} />
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex flex-1 p-4 flex-col">
          {isMenuSettingsMode ? (
            <>
              <div className="px-2 pb-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="text-white font-semibold">Настройка меню</div>
                    <div className="text-xs text-gray-500">Перетаскивайте пункты, скрывайте лишнее и меняйте названия</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleMenuCancel}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
                  >
                    <X size={16} />
                    Отмена
                  </button>
                  <button
                    onClick={handleMenuSave}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/50 shadow-lg shadow-emerald-500/20 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
                  >
                    <Save size={16} />
                    Сохранить
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {sortedMenuDraft.map((item) => {
                  const meta = MENU_META[item.id];
                  const Icon = meta.icon;
                  const isDragged = draggedMenuItemId === item.id;
                  const isDropTarget = dragOverMenuItem?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleMenuDragStart(item.id)}
                      onDragOver={(event) => handleMenuDragOver(event, item.id)}
                      onDrop={() => handleMenuDrop(item.id)}
                      onDragEnd={handleMenuDragEnd}
                      className={`rounded-2xl border bg-[#0a0a0a]/50 p-3 transition-all ${
                        isDragged
                          ? 'opacity-50 border-emerald-500/40'
                          : isDropTarget
                            ? dragOverMenuItem?.position === 'before'
                              ? 'border-white/20 shadow-[inset_0_3px_0_rgba(52,211,153,0.9)]'
                              : 'border-white/20 shadow-[inset_0_-3px_0_rgba(52,211,153,0.9)]'
                            : item.hidden
                              ? 'border-white/5 opacity-60'
                              : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
                          title="Перетащить пункт меню"
                        >
                          <GripVertical size={16} />
                        </button>
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-gray-300" />
                        </div>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateMenuItem(item.id, { label: e.target.value })}
                          className="flex-1 min-w-0 bg-[#0a0a0a]/70 border border-gray-700/40 rounded-xl px-3 py-2 text-white text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => updateMenuItem(item.id, { hidden: !item.hidden })}
                          className={`p-2 rounded-xl border shrink-0 transition-all ${
                            item.hidden
                              ? 'bg-white/5 border-white/10 text-gray-500'
                              : 'bg-white/10 border-white/15 text-white'
                          }`}
                          title={item.hidden ? 'Показать пункт' : 'Скрыть пункт'}
                        >
                          {item.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 pl-[3.5rem] text-xs">
                        <span className="text-gray-500">Перетащите для смены порядка</span>
                        <span className={item.hidden ? 'text-amber-300/80' : 'text-emerald-300/80'}>
                          {item.hidden ? 'Скрыт' : 'Показывается'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 px-2">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Пользовательские страницы</div>
                  <button
                    onClick={createCustomPage}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/30"
                    title="Добавить страницу"
                  >
                    <Plus size={14} className="text-emerald-400" />
                  </button>
                </div>
                <div className="space-y-2">
                  {[...customPagesDraft].sort((a, b) => a.order - b.order).map((page) => (
                    <div key={page.id} className="rounded-2xl border border-white/10 bg-[#0a0a0a]/50 p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-gray-300" />
                        </div>
                        <input
                          type="text"
                          value={page.label}
                          onChange={(e) => updateCustomPage(page.id, { label: e.target.value })}
                          className="flex-1 min-w-0 bg-[#0a0a0a]/70 border border-gray-700/40 rounded-xl px-3 py-2 text-white text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => updateCustomPage(page.id, { hidden: !page.hidden })}
                          className={`p-2 rounded-xl border shrink-0 transition-all ${
                            page.hidden ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-white/10 border-white/15 text-white'
                          }`}
                          title={page.hidden ? 'Показать страницу' : 'Скрыть страницу'}
                        >
                          {page.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomPage(page.id)}
                          className="p-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 shrink-0 transition-all"
                          title="Удалить страницу"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1" />
            </>
          ) : (
            <>
              {visibleMenu.map((item) => {
                const meta = MENU_META[item.id];
                const Icon = meta.icon;
                return (
                  <Link
                    key={item.id}
                    to={meta.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 ${
                      isMenuPathActive(meta.path)
                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {visibleCustomPages.map((page) => (
                <Link
                  key={page.id}
                  to={`/workspace/${page.id}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 ${
                    isActive(`/workspace/${page.id}`)
                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <FileText size={20} />
                  <span>{page.label}</span>
                </Link>
              ))}
            </>
          )}

          {/* Spacer */}
          <div className="flex-1"></div>

          {!isMenuSettingsMode && (
            <button
              onClick={() => setIsMenuPasswordOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-white text-sm transition-all opacity-60 hover:opacity-100"
              title="Настроить меню"
            >
              <Settings size={16} />
              <span className="sr-only">Настроить меню</span>
            </button>
          )}

          {/* User Info & Logout */}
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="flex items-center gap-3 px-4 py-3 text-gray-400 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                {currentUser?.user_metadata?.name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {currentUser?.user_metadata?.name || 'Пользователь'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {currentUser?.email}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <LogOut size={20} />
              <span>Выйти</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-x-hidden flex flex-col">
        {/* Fixed Header Controls */}
        <div className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
          <div className="p-4 md:p-8 md:pb-4">
            <div className="max-w-5xl mx-auto flex min-h-[44px] flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 w-full">
              {/* Title with Gradient */}
              <h1 className="text-2xl md:text-3xl font-bold hidden sm:block bg-gradient-to-r from-[#34d399] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                Альфа-Бизнес & Digital sales
              </h1>
              
              <div className="flex min-h-[42px] w-full items-center justify-end gap-3 md:gap-4 sm:w-[380px]">
                <div className="h-[42px] w-[180px] shrink-0">
                  {showQuarterSelector ? (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2 h-full w-full flex items-center justify-between shadow-xl shadow-black/20">
                      <button
                        onClick={() => handleQuarterChange('prev')}
                        disabled={currentQuarter === 'Q1'}
                        className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-white font-medium mx-4">{currentQuarter} {currentYear}</span>
                      <button
                        onClick={() => handleQuarterChange('next')}
                        disabled={currentQuarter === 'Q4'}
                        className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="h-full w-full" aria-hidden="true" />
                  )}
                </div>

                <div className="h-[42px] w-[180px] shrink-0">
                  {showGoalsExport ? (
                    <button
                      onClick={handleExportGoals}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white h-full w-full rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-black/20 justify-center text-sm backdrop-blur-xl"
                    >
                      <Download size={16} />
                      <span className="hidden sm:inline">Выгрузить</span>
                    </button>
                  ) : showEditButton ? (
                    <button
                      onClick={() => setIsEditingMode(!isEditingMode)}
                      className={`${
                        isEditingMode ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 border border-red-500/50 shadow-lg shadow-red-500/30 ring-2 ring-red-500/20'
                      } text-white h-full w-full rounded-xl flex items-center gap-2.5 transition-all shadow-xl justify-center text-sm font-bold backdrop-blur-xl hover:scale-105 active:scale-95`}
                    >
                      {isEditingMode ? <><X size={18} />Отменить</> : <><Edit3 size={18} />Редактировать</>}
                    </button>
                  ) : (
                    <div className="h-full w-full" aria-hidden="true" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
          <Outlet context={{ currentQuarter, setCurrentQuarter, currentYear, isEditingMode, setIsEditingMode }} />
        </div>
      </main>

      <PasswordModal
        isOpen={isMenuPasswordOpen}
        onClose={() => setIsMenuPasswordOpen(false)}
        onSuccess={() => {
          setIsMenuPasswordOpen(false);
          openMenuSettings();
        }}
      />
    </div>
  );
}
