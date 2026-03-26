import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Plus, Filter, MessageSquare, Send, Check, X, Edit2, Trash2, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { TeamManagementModal } from '../components/TeamManagementModal';
import { SelectExecutorModal } from '../components/SelectExecutorModal';
import { PasswordModal } from '../components/PasswordModal';
import { goalsAPI } from '../utils/api';

interface OutletContext {
  currentQuarter: string;
  setCurrentQuarter: (quarter: string) => void;
  currentYear: number;
  isEditingMode?: boolean;
  setIsEditingMode?: (value: boolean) => void;
}

export interface Goal {
  id: number;
  description: string;
  category: 'VOC' | 'Проект/MBO/Личные' | 'Производство' | 'Продукт' | 'Персоналии';
  weight: number;
  plan: string;
  fact: string;
  completionPercent: number | null;
  status: 'Черновик' | 'На согласовании' | 'Выполнение' | 'Отклонено' | 'К закрытию' | 'Корректировка оценки' | 'Выполнено';
  executor: string;
  team: string;
  stream: string;
  comments: Array<{ id: number; text: string; date: string; author: string }>;
}

const CATEGORY_WEIGHTS = {
  'VOC': 20,
  'Проект/MBO/Личные': 20,
  'Производство': 35,
  'Продукт': 25,
  'Персоналии': 0,
};

export function Goals() {
  const outletContext = useOutletContext<OutletContext>();
  const { currentQuarter = 'Q1', currentYear = 2026 } = outletContext || {};
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSelectExecutorModalOpen, setIsSelectExecutorModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingGoalId, setPendingGoalId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<'approve' | 'close' | null>(null);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [filters, setFilters] = useState({
    stream: '',
    team: '',
    executor: '',
    status: '',
  });

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showComments, setShowComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [showCompletionWarning, setShowCompletionWarning] = useState(false);
  const [lastSelectedExecutor, setLastSelectedExecutor] = useState(() => {
    const stored = localStorage.getItem('last-selected-executor');
    return stored ? JSON.parse(stored) : { executor: '', team: '', stream: '' };
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await goalsAPI.get(currentQuarter);
        setGoals(result?.goals || []);
      } catch (err) {
        console.error('Failed to load goals:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentQuarter]);

  const saveToSupabase = async (updatedGoals: Goal[]) => {
    try {
      await goalsAPI.save(currentQuarter, { goals: updatedGoals });
      
      // Mirror to localStorage for Export functionality in Layout
      const stored = localStorage.getItem('goals-data');
      const allData = stored ? JSON.parse(stored) : {};
      allData[currentQuarter] = { goals: updatedGoals };
      localStorage.setItem('goals-data', JSON.stringify(allData));
    } catch (err) {
      console.error('Failed to save goals to Supabase:', err);
    }
  };

  const handleExecutorSelect = (executor: string, team: string, stream: string, goalData?: Partial<Goal>) => {
    const newExecutorData = { executor, team, stream };
    setLastSelectedExecutor(newExecutorData);
    localStorage.setItem('last-selected-executor', JSON.stringify(newExecutorData));

    const newGoal: Goal = {
      id: goals.length > 0 ? Math.max(...goals.map(g => g.id)) + 1 : 1,
      description: goalData?.description || 'Новая цель',
      category: goalData?.category || 'Производство',
      weight: goalData?.weight !== undefined ? goalData.weight : CATEGORY_WEIGHTS['Производство'],
      plan: goalData?.plan || '',
      fact: goalData?.fact || '',
      completionPercent: null,
      status: 'Черновик',
      executor,
      team,
      stream,
      comments: [],
    };
    
    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    saveToSupabase(updatedGoals);
    setIsSelectExecutorModalOpen(false);
  };

  const addGoal = () => {
    setIsSelectExecutorModalOpen(true);
  };

  const updateGoal = (id: number, updates: Partial<Goal>) => {
    const updatedGoals = goals.map(g => g.id === id ? { ...g, ...updates } : g);
    setGoals(updatedGoals);
    saveToSupabase(updatedGoals);
  };

  const deleteGoal = (id: number) => {
    const updatedGoals = goals.filter(g => g.id !== id);
    setGoals(updatedGoals);
    saveToSupabase(updatedGoals);
  };

  const sendForApproval = (id: number) => {
    updateGoal(id, { status: 'На согласовании' });
  };

  const approveGoal = (id: number) => {
    updateGoal(id, { status: 'Выполнение' });
  };

  const rejectGoal = (id: number) => {
    updateGoal(id, { status: 'Отклонено' });
  };

  const sendForClosing = (id: number) => {
    const goal = goals.find(g => g.id === id);
    if (goal && goal.completionPercent !== null) {
      updateGoal(id, { status: 'К закрытию' });
    } else {
      setShowCompletionWarning(true);
    }
  };

  const closeGoal = (id: number) => {
    updateGoal(id, { status: 'Выполнено' });
  };

  const rejectClosing = (id: number) => {
    updateGoal(id, { status: 'Корректировка оценки' });
  };

  const addComment = (goalId: number) => {
    if (!newComment.trim()) return;
    
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const comment = {
      id: goal.comments.length > 0 ? Math.max(...goal.comments.map(c => c.id)) + 1 : 1,
      text: newComment,
      date: new Date().toLocaleString('ru-RU'),
      author: 'Текущий пользователь',
    };

    updateGoal(goalId, {
      comments: [...goal.comments, comment],
    });

    setNewComment('');
  };

  const filteredGoals = goals.filter(goal => {
    if (filters.stream && goal.stream !== filters.stream) return false;
    if (filters.team && goal.team !== filters.team) return false;
    if (filters.executor && goal.executor !== filters.executor) return false;
    if (filters.status && goal.status !== filters.status) return false;
    return true;
  });

  const calculateAnalytics = (goalsToAnalyze: Goal[]) => {
    const total = goalsToAnalyze.length;
    const draft = goalsToAnalyze.filter(g => g.status === 'Черновик').length;
    const approval = goalsToAnalyze.filter(g => g.status === 'На согласовании').length;
    const execution = goalsToAnalyze.filter(g => g.status === 'Выполнение').length;
    const rejected = goalsToAnalyze.filter(g => g.status === 'Отклонено').length;
    const closing = goalsToAnalyze.filter(g => g.status === 'К закрытию').length;
    const correction = goalsToAnalyze.filter(g => g.status === 'Корректировка оценки').length;
    const completed = goalsToAnalyze.filter(g => g.status === 'Выполнено').length;

    // Расчет общего процента выполнения с учетом весов всех целей
    let totalCompletionWeighted = 0;
    let totalWeight = 0;
    
    goalsToAnalyze.forEach(goal => {
      const completionPercent = goal.completionPercent ?? 0;
      totalCompletionWeighted += (goal.weight * completionPercent) / 100;
      totalWeight += goal.weight;
    });
    
    const overallCompletion = totalWeight > 0 
      ? Math.round((totalCompletionWeighted / totalWeight) * 100) 
      : 0;

    return { 
      total, 
      draft, 
      approval, 
      execution, 
      rejected, 
      closing, 
      correction, 
      completed, 
      overallCompletion,
      totalWeight
    };
  };

  const analytics = calculateAnalytics(filteredGoals);

  const getUniqueValues = (field: keyof Goal) => {
    return Array.from(new Set(goals.map(g => g[field] as string).filter(Boolean)));
  };

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'Черновик': return 'bg-gray-600';
      case 'На согласовании': return 'bg-yellow-600';
      case 'Выполнение': return 'bg-blue-600';
      case 'Отклонено': return 'bg-red-600';
      case 'К закрытию': return 'bg-orange-600';
      case 'Корректировка оценки': return 'bg-pink-600';
      case 'Выполнено': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const handlePasswordSuccess = () => {
    if (pendingGoalId !== null && pendingAction) {
      if (pendingAction === 'approve') {
        approveGoal(pendingGoalId);
      } else if (pendingAction === 'close') {
        closeGoal(pendingGoalId);
      }
      setPendingGoalId(null);
      setPendingAction(null);
    }
    setIsPasswordModalOpen(false);
  };

  const handleApproveClick = (id: number) => {
    setPendingGoalId(id);
    setPendingAction('approve');
    setIsPasswordModalOpen(true);
  };

  const handleCloseClick = (id: number) => {
    setPendingGoalId(id);
    setPendingAction('close');
    setIsPasswordModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-4 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Analytics Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Analytics */}
          <div className="bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] border border-red-900/30 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-sm text-gray-400 uppercase tracking-wide font-medium mb-4">Статистика по статусам</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{analytics.total}</div>
                <div className="text-xs text-gray-500">Всего</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-400 mb-1">{analytics.draft}</div>
                <div className="text-xs text-gray-500">Черновик</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">{analytics.approval}</div>
                <div className="text-xs text-gray-500">На согласовании</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">{analytics.execution}</div>
                <div className="text-xs text-gray-500">Выполнение</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400 mb-1">{analytics.rejected}</div>
                <div className="text-xs text-gray-500">Отклонено</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400 mb-1">{analytics.closing}</div>
                <div className="text-xs text-gray-500">К закрытию</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400 mb-1">{analytics.correction}</div>
                <div className="text-xs text-gray-500">Корректировка</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">{analytics.completed}</div>
                <div className="text-xs text-gray-500">Выполнено</div>
              </div>
            </div>
          </div>

          {/* Overall Completion */}
          <div className="bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] border border-red-900/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-center items-center">
            <h2 className="text-sm text-gray-400 uppercase tracking-wide font-medium mb-6">Общий процент выполнения</h2>
            <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-4">
              {analytics.overallCompletion}%
            </div>
            <div className="text-sm text-gray-400">
              С учетом весов целей
            </div>
            {analytics.totalWeight > 0 && (
              <div className="mt-4 text-xs text-gray-500">
                Суммарный вес целей в работе: {analytics.totalWeight}%
              </div>
            )}
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Фильтры</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsTeamModalOpen(true)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
              >
                <Users size={16} />
                <span className="hidden sm:inline">Управление командами</span>
              </button>
              <button
                onClick={addGoal}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/50 shadow-lg shadow-emerald-500/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Добавить цель</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select
              value={filters.stream}
              onChange={(e) => setFilters({ ...filters, stream: e.target.value })}
              className="bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Все стримы</option>
              {getUniqueValues('stream').map(stream => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>

            <select
              value={filters.team}
              onChange={(e) => setFilters({ ...filters, team: e.target.value })}
              className="bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Все команды</option>
              {getUniqueValues('team').map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>

            <select
              value={filters.executor}
              onChange={(e) => setFilters({ ...filters, executor: e.target.value })}
              className="bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Все исполнители</option>
              {getUniqueValues('executor').map(executor => (
                <option key={executor} value={executor}>{executor}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Все статусы</option>
              <option value="Черновик">Черновик</option>
              <option value="На согласовании">На согласовании</option>
              <option value="Выполнение">Выполнение</option>
              <option value="Отклонено">Отклонено</option>
              <option value="К закрытию">К закрытию</option>
              <option value="Корректировка оценки">Корректировка оценки</option>
              <option value="Выполнено">Выполнено</option>
            </select>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {filteredGoals.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center shadow-2xl shadow-black/20">
              <p className="text-gray-400 text-lg">Целей не найдено</p>
            </div>
          ) : (
            filteredGoals.map(goal => {
              const isCompleted = goal.status === 'Выполнено';
              const canEdit = !isCompleted;

              return (
                <div
                  key={goal.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20"
                >
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {editingGoal?.id === goal.id ? (
                          <textarea
                            value={editingGoal.description}
                            onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-2 text-white resize-none"
                            rows={2}
                            placeholder="Описание цели"
                            disabled={isCompleted}
                          />
                        ) : (
                          <h3 className="text-lg font-semibold text-white">{goal.description}</h3>
                        )}
                      </div>
                      <div className={`${getStatusColor(goal.status)} px-3 py-1 rounded-lg text-white text-xs font-medium whitespace-nowrap`}>
                        {goal.status}
                      </div>
                    </div>

                    {/* Goal Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Категория</div>
                        {editingGoal?.id === goal.id ? (
                          <select
                            value={editingGoal.category}
                            onChange={(e) => {
                              const category = e.target.value as Goal['category'];
                              setEditingGoal({ 
                                ...editingGoal, 
                                category,
                                weight: CATEGORY_WEIGHTS[category]
                              });
                            }}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm"
                          >
                            <option value="VOC">VOC</option>
                            <option value="Проект/MBO/Личные">Проект/MBO/Личные</option>
                            <option value="Производство">Производство</option>
                            <option value="Продукт">Продукт</option>
                            <option value="Персоналии">Персоналии</option>
                          </select>
                        ) : (
                          <div className="text-sm text-white">{goal.category}</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">Вес (%)</div>
                        {editingGoal?.id === goal.id ? (
                          <div className="space-y-1">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={editingGoal.weight}
                              onChange={(e) => setEditingGoal({ ...editingGoal, weight: parseInt(e.target.value) })}
                              className="w-full"
                            />
                            <div className="text-sm text-white text-center">{editingGoal.weight}%</div>
                          </div>
                        ) : (
                          <div className="text-sm text-green-400 font-semibold">{goal.weight}%</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">План</div>
                        {editingGoal?.id === goal.id ? (
                          <input
                            type="text"
                            value={editingGoal.plan}
                            onChange={(e) => setEditingGoal({ ...editingGoal, plan: e.target.value })}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm"
                            placeholder="План"
                          />
                        ) : (
                          <div className="text-sm text-white">{goal.plan || '—'}</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">Факт</div>
                        {editingGoal?.id === goal.id ? (
                          <input
                            type="text"
                            value={editingGoal.fact}
                            onChange={(e) => setEditingGoal({ ...editingGoal, fact: e.target.value })}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm"
                            placeholder="Факт"
                          />
                        ) : goal.status === 'Выполнение' || goal.status === 'К закрытию' ? (
                          <input
                            type="text"
                            value={goal.fact}
                            onChange={(e) => updateGoal(goal.id, { fact: e.target.value })}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm"
                            placeholder="Факт"
                          />
                        ) : (
                          <div className="text-sm text-white">{goal.fact || '—'}</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">% выполнения</div>
                        {editingGoal?.id === goal.id ? (
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editingGoal.completionPercent ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : parseInt(e.target.value);
                                setEditingGoal({ ...editingGoal, completionPercent: value });
                              }}
                              className={`w-full bg-[#0a0a0a]/50 border ${editingGoal.completionPercent === null && (editingGoal.status === 'Выполнение' || editingGoal.status === 'К закрытию' || editingGoal.status === 'Корректировка оценки') ? 'border-yellow-500' : 'border-gray-700/30'} rounded px-2 py-1 text-white text-sm`}
                              placeholder="0-100"
                            />
                            {editingGoal.completionPercent === null && (editingGoal.status === 'Выполнение' || editingGoal.status === 'К закрытию' || editingGoal.status === 'Корректировка оценки') && (
                              <AlertCircle className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-500" size={14} />
                            )}
                          </div>
                        ) : goal.status === 'Выполнение' || goal.status === 'К закрытию' ? (
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={goal.completionPercent ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : parseInt(e.target.value);
                                updateGoal(goal.id, { completionPercent: value });
                              }}
                              className={`w-full bg-[#0a0a0a]/50 border ${goal.completionPercent === null ? 'border-yellow-500' : 'border-gray-700/30'} rounded px-2 py-1 text-white text-sm`}
                              placeholder="0-100"
                            />
                            {goal.completionPercent === null && (
                              <AlertCircle className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-500" size={14} />
                            )}
                          </div>
                        ) : (
                          <div className={`text-sm font-semibold ${goal.completionPercent !== null ? 'text-green-400' : 'text-gray-400'}`}>
                            {goal.completionPercent !== null ? `${goal.completionPercent}%` : '—'}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">Исполнитель</div>
                        {editingGoal?.id === goal.id ? (
                          <input
                            type="text"
                            value={editingGoal.executor}
                            onChange={(e) => setEditingGoal({ ...editingGoal, executor: e.target.value })}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm"
                            placeholder="Исполнитель"
                          />
                        ) : (
                          <div className="text-sm text-white">{goal.executor || '—'}</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">Команда / Стрим</div>
                        {editingGoal?.id === goal.id ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editingGoal.team}
                              onChange={(e) => setEditingGoal({ ...editingGoal, team: e.target.value })}
                              className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-xs"
                              placeholder="Команда"
                            />
                            <input
                              type="text"
                              value={editingGoal.stream}
                              onChange={(e) => setEditingGoal({ ...editingGoal, stream: e.target.value })}
                              className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-xs"
                              placeholder="Стрим"
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-white">{goal.team || '—'} / {goal.stream || '—'}</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-700/30">
                      {editingGoal?.id === goal.id ? (
                        <>
                          <button
                            onClick={() => {
                              updateGoal(goal.id, editingGoal);
                              setEditingGoal(null);
                            }}
                            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/50 shadow-lg shadow-emerald-500/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                          >
                            <Check size={16} />
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingGoal(null)}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                          >
                            <X size={16} />
                            Отменить
                          </button>
                          <button
                            onClick={() => {
                              deleteGoal(goal.id);
                              setEditingGoal(null);
                            }}
                            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm"
                          >
                            <Trash2 size={16} />
                            Удалить
                          </button>
                        </>
                      ) : (
                        <>
                          {(goal.status === 'Черновик' || goal.status === 'Отклонено' || goal.status === 'Корректировка оценки') && (
                            <button
                              onClick={() => setEditingGoal(goal)}
                              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                              title="Редактировать"
                            >
                              <Edit2 size={16} />
                              <span className="hidden sm:inline">Редактировать</span>
                            </button>
                          )}

                          {(goal.status === 'Черновик' || goal.status === 'Отклонено') && (
                            <button
                              onClick={() => sendForApproval(goal.id)}
                              className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 border border-yellow-500/50 shadow-lg shadow-yellow-500/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                            >
                              <Send size={16} />
                              <span className="hidden sm:inline">На согласование</span>
                            </button>
                          )}

                          {goal.status === 'На согласовании' && (
                            <>
                              <button
                                onClick={() => handleApproveClick(goal.id)}
                                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/50 shadow-lg shadow-emerald-500/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                              >
                                <Check size={16} />
                                <span className="hidden sm:inline">Согласовать</span>
                              </button>
                              <button
                                onClick={() => rejectGoal(goal.id)}
                                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 border border-red-500/50 shadow-lg shadow-red-500/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                              >
                                <X size={16} />
                                <span className="hidden sm:inline">Отклонить</span>
                              </button>
                            </>
                          )}

                          {(goal.status === 'Выполнение' || goal.status === 'Корректировка оценки') && (
                            <button
                              onClick={() => sendForClosing(goal.id)}
                              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 border border-orange-500/50 shadow-lg shadow-orange-500/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                            >
                              <CheckCircle size={16} />
                              <span className="hidden sm:inline">К закрытию</span>
                            </button>
                          )}

                          {goal.status === 'К закрытию' && (
                            <>
                              <button
                                onClick={() => handleCloseClick(goal.id)}
                                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/50 shadow-lg shadow-emerald-500/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                              >
                                <Check size={16} />
                                <span className="hidden sm:inline">Закрыть цель</span>
                              </button>
                              <button
                                onClick={() => rejectClosing(goal.id)}
                                className="bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-600 border border-pink-500/50 shadow-lg shadow-pink-500/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                              >
                                <X size={16} />
                                <span className="hidden sm:inline">На корректировку</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setShowComments(showComments === goal.id ? null : goal.id)}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
                          >
                            <MessageSquare size={16} />
                            <span className="hidden sm:inline">Комментарии ({goal.comments.length})</span>
                            <span className="sm:hidden">({goal.comments.length})</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Comments Section */}
                    {showComments === goal.id && (
                      <div className="pt-4 border-t border-gray-700/30">
                        <div className="space-y-3 mb-4">
                          {goal.comments.map(comment => (
                            <div key={comment.id} className="bg-[#0a0a0a]/50 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-white">{comment.author}</span>
                                <span className="text-xs text-gray-500">{comment.date}</span>
                              </div>
                              <p className="text-sm text-gray-300">{comment.text}</p>
                            </div>
                          ))}
                          {goal.comments.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">Комментариев пока нет</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Добавить комментарий..."
                            className="flex-1 bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-2 text-white text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && addComment(goal.id)}
                          />
                          <button
                            onClick={() => addComment(goal.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <TeamManagementModal 
        isOpen={isTeamModalOpen} 
        onClose={() => setIsTeamModalOpen(false)} 
      />

      <SelectExecutorModal 
        isOpen={isSelectExecutorModalOpen} 
        onClose={() => setIsSelectExecutorModalOpen(false)} 
        lastSelectedExecutor={lastSelectedExecutor}
        setLastSelectedExecutor={setLastSelectedExecutor}
        onExecutorSelect={handleExecutorSelect}
      />

      <PasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        onSuccess={handlePasswordSuccess}
      />

      {/* Completion Warning */}
      {showCompletionWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a]/40 backdrop-blur-md border border-gray-700/20 rounded-3xl p-6 shadow-2xl text-center">
            <h2 className="text-lg font-semibold text-white mb-4">Внимание!</h2>
            <p className="text-sm text-gray-400">Необходимо заполнить процент выполнения перед отправкой на закрытие!</p>
            <button
              onClick={() => setShowCompletionWarning(false)}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <X size={20} />
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}