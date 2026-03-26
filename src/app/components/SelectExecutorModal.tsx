import { useState, useEffect } from 'react';
import { X, Search, Save } from 'lucide-react';

interface TeamMember {
  id: number;
  product: string;
  fio: string;
  stream: string;
  leader: string;
}

interface Goal {
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

interface SelectExecutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastSelectedExecutor: { executor: string; team: string; stream: string };
  setLastSelectedExecutor: (data: { executor: string; team: string; stream: string }) => void;
  onExecutorSelect: (executor: string, team: string, stream: string, goalData?: Partial<Goal>) => void;
}

export function SelectExecutorModal({
  isOpen,
  onClose,
  lastSelectedExecutor,
  onExecutorSelect,
}: SelectExecutorModalProps) {
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [selectedExecutor, setSelectedExecutor] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('team-data');
    if (stored) {
      setTeamData(JSON.parse(stored));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Предзаполнение последним выбранным исполнителем
      setSelectedExecutor(lastSelectedExecutor.executor);
      setSelectedTeam(lastSelectedExecutor.team);
      setSelectedStream(lastSelectedExecutor.stream);
      setSearchQuery('');
      setShowForm(false);
      setNewGoal(null);
    }
  }, [isOpen, lastSelectedExecutor]);

  const handleExecutorClick = (member: TeamMember) => {
    setSelectedExecutor(member.fio);
    setSelectedTeam(member.product);
    setSelectedStream(member.stream);
  };

  const handleCreateGoal = () => {
    if (!selectedExecutor || !selectedTeam || !selectedStream) return;

    // Создаем начальный объект цели
    const initialGoal: Partial<Goal> = {
      description: 'Новая цель',
      category: 'Производство',
      weight: CATEGORY_WEIGHTS['Производство'],
      plan: '',
      fact: '',
      completionPercent: null,
      status: 'Черновик',
      executor: selectedExecutor,
      team: selectedTeam,
      stream: selectedStream,
    };

    setNewGoal(initialGoal);
    setShowForm(true);
  };

  const handleSaveGoal = () => {
    if (newGoal && selectedExecutor && selectedTeam && selectedStream) {
      // Передаем данные из формы через onExecutorSelect
      const updatedExecutorData = { 
        executor: selectedExecutor, 
        team: selectedTeam, 
        stream: selectedStream,
        goalData: newGoal // Добавляем данные цели
      };
      
      onExecutorSelect(selectedExecutor, selectedTeam, selectedStream, newGoal);
      // Закрываем форму
      setShowForm(false);
      setNewGoal(null);
    }
  };

  const handleCancel = () => {
    if (showForm) {
      setShowForm(false);
      setNewGoal(null);
    } else {
      onClose();
    }
  };

  const filteredData = teamData.filter((member) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.fio.toLowerCase().includes(query) ||
      member.product.toLowerCase().includes(query) ||
      member.stream.toLowerCase().includes(query)
    );
  });

  // Группировка по стримам
  const groupedByStream = filteredData.reduce((acc, member) => {
    if (!acc[member.stream]) {
      acc[member.stream] = [];
    }
    acc[member.stream].push(member);
    return acc;
  }, {} as Record<string, TeamMember[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-gray-700/30 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-700/30 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            {showForm ? 'Настройка цели' : 'Выбрать исполнителя и команду'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {!showForm ? (
          <>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по исполнителю, команде или стриму..."
                  className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg pl-10 pr-4 py-3 text-white"
                />
              </div>

              {/* Selected Information */}
              {selectedExecutor && (
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-400 mb-2">Выбрано:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Исполнитель:</span>
                      <div className="text-white font-medium">{selectedExecutor}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Команда:</span>
                      <div className="text-white font-medium">{selectedTeam}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Стрим:</span>
                      <div className="text-white font-medium">{selectedStream}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Members List Grouped by Stream */}
              <div className="space-y-4">
                {Object.entries(groupedByStream).map(([stream, members]) => (
                  <div key={stream}>
                    <h3 className="text-lg font-semibold text-white mb-3 sticky top-0 bg-[#1a1a1a] py-2 z-10">
                      {stream}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {members.map((member) => {
                        const isSelected = 
                          selectedExecutor === member.fio && 
                          selectedTeam === member.product && 
                          selectedStream === member.stream;

                        return (
                          <button
                            key={member.id}
                            onClick={() => handleExecutorClick(member)}
                            className={`text-left p-4 rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-blue-600/30 border-blue-500/50'
                                : 'bg-[#0a0a0a]/50 border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/50'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="text-white font-medium mb-1">{member.fio}</div>
                                <div className="text-sm text-gray-400">{member.product}</div>
                              </div>
                              <div className="text-xs text-gray-500">
                                Руководитель: {member.leader}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {filteredData.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">Исполнители не найдены</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-700/30 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateGoal}
                disabled={!selectedExecutor || !selectedTeam || !selectedStream}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors"
              >
                Создать цель
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {/* Goal Form */}
              <div className="space-y-4">
                {/* Executor Info */}
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Исполнитель:</span>
                      <div className="text-white font-medium">{selectedExecutor}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Команда:</span>
                      <div className="text-white font-medium">{selectedTeam}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Стрим:</span>
                      <div className="text-white font-medium">{selectedStream}</div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Описание цели</label>
                  <textarea
                    value={newGoal?.description || ''}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-3 text-white resize-none"
                    rows={3}
                    placeholder="Введите описание цели..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Категория</label>
                    <select
                      value={newGoal?.category || 'Производство'}
                      onChange={(e) => {
                        const category = e.target.value as Goal['category'];
                        setNewGoal({ 
                          ...newGoal, 
                          category,
                          weight: CATEGORY_WEIGHTS[category]
                        });
                      }}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-3 text-white"
                    >
                      <option value="VOC">VOC (рекомендуемый вес 20%)</option>
                      <option value="Проект/MBO/Личные">Проект/MBO/Личные (20%)</option>
                      <option value="Производство">Производство (35%)</option>
                      <option value="Продукт">Продукт (25%)</option>
                      <option value="Персоналии">Персоналии (0%)</option>
                    </select>
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Вес цели (%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newGoal?.weight || 0}
                      onChange={(e) => setNewGoal({ ...newGoal, weight: parseInt(e.target.value) })}
                      className="w-full mb-2"
                    />
                    <div className="text-center text-2xl font-bold text-white">{newGoal?.weight || 0}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Plan */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">План</label>
                    <input
                      type="text"
                      value={newGoal?.plan || ''}
                      onChange={(e) => setNewGoal({ ...newGoal, plan: e.target.value })}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-3 text-white"
                      placeholder="Целевое значение плана..."
                    />
                  </div>

                  {/* Fact */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Факт</label>
                    <input
                      type="text"
                      value={newGoal?.fact || ''}
                      onChange={(e) => setNewGoal({ ...newGoal, fact: e.target.value })}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-3 text-white"
                      placeholder="Текущее значение факта..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700/30 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={20} />
                Сохранить цель
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}