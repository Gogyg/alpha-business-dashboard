import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useOutletContext } from 'react-router';
import { PasswordModal } from '../components/PasswordModal';
import { dashboardAPI } from '../utils/api';

interface OutletContext {
  currentQuarter: string;
  setCurrentQuarter: (quarter: string) => void;
  currentYear: number;
  isEditingMode: boolean;
  setIsEditingMode: (value: boolean) => void;
}

interface Metric {
  id: number;
  name: string;
  weight: string;
  fact: number;
  plan: number;
  percent: string;
  isNew?: boolean;
  hasAlert?: boolean;
  runrate?: string;
}

export function Dashboard() {
  const { currentQuarter, currentYear, isEditingMode, setIsEditingMode } = useOutletContext<OutletContext>();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [digitalMetrics, setDigitalMetrics] = useState<Metric[]>([]);
  const [stabilityMetrics, setStabilityMetrics] = useState<Metric[]>([]);
  const [productionMetrics, setProductionMetrics] = useState<Metric[]>([]);
  const [vocData, setVocData] = useState<any>({});
  const [enpsData, setEnpsData] = useState<any>({});
  const [visibilityData, setVisibilityData] = useState<any>({});
  const [totalsConfig, setTotalsConfig] = useState<any>(getDefaultData().totalsConfig);
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
      digitalMetrics: [
        { id: 1, name: 'Доля digital активных клиентов ЮЛ в цифровых каналах (MAU)', weight: '20 %', fact: hasData ? 89.94 : 0, plan: 90.8, percent: hasData ? '99,1 %' : '0 %' },
        { id: 2, name: 'MAU Spotlight', weight: '20 %', fact: hasData ? 23800 : 0, plan: 21000, percent: hasData ? '113,3 %' : '0 %', isNew: true },
        { id: 3, name: 'Объем вторичных цифровых продаж продуктов ММБ', weight: '30 %', fact: hasData ? 171780 : 0, plan: 131736, percent: hasData ? '130,4 %' : '0 %', runrate: hasData ? '149,42%' : '0%' },
        { id: 4, name: 'Операционная прибыль от цифровых продаж СБ', weight: '30 %', fact: hasData ? 3.492 : 0, plan: 2.786, percent: hasData ? '125,3 %' : '0 %', isNew: true },
      ],
      stabilityMetrics: [
        { id: 1, name: 'Скорость загрузки главной страницы АБ', weight: '20 %', fact: hasData ? 2.8 : 0, plan: 4.2, percent: hasData ? '145,2 %' : '0 %' },
        { id: 2, name: 'VOC стабильности', weight: '20 %', fact: hasData ? 0.0345 : 0, plan: 0.06, percent: hasData ? '142,5 %' : '0 %' },
        { id: 3, name: 'Downtime канала АБ', weight: '20 %', fact: hasData ? 57 : 0, plan: 100, percent: hasData ? '100 %' : '0 %' },
        { id: 4, name: 'SLA инцидентов в платформе продаж', weight: '20 %', fact: hasData ? 100 : 0, plan: 80, percent: hasData ? '125,0 %' : '0 %', isNew: true },
        { id: 5, name: 'Стабильность платформы продаж (доля потерь просмотров)', weight: '20 %', fact: hasData ? 0.09 : 0, plan: 4.04, percent: hasData ? '120,0 %' : '0 %', isNew: true },
      ],
      productionMetrics: [
        { id: 1, name: 'НКПК ЦК ЮЛ (дефекты с учетом плато)', weight: '10 %', fact: hasData ? 100 : 0, plan: 100, percent: hasData ? '100 %' : '0 %' },
        { id: 2, name: 'Чистота ведения задач Jira', weight: '10 %', fact: hasData ? 98 : 0, plan: 100, percent: hasData ? '98 %' : '0 %' },
        { id: 3, name: 'Сходимость КР (прогнозируемая)', weight: '50 %', fact: hasData ? 91 : 0, plan: 90, percent: hasData ? '101,1 %' : '0 %' },
        { id: 4, name: 'Соблюдение стандартов', weight: '30 %', fact: hasData ? 85 : 0, plan: 80, percent: hasData ? '106,3 %' : '0 %', isNew: true },
      ],
      vocData: { nib: hasData ? 4.76 : 0, mmb: hasData ? 4.76 : 0, sb: hasData ? 4.76 : 0, kib: hasData ? 4.76 : 0, range: '4.75-4.78', plan: 85 },
      enpsData: { value: hasData ? 98 : 0, plan: 85 },
      visibilityData: { value: hasData ? 890 : 0, plan: 358 },
      totalsConfig: hasData ? {
        weights: { scoreCard: 30, stability: 20, production: 20, voc: 20, personnel: 10 },
        overrides: { scoreCard: '', stability: '', production: '', voc: '', personnel: '100', total: '' }
      } : {
        weights: { scoreCard: 30, stability: 20, production: 20, voc: 20, personnel: 10 },
        overrides: { scoreCard: '', stability: '', production: '', voc: '', personnel: '100', total: '' }
      },
      hiddenWidgets: {},
    };
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await dashboardAPI.get(currentQuarter);
        const sourceData = result || getDefaultData();
        
        setDigitalMetrics(sourceData.digitalMetrics);
        setStabilityMetrics(sourceData.stabilityMetrics);
        setProductionMetrics(sourceData.productionMetrics);
        setVocData(sourceData.vocData);
        setEnpsData(sourceData.enpsData);
        setVisibilityData(sourceData.visibilityData);
        setTotalsConfig(sourceData.totalsConfig || getDefaultData().totalsConfig);
        setHiddenWidgets(sourceData.hiddenWidgets || {});
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
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
      await dashboardAPI.save(currentQuarter, {
        digitalMetrics,
        stabilityMetrics,
        productionMetrics,
        vocData,
        enpsData,
        visibilityData,
        totalsConfig,
        hiddenWidgets,
      });

      // Mirror to localStorage for Export functionality in Layout
      const stored = localStorage.getItem('dashboard-data');
      const allData = stored ? JSON.parse(stored) : {};
      allData[currentQuarter] = {
        digitalMetrics,
        stabilityMetrics,
        productionMetrics,
        vocData,
        enpsData,
        visibilityData,
        totalsConfig,
        hiddenWidgets,
      };
      localStorage.setItem('dashboard-data', JSON.stringify(allData));
      setIsEditing(false);
      setIsEditingMode(false);
    } catch (err) {
      alert('Ошибка при сохранении: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (metrics: Metric[]) => {
    let totalWeight = 0;
    let totalScore = 0;
    metrics.forEach(metric => {
      const weight = parseFloat(metric.weight) / 100;
      const percent = parseFloat(metric.percent.replace(',', '.')) / 100;
      totalWeight += weight;
      totalScore += weight * percent;
    });
    return totalWeight > 0 ? (totalScore / totalWeight * 100).toFixed(0) : '0';
  };

  const scoreCardCalc = calculateScore(digitalMetrics);
  const stabilityCalc = calculateScore(stabilityMetrics);
  const productionCalc = calculateScore(productionMetrics);
  const vocCalc = vocData.nib >= 4.75 ? '100' : '0';

  const scoreCardValue = totalsConfig.overrides.scoreCard || scoreCardCalc;
  const stabilityValue = totalsConfig.overrides.stability || stabilityCalc;
  const productionValue = totalsConfig.overrides.production || productionCalc;
  const vocValue = totalsConfig.overrides.voc || vocCalc;
  const personnelValue = totalsConfig.overrides.personnel || '100';

  const calculatedTotal = Math.round(
    (parseInt(scoreCardValue || '0') * (totalsConfig.weights.scoreCard / 100)) +
    (parseInt(stabilityValue || '0') * (totalsConfig.weights.stability / 100)) +
    (parseInt(productionValue || '0') * (totalsConfig.weights.production / 100)) +
    (parseInt(vocValue || '0') * (totalsConfig.weights.voc / 100)) +
    (parseInt(personnelValue || '0') * (totalsConfig.weights.personnel / 100))
  );

  const totalRedCap = totalsConfig.overrides.total || calculatedTotal.toString();

  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setIsEditing(true);
  };

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    setIsEditingMode(false);
  };

  const handleEditMetric = (setter: any, id: number, field: string, value: any) => {
    setter((prev: Metric[]) => prev.map(metric => {
      if (metric.id === id) {
        const updated = { ...metric, [field]: value };
        if (field === 'fact' || field === 'plan') {
          const numFact = parseFloat(updated.fact) || 0;
          const numPlan = parseFloat(updated.plan) || 0;
          const percent = numPlan > 0 ? ((numFact / numPlan) * 100).toFixed(1) : '0.0';
          updated.percent = `${percent.replace('.', ',')} %`;
        }
        return updated;
      }
      return metric;
    }));
  };

  const addMetric = (setter: any) => {
    setter((prev: Metric[]) => [...prev, {
      id: Math.max(...prev.map(m => m.id)) + 1,
      name: 'Новый показатель',
      weight: '0 %',
      fact: 0,
      plan: 0,
      percent: '0 %'
    }]);
  };

  const deleteMetric = (setter: any, id: number) => {
    setter((prev: Metric[]) => prev.filter(m => m.id !== id));
  };

  const toggleWidgetVisibility = (widgetName: string) => {
    setHiddenWidgets((prev: any) => ({
      ...prev,
      [widgetName]: !prev[widgetName]
    }));
  };

  const renderMetricsTable = (title: string, metrics: Metric[], setter: any, widgetKey: string) => {
    const isHidden = hiddenWidgets[widgetKey];
    
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
        {isEditing && (
          <div className="absolute top-6 right-6 z-50 flex gap-2">
            <button
              onClick={() => toggleWidgetVisibility(widgetKey)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
            >
              {isHidden ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
            </button>
            <button
              onClick={() => addMetric(setter)}
              className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl transition-all border border-emerald-500/30"
            >
              <Plus size={16} className="text-emerald-400" />
            </button>
          </div>
        )}
        <div className={`${isHidden ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
          <h3 className="text-xl font-bold text-white mb-6 pr-24">{title}</h3>
          
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/50">
                  <th className="text-left text-gray-500 text-sm pb-3 w-12">№</th>
                  <th className="text-left text-gray-500 text-sm pb-3">Показатель</th>
                  <th className="text-left text-gray-500 text-sm pb-3 w-24">Вес</th>
                  <th className="text-left text-gray-500 text-sm pb-3 w-32">Факт</th>
                  <th className="text-left text-gray-500 text-sm pb-3 w-32">План</th>
                  <th className="text-left text-gray-500 text-sm pb-3 w-24">%</th>
                  {isEditing && <th className="w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => {
                  const percentValue = parseFloat(metric.percent);
                  const percentColor = percentValue >= 100 ? 'text-green-400' : percentValue >= 80 ? 'text-yellow-400' : 'text-red-400';
                  
                  return (
                    <tr key={metric.id} className="border-b border-gray-800/30 last:border-0">
                      <td className="py-4 text-white align-top">{metric.id}</td>
                      <td className="py-4 pr-4">
                        {isEditing ? (
                          <textarea
                            value={metric.name}
                            onChange={(e) => handleEditMetric(setter, metric.id, 'name', e.target.value)}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white resize-none"
                            rows={2}
                          />
                        ) : (
                          <span className="text-white block break-words">
                            {metric.name}{' '}
                            {metric.hasAlert && <span className="text-red-400 text-xs ml-2">!!!</span>}
                          </span>
                        )}
                        {metric.runrate && (
                          <div className="text-xs text-gray-500 mt-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={metric.runrate}
                                onChange={(e) => handleEditMetric(setter, metric.id, 'runrate', e.target.value)}
                                className="w-32 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-gray-400"
                                placeholder="Runrate"
                              />
                            ) : (
                              `Runrate: ${metric.runrate}`
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={metric.weight}
                            onChange={(e) => handleEditMetric(setter, metric.id, 'weight', e.target.value)}
                            className="w-20 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-gray-400"
                          />
                        ) : (
                          <span className="text-gray-400">{metric.weight}</span>
                        )}
                      </td>
                      <td className="py-4 align-top">
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={metric.fact}
                            onChange={(e) => handleEditMetric(setter, metric.id, 'fact', parseFloat(e.target.value))}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white"
                          />
                        ) : (
                          <span className={percentColor}>{metric.fact.toLocaleString('ru-RU')}</span>
                        )}
                      </td>
                      <td className="py-4 align-top">
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={metric.plan}
                            onChange={(e) => handleEditMetric(setter, metric.id, 'plan', parseFloat(e.target.value))}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white"
                          />
                        ) : (
                          <span className="text-gray-400">{metric.plan.toLocaleString('ru-RU')}</span>
                        )}
                      </td>
                      <td className={`py-4 font-semibold align-top ${percentColor}`}>{metric.percent}</td>
                      {isEditing && (
                        <td className="py-4 align-top">
                          <button
                            onClick={() => deleteMetric(setter, metric.id)}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden space-y-4">
            {metrics.map((metric) => {
              const percentValue = parseFloat(metric.percent);
              const percentColor = percentValue >= 100 ? 'text-green-400' : percentValue >= 80 ? 'text-yellow-400' : 'text-red-400';
              
              return (
                <div key={metric.id} className="border-b border-gray-800/30 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {isEditing ? (
                        <textarea
                          value={metric.name}
                          onChange={(e) => handleEditMetric(setter, metric.id, 'name', e.target.value)}
                          className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white resize-none text-sm"
                          rows={2}
                        />
                      ) : (
                        <span className="text-white text-sm block break-words">
                          {metric.name}{' '}
                          {metric.hasAlert && <span className="text-red-400 text-xs ml-2">!!!</span>}
                        </span>
                      )}
                      {metric.runrate && !isEditing && (
                        <div className="text-xs text-gray-500 mt-1">
                          Runrate: {metric.runrate}
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => deleteMetric(setter, metric.id)}
                        className="p-1 hover:bg-red-600/20 rounded transition-colors ml-2"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Вес</span>
                        <input
                          type="text"
                          value={metric.weight}
                          onChange={(e) => handleEditMetric(setter, metric.id, 'weight', e.target.value)}
                          className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-gray-400"
                        />
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Факт</span>
                        <input
                          type="number"
                          step="any"
                          value={metric.fact}
                          onChange={(e) => handleEditMetric(setter, metric.id, 'fact', parseFloat(e.target.value))}
                          className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">План</span>
                        <input
                          type="number"
                          step="any"
                          value={metric.plan}
                          onChange={(e) => handleEditMetric(setter, metric.id, 'plan', parseFloat(e.target.value))}
                          className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">%</span>
                        <div className={`font-semibold ${percentColor} px-2 py-1`}>{metric.percent}</div>
                      </div>
                      {metric.runrate && (
                        <div className="col-span-2">
                          <span className="text-gray-500 text-xs">Runrate</span>
                          <input
                            type="text"
                            value={metric.runrate}
                            onChange={(e) => handleEditMetric(setter, metric.id, 'runrate', e.target.value)}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-gray-400"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center mt-3">
                      <div className={`text-4xl font-bold ${percentColor}`}>
                        {metric.fact.toLocaleString('ru-RU')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading || !totalsConfig) {
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
          {renderMetricsTable('SCORE-КАРТА', digitalMetrics, setDigitalMetrics, 'scoreCard')}
          {renderMetricsTable('СТАБИЛЬНОСТЬ/ПРОЕКТЫ', stabilityMetrics, setStabilityMetrics, 'stability')}
          {renderMetricsTable('ПРОИЗВОДСТВО', productionMetrics, setProductionMetrics, 'production')}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('voc')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.voc ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.voc ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-4 pr-10">VOC Канал АБ</h3>
                
                {/* Main НИБ Value */}
                <div className="mb-6 flex flex-col items-start">
                  {isEditing ? (
                    <input type="number" step="0.01" value={vocData.nib} 
                      onChange={(e) => setVocData({...vocData, nib: parseFloat(e.target.value)})}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white text-4xl font-bold" />
                  ) : (
                    <div className="text-4xl font-bold text-green-400 mb-2">{vocData.nib}</div>
                  )}
                  <div className="text-sm text-gray-500">
                    {isEditing ? (
                      <input type="text" value={vocData.range}
                        onChange={(e) => setVocData({...vocData, range: e.target.value})}
                        className="w-32 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm" />
                    ) : (
                      `План ${vocData.range}`
                    )}
                  </div>
                </div>

                {/* Other values in a column */}
                <div className="space-y-3 mt-auto">
                  {[
                    { label: 'ММБ', key: 'mmb' },
                    { label: 'СБ', key: 'sb' },
                    { label: 'КИБ', key: 'kib' },
                  ].map(({ label, key }) => (
                    <div key={key} className="grid grid-cols-[1fr_1fr] items-center">
                      <div className="text-sm text-gray-500">{label}</div>
                      {isEditing ? (
                        <input type="number" step="0.01" value={vocData[key as keyof typeof vocData]} 
                          onChange={(e) => setVocData({...vocData, [key]: parseFloat(e.target.value)})}
                          className="w-20 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm font-bold" />
                      ) : (
                        <div className="text-lg font-bold text-green-400">{vocData[key as keyof typeof vocData]}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('enps')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.enps ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.enps ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-4 pr-10">eNPS</h3>
                {isEditing ? (
                  <div className="space-y-3">
                    <input type="number" value={enpsData.value} onChange={(e) => setEnpsData({...enpsData, value: parseInt(e.target.value)})}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white text-2xl font-bold" />
                    <input type="number" value={enpsData.plan} onChange={(e) => setEnpsData({...enpsData, plan: parseInt(e.target.value)})}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white" />
                  </div>
                ) : (
                  <><div className="text-4xl font-bold text-green-400 mb-2">{enpsData.value}%</div><div className="text-sm text-gray-500">План {enpsData.plan}%</div></>
                )}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col">
              {isEditing && (
                <button 
                  onClick={() => toggleWidgetVisibility('visibility')} 
                  className="absolute top-6 right-6 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.visibility ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
              )}
              <div className={`${hiddenWidgets.visibility ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <h3 className="text-xl font-bold text-white mb-4 pr-10">visibility</h3>
                {isEditing ? (
                  <div className="space-y-3">
                    <input type="number" value={visibilityData.value} onChange={(e) => setVisibilityData({...visibilityData, value: parseInt(e.target.value)})}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white text-2xl font-bold" />
                    <input type="number" value={visibilityData.plan} onChange={(e) => setVisibilityData({...visibilityData, plan: parseInt(e.target.value)})}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white" />
                  </div>
                ) : (
                  <><div className="text-4xl font-bold text-green-400 mb-2">{visibilityData.value}</div><div className="text-sm text-gray-500">План {'>'}{visibilityData.plan}</div></>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] border border-red-900/30 rounded-3xl p-6 shadow-[0_8px_30px_rgba(239,68,68,0.05)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
            <h3 className="text-sm text-gray-400 mb-4 uppercase tracking-wide font-medium relative z-10">Итоговые показатели красной шапочки</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end relative z-10">
              {[
                { id: 'scoreCard', title: 'SCORE-КАРТА', value: scoreCardValue, weight: totalsConfig.weights.scoreCard },
                { id: 'stability', title: 'СТАБИЛЬНОСТЬ/ПРОЕКТЫ', value: stabilityValue, weight: totalsConfig.weights.stability },
                { id: 'production', title: 'ПРОИЗВОДСТВО', value: productionValue, weight: totalsConfig.weights.production },
                { id: 'voc', title: 'VOC', value: vocValue, weight: totalsConfig.weights.voc },
                { id: 'personnel', title: 'Персоналии', value: personnelValue, weight: totalsConfig.weights.personnel },
                { id: 'total', title: 'ИТОГО КРАСНАЯ ШАПОЧКА', value: totalRedCap, weight: '', isTotal: true },
              ].map((item, index) => (
                <div key={index} className={`text-left ${item.isTotal ? 'lg:border-l lg:border-gray-700/50 lg:pl-4 col-span-2 md:col-span-3 lg:col-span-1 mt-4 lg:mt-0' : ''}`}>
                  <div className="text-xs text-gray-500 mb-2 uppercase min-h-[32px] flex items-center justify-start">{item.title}</div>
                  
                  {isEditing ? (
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={item.id === 'total' ? totalsConfig.overrides.total : totalsConfig.overrides[item.id as keyof typeof totalsConfig.overrides]} 
                        onChange={(e) => setTotalsConfig({...totalsConfig, overrides: {...totalsConfig.overrides, [item.id]: e.target.value}})} 
                        className={`w-full bg-[#0a0a0a]/80 border border-gray-700/50 rounded px-2 py-1 text-white ${item.isTotal ? 'text-2xl' : 'text-lg'} font-bold`} 
                        placeholder={item.id === 'total' ? calculatedTotal.toString() : 
                          item.id === 'scoreCard' ? scoreCardCalc : 
                          item.id === 'stability' ? stabilityCalc : 
                          item.id === 'production' ? productionCalc : 
                          item.id === 'voc' ? vocCalc : '100'}
                      />
                      {!item.isTotal && (
                        <div className="flex items-center text-xs text-gray-500">
                          Вес: <input 
                            type="number" 
                            value={totalsConfig.weights[item.id as keyof typeof totalsConfig.weights]} 
                            onChange={(e) => setTotalsConfig({...totalsConfig, weights: {...totalsConfig.weights, [item.id]: parseInt(e.target.value) || 0}})} 
                            className="w-12 bg-[#0a0a0a]/80 border border-gray-700/50 rounded px-1 ml-1 py-0.5 text-white" 
                          />%
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className={`${item.isTotal ? 'text-4xl bg-gradient-to-r from-[#34d399] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent' : 'text-2xl text-green-500'} font-bold mb-1`}>{item.value}%</div>
                      {!item.isTotal && <div className="text-xs text-gray-500">Вес {item.weight}%</div>}
                    </>
                  )}
                </div>
              ))}
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