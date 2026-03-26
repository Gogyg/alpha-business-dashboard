import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router';
import { ProgressCircle } from '../components/ProgressCircle';
import { PasswordModal } from '../components/PasswordModal';
import { metricsAPI } from '../utils/api';

interface OutletContext {
  currentQuarter: string;
  setCurrentQuarter: (quarter: string) => void;
  currentYear: number;
  isEditingMode: boolean;
  setIsEditingMode: (value: boolean) => void;
}

export function Metrics() {
  const { currentQuarter, currentYear, isEditingMode, setIsEditingMode } = useOutletContext<OutletContext>();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [techStandards, setTechStandards] = useState<any>(null);
  const [salesStandard, setSalesStandard] = useState<any>(null);
  const [designStandard, setDesignStandard] = useState<any>(null);
  const [planningNext, setPlanningNext] = useState<any[]>([]);
  const [convergence, setConvergence] = useState<any[]>([]);
  const [t2m, setT2m] = useState<any[]>([]);
  const [utilization, setUtilization] = useState<any[]>([]);
  const [defects, setDefects] = useState<any[]>([]);
  const [keshp, setKeshp] = useState<any[]>([]);
  const [hiddenWidgets, setHiddenWidgets] = useState<any>({});

  useEffect(() => {
    if (isEditingMode && !isEditing) {
      setIsPasswordModalOpen(true);
    } else if (!isEditingMode) {
      setIsEditing(false);
    }
  }, [isEditingMode]);

  const getCurrentData = () => getDefaultData();

  function getDefaultData() {
    const hasData = currentQuarter === 'Q1';
    return {
      techStandards: {
        streams: [
          { name: 'Канал АБ', color: 'green' as const },
          { name: 'Продажи Платформа', color: 'green' as const },
          { name: 'Продажи СКБ', color: 'green' as const },
          { name: 'Коммуникации', color: 'green' as const },
        ],
        direction: hasData ? 83 : 0,
      },
      salesStandard: {
        streams: [
          { name: 'Канал АБ', color: 'green' as const },
          { name: 'Продажи Платформа', color: 'green' as const },
          { name: 'Продажи ММБ', color: 'green' as const },
          { name: 'Продажи СКБ', color: 'green' as const },
          { name: 'Коммуникации', color: 'green' as const },
        ],
        direction: hasData ? 100 : 0,
      },
      designStandard: {
        streams: [
          { name: 'Канал АБ', color: 'yellow' as const },
          { name: 'Продажи Платформа', color: 'green' as const },
          { name: 'Продажи ММБ', color: 'green' as const },
          { name: 'Продажи СКБ', color: 'green' as const },
          { name: 'Коммуникации', color: 'green' as const },
        ],
        kanalAB: hasData ? 72 : 0,
        direction: hasData ? 77 : 0,
      },
      planningNext: [
        { name: 'Мурат', value: hasData ? 100 : 0, color: 'green' as const },
        { name: 'Айрат', value: hasData ? 87 : 0, color: 'yellow' as const },
        { name: 'Паша', value: hasData ? 87 : 0, color: 'yellow' as const },
      ],
      convergence: [
        { name: 'Мурат', value: hasData ? 17 : 0, detail: { num: hasData ? 1 : 0, denom: 6 }, color: 'red' as const },
        { name: 'Айрат', value: hasData ? 33 : 0, detail: { num: hasData ? 3 : 0, denom: 9 }, color: 'yellow' as const },
        { name: 'Паша', value: hasData ? 71 : 0, detail: { num: hasData ? 5 : 0, denom: 7 }, color: 'green' as const },
        { name: 'Дирекция', value: hasData ? 40 : 0, detail: { num: hasData ? 9 : 0, denom: 22 }, color: 'yellow' as const },
      ],
      t2m: [
        { name: 'Мурат', value: hasData ? 76 : 0, color: 'green' as const },
        { name: 'Айрат', value: hasData ? 100 : 0, color: 'green' as const },
        { name: 'Паша', value: hasData ? 76 : 0, color: 'green' as const },
        { name: 'Дирекция', value: hasData ? 90 : 0, color: 'green' as const },
      ],
      utilization: [
        { name: 'Мурат', value: hasData ? 57 : 0, color: 'yellow' as const },
        { name: 'Айрат', value: hasData ? 49 : 0, color: 'red' as const },
        { name: 'Паша', value: hasData ? 93 : 0, color: 'green' as const },
        { name: 'Дирекция', value: hasData ? 64 : 0, color: 'yellow' as const },
      ],
      defects: [
        { name: 'Дефекты плато', value: hasData ? '7/11' : '0/0', color: 'green' as const },
        { name: 'Дефекты SLA', value: hasData ? '0' : '0', color: 'green' as const },
        { name: 'Откаты', value: hasData ? '5% (SLA ≤ 5%)' : '0%', color: 'green' as const },
        { name: 'ИБ SLA', value: hasData ? '2' : '0', color: 'red' as const },
      ],
      keshp: [
        { label: 'ОФ', value: hasData ? 100 : 0, vacancies: hasData ? 0 : 0 },
        { label: 'Менеджмент', value: hasData ? 97 : 0, vacancies: hasData ? 1 : 0 },
        { label: 'ИТ', value: hasData ? 98 : 0, vacancies: hasData ? 2 : 0 },
        { label: 'Все сотрудники', value: hasData ? 98 : 0, vacancies: hasData ? 3 : 0 },
      ],
      hiddenWidgets: {},
    };
  }

  // Initial load and manual save are handled by the useEffect and handleSave functions above.

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await metricsAPI.get(currentQuarter);
        const sourceData = result || getDefaultData();
        
        setTechStandards(sourceData.techStandards);
        setSalesStandard(sourceData.salesStandard);
        setDesignStandard(sourceData.designStandard);
        setPlanningNext(sourceData.planningNext);
        setConvergence(sourceData.convergence);
        setT2m(sourceData.t2m);
        setUtilization(sourceData.utilization);
        setDefects(sourceData.defects);
        setKeshp(sourceData.keshp);
        setHiddenWidgets(sourceData.hiddenWidgets || {});
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentQuarter]);

  const handleSave = async () => {
    if (!isEditing) return;
    try {
      setLoading(true);
      await metricsAPI.save(currentQuarter, {
        techStandards,
        salesStandard,
        designStandard,
        planningNext,
        convergence,
        t2m,
        utilization,
        defects,
        keshp,
        hiddenWidgets,
      });

      // Mirror to localStorage for Export functionality in Layout
      const stored = localStorage.getItem('metrics-data');
      const allData = stored ? JSON.parse(stored) : {};
      allData[currentQuarter] = {
        techStandards,
        salesStandard,
        designStandard,
        planningNext,
        convergence,
        t2m,
        utilization,
        defects,
        keshp,
        hiddenWidgets,
      };
      localStorage.setItem('metrics-data', JSON.stringify(allData));
      setIsEditing(false);
      setIsEditingMode(false);
    } catch (err) {
      alert('Ошибка при сохранении: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setIsEditing(true);
  };

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    setIsEditingMode(false);
  };

  const toggleWidgetVisibility = (widgetName: string) => {
    setHiddenWidgets((prev: any) => ({
      ...prev,
      [widgetName]: !prev[widgetName]
    }));
  };

  const StatusDot = ({ color, onClick }: { color: 'green' | 'yellow' | 'red', onClick?: () => void }) => {
    const colors = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
    };
    return (
      <span 
        className={`w-3 h-3 rounded-full ${colors[color]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={onClick}
      />
    );
  };

  const cycleColor = (current: 'green' | 'yellow' | 'red'): 'green' | 'yellow' | 'red' => {
    const cycle = { green: 'yellow', yellow: 'red', red: 'green' } as const;
    return cycle[current];
  };

  if (loading || !techStandards) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 pt-4 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="space-y-6">
          {/* Standards Section - 3 columns like VOC/eNPS/visibility */}
          <h2 className="text-2xl font-bold text-white mb-6">Стандарты</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tech Standards */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('techStandards')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.techStandards ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.techStandards ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-6 pr-10">Тех. стандарты</h3>
                <div className="text-xs text-gray-500 mb-4">План ≥ 80%</div>
                <div className="space-y-2 mb-6 text-sm">
                  {techStandards.streams.map((stream: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <StatusDot 
                        color={stream.color} 
                        onClick={isEditing ? () => {
                          setTechStandards({
                            ...techStandards,
                            streams: techStandards.streams.map((s: any, i: number) => 
                              i === idx ? { ...s, color: cycleColor(s.color) } : s
                            )
                          });
                        } : undefined}
                      />
                      <span className="text-gray-400">{stream.name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mt-auto">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" fill="none" stroke="#2a2a2a" strokeWidth="8" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="56" 
                        fill="none" 
                        stroke={techStandards.direction >= 80 ? '#22c55e' : techStandards.direction >= 60 ? '#eab308' : '#ef4444'}
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - techStandards.direction / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isEditing ? (
                        <input type="number" value={techStandards.direction} 
                          onChange={(e) => setTechStandards({...techStandards, direction: parseInt(e.target.value) || 0})}
                          className="w-16 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-3xl font-bold text-center" max={100} min={0} />
                      ) : (
                        <span className={`text-4xl font-bold ${techStandards.direction >= 80 ? 'text-green-400' : techStandards.direction >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {techStandards.direction}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-400 mt-3">Дирекция</div>
              </div>
            </div>

            {/* Sales Standard */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('salesStandard')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.salesStandard ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.salesStandard ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-6 pr-10">Стандарт продаж</h3>
                <div className="text-xs text-gray-500 mb-4">План ≥ 80%</div>
                <div className="space-y-2 mb-6 text-sm">
                  {salesStandard.streams.map((stream: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <StatusDot 
                        color={stream.color}
                        onClick={isEditing ? () => {
                          setSalesStandard({
                            ...salesStandard,
                            streams: salesStandard.streams.map((s: any, i: number) => 
                              i === idx ? { ...s, color: cycleColor(s.color) } : s
                            )
                          });
                        } : undefined}
                      />
                      <span className="text-gray-400">{stream.name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mt-auto">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" fill="none" stroke="#2a2a2a" strokeWidth="8" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="56" 
                        fill="none" 
                        stroke={salesStandard.direction >= 80 ? '#22c55e' : salesStandard.direction >= 60 ? '#eab308' : '#ef4444'}
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - salesStandard.direction / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isEditing ? (
                        <input type="number" value={salesStandard.direction}
                          onChange={(e) => setSalesStandard({...salesStandard, direction: parseInt(e.target.value) || 0})}
                          className="w-16 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-3xl font-bold text-center" max={100} min={0} />
                      ) : (
                        <span className={`text-4xl font-bold ${salesStandard.direction >= 80 ? 'text-green-400' : salesStandard.direction >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {salesStandard.direction}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-400 mt-3">Дирекция</div>
              </div>
            </div>

            {/* Design Standard */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('designStandard')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.designStandard ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.designStandard ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-6 pr-10">Дизайн стандарт</h3>
                <div className="text-xs text-gray-500 mb-4">План ≥ 80%</div>
                <div className="space-y-2 mb-6 text-sm">
                  {designStandard.streams.map((stream: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <StatusDot 
                        color={stream.color}
                        onClick={isEditing ? () => {
                          setDesignStandard({
                            ...designStandard,
                            streams: designStandard.streams.map((s: any, i: number) => 
                              i === idx ? { ...s, color: cycleColor(s.color) } : s
                            )
                          });
                        } : undefined}
                      />
                      <span className="text-gray-400">{stream.name}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div>
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="#2a2a2a" strokeWidth="8" />
                        <circle 
                          cx="64" 
                          cy="64" 
                          r="56" 
                          fill="none" 
                          stroke={designStandard.kanalAB >= 80 ? '#22c55e' : designStandard.kanalAB >= 60 ? '#eab308' : '#ef4444'}
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - designStandard.kanalAB / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isEditing ? (
                          <input type="number" value={designStandard.kanalAB}
                            onChange={(e) => setDesignStandard({...designStandard, kanalAB: parseInt(e.target.value) || 0})}
                            className="w-16 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-3xl font-bold text-center" max={100} min={0} />
                        ) : (
                          <span className={`text-4xl font-bold ${designStandard.kanalAB >= 80 ? 'text-green-400' : designStandard.kanalAB >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {designStandard.kanalAB}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-400 mt-3">Канал АБ</div>
                  </div>
                  <div>
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="#2a2a2a" strokeWidth="8" />
                        <circle 
                          cx="64" 
                          cy="64" 
                          r="56" 
                          fill="none" 
                          stroke={designStandard.direction >= 80 ? '#22c55e' : designStandard.direction >= 60 ? '#eab308' : '#ef4444'}
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - designStandard.direction / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isEditing ? (
                          <input type="number" value={designStandard.direction}
                            onChange={(e) => setDesignStandard({...designStandard, direction: parseInt(e.target.value) || 0})}
                            className="w-16 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-3xl font-bold text-center" max={100} min={0} />
                        ) : (
                          <span className={`text-4xl font-bold ${designStandard.direction >= 80 ? 'text-green-400' : designStandard.direction >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {designStandard.direction}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-400 mt-3">Дирекция</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PrP Header */}
          <h2 className="text-2xl font-bold text-white mt-8">ПрП</h2>

          {/* Planning Next Quarter and Convergence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Planning Next Quarter */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('planning')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.planning ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.planning ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-6 pr-10">Планирование след. Квартала</h3>
                <div className="text-xs text-gray-500 mb-4">План = 100%</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {planningNext.map((item: any, index: number) => (
                    <div key={index}>
                      <div className="relative w-24 h-24 mx-auto">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="#2a2a2a" strokeWidth="6" />
                          <circle 
                            cx="48" 
                            cy="48" 
                            r="40" 
                            fill="none" 
                            stroke={item.color === 'green' ? '#22c55e' : item.color === 'yellow' ? '#eab308' : '#ef4444'}
                            strokeWidth="6"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - item.value / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {isEditing ? (
                            <input type="number" value={item.value}
                              onChange={(e) => {
                                const newValue = parseInt(e.target.value) || 0;
                                setPlanningNext(planningNext.map((p: any, i: number) => 
                                  i === index ? {...p, value: newValue} : p
                                ));
                              }}
                              className="w-14 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-1 py-0.5 text-white text-xl font-bold text-center" max={100} min={0} />
                          ) : (
                            <span className="text-2xl font-bold text-white">
                              {item.value}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center text-sm text-gray-400 mt-2">{item.name}</div>
                      {isEditing && (
                        <div className="flex justify-center mt-2">
                          <StatusDot 
                            color={item.color}
                            onClick={() => {
                              const newColor = cycleColor(item.color);
                              setPlanningNext(planningNext.map((p: any, i: number) => i === index ? {...p, color: newColor} : p));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Convergence */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('convergence')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.convergence ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.convergence ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-6 pr-10">Сходимость КР</h3>
                <div className="text-xs text-gray-500 mb-4">План = 100%</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {convergence.map((item: any, index: number) => (
                    <div key={index}>
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#2a2a2a" strokeWidth="5" />
                          <circle 
                            cx="40" 
                            cy="40" 
                            r="34" 
                            fill="none" 
                            stroke={item.color === 'green' ? '#22c55e' : item.color === 'yellow' ? '#eab308' : '#ef4444'}
                            strokeWidth="5"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - item.value / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {isEditing ? (
                            <input type="number" value={item.value}
                              onChange={(e) => {
                                const newValue = parseInt(e.target.value) || 0;
                                setConvergence(convergence.map((c: any, i: number) => 
                                  i === index ? {...c, value: newValue} : c
                                ));
                              }}
                              className="w-12 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-1 py-0.5 text-white text-lg font-bold text-center" max={100} min={0} />
                          ) : (
                            <span className="text-lg font-bold text-white">
                              {item.value}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center text-xs text-gray-400 mt-1">{item.name}</div>
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <input type="number" value={item.detail.num}
                              onChange={(e) => setConvergence(convergence.map((c: any, i: number) => i === index ? {...c, detail: {...c.detail, num: parseInt(e.target.value) || 0}} : c))}
                              className="w-8 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-1 text-white text-xs text-center" />
                            /
                            <input type="number" value={item.detail.denom}
                              onChange={(e) => setConvergence(convergence.map((c: any, i: number) => i === index ? {...c, detail: {...c.detail, denom: parseInt(e.target.value) || 0}} : c))}
                              className="w-8 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-1 text-white text-xs text-center" />
                          </div>
                        ) : (
                          `${item.detail.num}/${item.detail.denom}`
                        )}
                      </div>
                      {isEditing && (
                        <div className="flex justify-center mt-1">
                          <StatusDot 
                            color={item.color}
                            onClick={() => {
                              const newColor = cycleColor(item.color);
                              setConvergence(convergence.map((c: any, i: number) => i === index ? {...c, color: newColor} : c));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* T2M and Utilization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* T2M */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('t2m')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.t2m ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.t2m ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-6 pr-10">T2M</h3>
                <div className="text-xs text-gray-500 mb-4">План {'<'} 120 чел./Дней</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {t2m.map((item: any, index: number) => (
                    <div key={index}>
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#2a2a2a" strokeWidth="5" />
                          <circle 
                            cx="40" 
                            cy="40" 
                            r="34" 
                            fill="none" 
                            stroke={item.color === 'green' ? '#22c55e' : item.color === 'yellow' ? '#eab308' : '#ef4444'}
                            strokeWidth="5"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - item.value / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {isEditing ? (
                            <input type="number" value={item.value}
                              onChange={(e) => {
                                const newValue = parseInt(e.target.value) || 0;
                                setT2m(t2m.map((t: any, i: number) => 
                                  i === index ? {...t, value: newValue} : t
                                ));
                              }}
                              className="w-12 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-1 py-0.5 text-white text-lg font-bold text-center" max={100} min={0} />
                          ) : (
                            <span className="text-lg font-bold text-white">
                              {item.value}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center text-xs text-gray-400 mt-1">{item.name}</div>
                      {isEditing && (
                        <div className="flex justify-center mt-1">
                          <StatusDot 
                            color={item.color}
                            onClick={() => {
                              const newColor = cycleColor(item.color);
                              setT2m(t2m.map((t: any, i: number) => i === index ? {...t, color: newColor} : t));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Utilization */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('utilization')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.utilization ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.utilization ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-6 pr-10">Утилизация ч/д на цели МП</h3>
                <div className="text-xs text-gray-500 mb-4">План ≥ 80%</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {utilization.map((item: any, index: number) => (
                    <div key={index}>
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#2a2a2a" strokeWidth="5" />
                          <circle 
                            cx="40" 
                            cy="40" 
                            r="34" 
                            fill="none" 
                            stroke={item.color === 'green' ? '#22c55e' : item.color === 'yellow' ? '#eab308' : '#ef4444'}
                            strokeWidth="5"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - item.value / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {isEditing ? (
                            <input type="number" value={item.value}
                              onChange={(e) => {
                                const newValue = parseInt(e.target.value) || 0;
                                setUtilization(utilization.map((u: any, i: number) => 
                                  i === index ? {...u, value: newValue} : u
                                ));
                              }}
                              className="w-12 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-1 py-0.5 text-white text-lg font-bold text-center" max={100} min={0} />
                          ) : (
                            <span className="text-lg font-bold text-white">
                              {item.value}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center text-xs text-gray-400 mt-1">{item.name}</div>
                      {isEditing && (
                        <div className="flex justify-center mt-1">
                          <StatusDot 
                            color={item.color}
                            onClick={() => {
                              const newColor = cycleColor(item.color);
                              setUtilization(utilization.map((u: any, i: number) => i === index ? {...u, color: newColor} : u));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* IT and KЗШР */}
          <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-8 items-center md:items-stretch">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 w-full md:w-[410px] relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('it')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.it ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.it ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-6 pr-10">ИТ</h3>
                <h4 className="text-gray-300 text-sm mb-4 text-left">Дефекты (НКПК, откаты, ИБ)</h4>
                <div className="space-y-3 text-sm max-w-xs mx-auto w-full">
                  {defects.map((defect: any, idx: number) => (
                    <div key={idx} className="flex items-center">
                      <div className="flex items-center gap-2 w-[160px]">
                        <StatusDot 
                          color={defect.color}
                          onClick={isEditing ? () => {
                            setDefects(defects.map((d: any, i: number) => 
                              i === idx ? { ...d, color: cycleColor(d.color) } : d
                            ));
                          } : undefined}
                        />
                        <span className="text-gray-400">{defect.name}</span>
                      </div>
                      <div className="flex-1 flex justify-start">
                        {isEditing ? (
                          <input type="text" value={defect.value}
                            onChange={(e) => setDefects(defects.map((d: any, i: number) => i === idx ? {...d, value: e.target.value} : d))}
                            className="w-24 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-xs text-left" />
                        ) : (
                          <span className="text-white font-medium text-left">{defect.value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 w-full md:w-[410px] relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('kzsr')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.kzsr ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.kzsr ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-6 pr-10">КЗШР</h3>
                <div className="grid grid-cols-2 gap-4">
                  {keshp.map((item: any, index: number) => {
                    const color = item.value >= 98 ? 'green' : 'red';
                    return (
                      <div key={index} className={`${color === 'green' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded-xl p-4`}>
                        <div className="text-gray-400 text-sm mb-1">{item.label}</div>
                        {isEditing ? (
                          <>
                            <input type="number" value={item.value}
                              onChange={(e) => setKeshp(keshp.map((k: any, i: number) => i === index ? {...k, value: parseInt(e.target.value) || 0} : k))}
                              className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-xl font-bold mb-2" max={100} min={0} />
                            <input type="number" value={item.vacancies}
                              onChange={(e) => setKeshp(keshp.map((k: any, i: number) => i === index ? {...k, vacancies: parseInt(e.target.value) || 0} : k))}
                              className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-xs" placeholder="Вакансии" />
                          </>
                        ) : (
                          <>
                            <div className={`text-2xl font-bold ${color === 'green' ? 'text-green-400' : 'text-red-400'}`}>{item.value}%</div>
                            <div className="text-gray-600 text-xs mt-1">Вакансии: {item.vacancies}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="fixed bottom-8 right-8 flex gap-3 z-[100]">
            <button 
              onClick={() => { setIsEditing(false); setIsEditingMode(false); window.location.reload(); }} 
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