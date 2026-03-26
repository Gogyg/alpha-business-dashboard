import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { BarChart3, Target, ChevronLeft, ChevronRight, Edit3, X, Goal, Download, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import logoImage from '../../assets/5b6ead3363f3911c8fbce32735c6a3c819462945.png';
import * as XLSX from 'xlsx';
import { authAPI, getCurrentUser } from '../utils/api';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentQuarter, setCurrentQuarter] = useState('Q1');
  const [currentYear] = useState(2026);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const currentUser = getCurrentUser();

  const isActive = (path: string) => location.pathname === path;

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
    
    dashRows.push(["Виджет", "Показатель", "Вес", "Факт", "План", "% Выполнения"]);
    
    if (dashData.digitalMetrics) {
      dashData.digitalMetrics.forEach((m: any) => dashRows.push(["SCORE-КАРТА", m.name, m.weight, m.fact, m.plan, m.percent]));
    }
    if (dashData.stabilityMetrics) {
      dashData.stabilityMetrics.forEach((m: any) => dashRows.push(["СТАБИЛЬНОСТЬ/ПРОЕКТЫ", m.name, m.weight, m.fact, m.plan, m.percent]));
    }
    if (dashData.productionMetrics) {
      dashData.productionMetrics.forEach((m: any) => dashRows.push(["ПРОИЗВОДСТВО", m.name, m.weight, m.fact, m.plan, m.percent]));
    }
    
    if (dashData.vocData) {
      dashRows.push([]);
      dashRows.push(["VOC Канал АБ", "НИБ", "", dashData.vocData.nib, dashData.vocData.plan || dashData.vocData.range, ""]);
      dashRows.push(["", "ММБ", "", dashData.vocData.mmb, "", ""]);
      dashRows.push(["", "СБ", "", dashData.vocData.sb, "", ""]);
      dashRows.push(["", "КИБ", "", dashData.vocData.kib, "", ""]);
    }
    
    if (dashData.enpsData) {
      dashRows.push([]);
      dashRows.push(["eNPS", "Значение", "", dashData.enpsData.value, dashData.enpsData.plan, ""]);
    }
    
    if (dashData.visibilityData) {
      dashRows.push([]);
      dashRows.push(["Visibility", "Значение", "", dashData.visibilityData.value, dashData.visibilityData.plan, ""]);
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

  const handleExportGoals = () => {
    const goalsDataStr = localStorage.getItem('goals-data');
    const goalsData = goalsDataStr ? JSON.parse(goalsDataStr) : {};
    
    const goals = goalsData[currentQuarter]?.goals || [];
    
    const wb = XLSX.utils.book_new();
    const rows = [];
    
    rows.push([
      "ID",
      "Описание цели",
      "Категория",
      "Вес (%)",
      "План",
      "Факт",
      "% выполнения",
      "Статус",
      "Исполнитель",
      "Команда",
      "Стрим",
      "Количество комментариев"
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
    XLSX.utils.book_append_sheet(wb, ws, "Цели квартала");

    XLSX.writeFile(wb, `Цели_${currentQuarter}_${currentYear}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f14] to-[#0a0a0f] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex flex-col border-b md:border-r md:border-b-0 border-white/5 shrink-0 bg-gradient-to-b from-[#0f0f14] via-[#0a0a0f] to-[#0a0a0f]">
        {/* Logo */}
        <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center md:block">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#2563eb] p-0.5">
              <img src={logoImage} alt="Альфа-Бизнес" className="w-full h-full rounded-[10px]" />
            </div>
            <span className="text-white font-semibold hidden sm:inline">Альфа-Бизнес</span>
          </div>
          <div className="md:hidden flex gap-2">
            <Link to="/" className={`p-2 rounded-xl transition-all ${isActive('/') ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30' : 'text-gray-400 hover:text-white'}`}>
              <Target size={20} />
            </Link>
            <Link to="/metrics" className={`p-2 rounded-xl transition-all ${isActive('/metrics') ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30' : 'text-gray-400 hover:text-white'}`}>
              <BarChart3 size={20} />
            </Link>
            <Link to="/goals" className={`p-2 rounded-xl transition-all ${isActive('/goals') ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30' : 'text-gray-400 hover:text-white'}`}>
              <Goal size={20} />
            </Link>
          </div>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex flex-1 p-4 flex-col">
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 ${
              isActive('/') 
                ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Target size={20} />
            <span>Красная шапочка</span>
          </Link>
          <Link
            to="/metrics"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 ${
              isActive('/metrics') 
                ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BarChart3 size={20} />
            <span>Важные метрики</span>
          </Link>
          <Link
            to="/goals"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              isActive('/goals') 
                ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Goal size={20} />
            <span>Цели квартала</span>
          </Link>

          {/* Spacer */}
          <div className="flex-1"></div>

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
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 w-full">
              {/* Title with Gradient */}
              <h1 className="text-2xl md:text-4xl font-bold hidden sm:block bg-gradient-to-r from-[#34d399] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                Альфа-Бизнес & Digital sales
              </h1>
              
              <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                {/* Quarter Selector */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2 flex items-center justify-between shadow-xl shadow-black/20 flex-1 sm:flex-none">
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

                {/* Edit/Export Button - conditional based on page */}
                {isActive('/goals') ? (
                  <button
                    onClick={handleExportGoals}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-black/20 justify-center text-sm backdrop-blur-xl"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Выгрузить</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingMode(!isEditingMode)}
                    className={`${
                      isEditingMode ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 border border-red-500/50 shadow-lg shadow-red-500/30'
                    } text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all shadow-xl justify-center text-sm backdrop-blur-xl`}
                  >
                    {isEditingMode ? <><X size={16} /><span className="hidden sm:inline">Отменить</span></> : <><Edit3 size={16} /><span className="hidden sm:inline">Редактировать</span></>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
          <Outlet context={{ currentQuarter, setCurrentQuarter, currentYear, isEditingMode, setIsEditingMode }} />
        </div>
      </main>
    </div>
  );
}