import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';

interface TeamMember {
  id: number;
  product: string;
  fio: string;
  stream: string;
  leader: string;
}

const DEFAULT_TEAM_DATA: TeamMember[] = [
  { id: 1, product: 'Лидер продуктового стрима', fio: 'Куникеев Мурат', stream: 'Канал АБ', leader: 'Белов Алексей' },
  { id: 2, product: 'Дашборд и навигация', fio: 'Тихонов Иван', stream: 'Канал АБ', leader: 'Куникеев Мурат' },
  { id: 3, product: 'Дашборд и навигация КИБ', fio: 'Щербаков Александр', stream: 'Канал АБ', leader: 'Куникеев Мурат' },
  { id: 4, product: 'Устранение UX дефектов', fio: 'Тихонов Иван', stream: 'Канал АБ', leader: 'Куникеев Мурат' },
  { id: 5, product: 'Отраслевые решения', fio: 'Баранова Кристина', stream: 'Канал АБ', leader: 'Куникеев Мурат' },
  { id: 6, product: 'Единая лента', fio: 'Возняня Мария', stream: 'Канал АБ', leader: 'Куникеев Мурат' },
  { id: 7, product: 'Дизайн - система АБ', fio: 'Гузов Дмитрий', stream: 'Канал АБ', leader: 'Куникеев Мурат' },
  { id: 8, product: 'АЛBO', fio: 'Вяткин Евгений', stream: 'Канал АБ', leader: 'Куникеев Мурат' },
  { id: 9, product: 'Лидер продуктового стрима', fio: 'Хисамов Айрат', stream: 'Коммуникации', leader: 'Белов Алексей' },
  { id: 10, product: 'Нотификации', fio: 'Анна Матвеева', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 11, product: 'Коммуникации ЛПР', fio: 'Роман Иванов', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 12, product: 'Письма АБ', fio: 'Ширин Меликулова', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 13, product: 'Письма КИБ', fio: 'Ширин Меликулова', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 14, product: 'Письма РК', fio: 'Ширин Меликулова', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 15, product: 'Коммуникации АБМ', fio: 'Мацурин Андрей', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 16, product: 'Чат', fio: 'Мишурин Андрей', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 17, product: 'Продукты коммуникаций в Альфа-Босс', fio: 'Барнеев Юрий', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 18, product: 'Spotlight', fio: 'Сумина Анастасия', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 19, product: 'PM (Spotlight)', fio: 'Роджобов Евгений', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 20, product: 'Бизнес-аналитик', fio: 'Каланшникова Светлана', stream: 'Коммуникации', leader: 'Хисамов Айрат' },
  { id: 21, product: 'Лидер продуктового стрима', fio: 'Панибратец Павел', stream: 'Digital Sales (Платформа)', leader: 'Белов Алексей' },
  { id: 22, product: 'Платформа Digital Sales и плейсменты', fio: 'Кобякова Наталья', stream: 'Digital Sales (Платформа)', leader: 'Панибратец Павел' },
  { id: 23, product: 'Витрина и Лендинги', fio: 'Диванов Станислав', stream: 'Digital Sales (Платформа)', leader: 'Панибратец Павел' },
  { id: 24, product: 'PM', fio: 'Журавлева Алина', stream: 'Digital Sales (Платформа)', leader: 'Панибратец Павел' },
  { id: 25, product: 'Лидер продуктового стрима', fio: 'Шляковская Ольга', stream: 'Digital Sales (КИБ и СБ)', leader: 'Белов Алексей' },
  { id: 26, product: 'Сделки ЛПР', fio: 'Ильин Кирилл', stream: 'Digital Sales (КИБ и СБ)', leader: 'Шляковская Ольга' },
  { id: 27, product: 'Сделки КИБ', fio: 'Селицкая Виктория', stream: 'Digital Sales (КИБ и СБ)', leader: 'Шляковская Ольга' },
  { id: 28, product: 'Конфигуратор и КП', fio: 'Вакансия', stream: 'Digital Sales (КИБ и СБ)', leader: 'Шляковская Ольга' },
  { id: 29, product: 'Продажи КИБ', fio: 'Ефремова Екатерина', stream: 'Digital Sales (КИБ и СБ)', leader: 'Шляковская Ольга' },
  { id: 30, product: 'Продажи СБ', fio: 'Осокина Рамина', stream: 'Digital Sales (КИБ и СБ)', leader: 'Шляковская Ольга' },
  { id: 31, product: 'PM', fio: 'Федорченко Дмитрий', stream: 'Digital Sales (КИБ и СБ)', leader: 'Шляковская Ольга' },
  { id: 32, product: 'PM', fio: 'Орлов Владимир', stream: 'Digital Sales (КИБ и СБ)', leader: 'Шляковская Ольга' },
  { id: 33, product: 'Лидер продуктового стрима', fio: 'Андреева Ксения', stream: 'Digital Sales (Продажи ММБ)', leader: 'Белов Алексей' },
  { id: 34, product: 'Продажи ММБ', fio: 'Ганеева Мария', stream: 'Digital Sales (Продажи ММБ)', leader: 'Андреева Ксения' },
  { id: 35, product: 'Партнерская витрина', fio: 'Ткаченко Марина', stream: 'Digital Sales (Продажи ММБ)', leader: 'Андреева Ксения' },
  { id: 36, product: 'PM', fio: 'Евсеев Александр', stream: 'Digital Sales (Продажи ММБ)', leader: 'Андреева Ксения' },
  { id: 37, product: 'PM', fio: 'Кароллова Валерия', stream: 'Digital Sales (Продажи ММБ)', leader: 'Андреева Ксения' },
  { id: 38, product: 'PM Вне команд', fio: 'Мускин Дмитрий', stream: 'Вне команд', leader: 'Белов Алексей' },
  { id: 39, product: 'PM Вне команд', fio: 'Каськинова Вероника', stream: 'Вне команд', leader: 'Белов Алексей' },
];

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TeamManagementModal({ isOpen, onClose }: TeamManagementModalProps) {
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [filterStream, setFilterStream] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('team-data');
    if (stored) {
      setTeamData(JSON.parse(stored));
    } else {
      setTeamData(DEFAULT_TEAM_DATA);
      localStorage.setItem('team-data', JSON.stringify(DEFAULT_TEAM_DATA));
    }
  }, []);

  const saveTeamData = (data: TeamMember[]) => {
    setTeamData(data);
    localStorage.setItem('team-data', JSON.stringify(data));
  };

  const addMember = () => {
    const newMember: TeamMember = {
      id: teamData.length > 0 ? Math.max(...teamData.map(m => m.id)) + 1 : 1,
      product: 'Новая команда',
      fio: '',
      stream: '',
      leader: '',
    };
    setEditingMember(newMember);
  };

  const updateMember = (member: TeamMember) => {
    if (teamData.find(m => m.id === member.id)) {
      saveTeamData(teamData.map(m => m.id === member.id ? member : m));
    } else {
      saveTeamData([...teamData, member]);
    }
    setEditingMember(null);
  };

  const deleteMember = (id: number) => {
    saveTeamData(teamData.filter(m => m.id !== id));
  };

  const filteredData = filterStream 
    ? teamData.filter(m => m.stream === filterStream)
    : teamData;

  const uniqueStreams = Array.from(new Set(teamData.map(m => m.stream)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-gray-700/30 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-700/30 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Управление командами и сотрудниками</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <select
              value={filterStream}
              onChange={(e) => setFilterStream(e.target.value)}
              className="bg-[#0a0a0a]/50 border border-gray-700/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Все стримы</option>
              {uniqueStreams.map(stream => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>

            <button
              onClick={addMember}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Добавить сотрудника
            </button>
          </div>

          {editingMember && (
            <div className="bg-[#0a0a0a]/50 border border-blue-500/30 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white mb-3">
                {teamData.find(m => m.id === editingMember.id) ? 'Редактирование' : 'Новый сотрудник'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Продукт/Команда</label>
                  <input
                    type="text"
                    value={editingMember.product}
                    onChange={(e) => setEditingMember({ ...editingMember, product: e.target.value })}
                    className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white"
                    placeholder="Название продукта или команды"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">ФИО (PO)</label>
                  <input
                    type="text"
                    value={editingMember.fio}
                    onChange={(e) => setEditingMember({ ...editingMember, fio: e.target.value })}
                    className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white"
                    placeholder="ФИО сотрудника"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Стрим</label>
                  <input
                    type="text"
                    value={editingMember.stream}
                    onChange={(e) => setEditingMember({ ...editingMember, stream: e.target.value })}
                    className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white"
                    placeholder="Название стрима"
                    list="stream-list"
                  />
                  <datalist id="stream-list">
                    {uniqueStreams.map(stream => (
                      <option key={stream} value={stream} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Руководитель</label>
                  <input
                    type="text"
                    value={editingMember.leader}
                    onChange={(e) => setEditingMember({ ...editingMember, leader: e.target.value })}
                    className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white"
                    placeholder="ФИО руководителя"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateMember(editingMember)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Save size={16} />
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingMember(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <X size={16} />
                  Отменить
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/50">
                  <th className="text-left text-gray-500 text-sm pb-3 px-2">Продукты</th>
                  <th className="text-left text-gray-500 text-sm pb-3 px-2">ФИО (PO)</th>
                  <th className="text-left text-gray-500 text-sm pb-3 px-2">Стрим</th>
                  <th className="text-left text-gray-500 text-sm pb-3 px-2">Руководитель</th>
                  <th className="text-left text-gray-500 text-sm pb-3 px-2 w-24">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(member => (
                  <tr key={member.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                    <td className="py-3 px-2 text-white text-sm">{member.product}</td>
                    <td className="py-3 px-2 text-white text-sm">{member.fio}</td>
                    <td className="py-3 px-2 text-gray-400 text-sm">{member.stream}</td>
                    <td className="py-3 px-2 text-gray-400 text-sm">{member.leader}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingMember(member)}
                          className="p-1 hover:bg-blue-600/20 rounded transition-colors"
                        >
                          <Edit2 size={16} className="text-blue-400" />
                        </button>
                        <button
                          onClick={() => deleteMember(member.id)}
                          className="p-1 hover:bg-red-600/20 rounded transition-colors"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700/30">
          <button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
