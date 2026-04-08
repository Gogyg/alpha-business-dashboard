import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useOutletContext } from 'react-router';
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
  type?: '=' | '>=' | '<=' | '>' | '<';
  maxPercent?: string;
  percent: string;
  isNew?: boolean;
  hasAlert?: boolean;
  runrate?: string;
}

interface RedCapPageProps {
  loadData?: (quarter: string) => Promise<any>;
  saveData?: (quarter: string, data: any) => Promise<any>;
  localStorageKey?: string;
  vocTitle?: string;
  pageTitle?: string;
  backPath?: string;
  getDefaultDataOverride?: (quarter: string) => any;
}

export function RedCapPage({
  loadData: loadDataProp = dashboardAPI.get,
  saveData: saveDataProp = dashboardAPI.save,
  localStorageKey = 'dashboard-data',
  vocTitle = 'VOC Канал АБ',
  pageTitle,
  backPath,
  getDefaultDataOverride,
}: RedCapPageProps) {
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

  const normalizeMetric = (metric: Metric): Metric => ({
    ...metric,
    type: metric.type || '=',
    maxPercent: metric.maxPercent || '∞',
  });

  const parseMaxPercent = (value: string | undefined) => {
    if (!value || value === '∞') return Infinity;
    const numeric = parseFloat(value.replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : Infinity;
  };

  const formatPercent = (value: number) => `${value.toFixed(1).replace('.', ',')} %`;

  const calculateMetricPercent = (metric: Metric) => {
    const fact = parseFloat(String(metric.fact)) || 0;
    const plan = parseFloat(String(metric.plan)) || 0;
    if (plan <= 0 && fact <= 0) return 0;
    if (plan <= 0) return 0;

    let rawPercent = 0;
    if (metric.type === '<=' || metric.type === '<') {
      rawPercent = fact > 0 ? (plan / fact) * 100 : 100;
    } else {
      rawPercent = (fact / plan) * 100;
    }
    const cappedPercent = Math.min(rawPercent, parseMaxPercent(metric.maxPercent));
    return Number.isFinite(cappedPercent) ? Math.max(cappedPercent, 0) : 0;
  };

  const syncMetric = (metric: Metric): Metric => {
    const normalized = normalizeMetric(metric);
    return {
      ...normalized,
      percent: formatPercent(calculateMetricPercent(normalized)),
    };
  };

  const syncMetrics = (metrics: Metric[] = []) => metrics.map(syncMetric);

  useEffect(() => {
    if (isEditingMode && !isEditing) {
      setIsPasswordModalOpen(true);
    } else if (!isEditingMode) {
      setIsEditing(false);
    }
  }, [isEditingMode]);

  const getCurrentData = () => getDefaultData();

  function getDefaultData() {
    if (getDefaultDataOverride) {
      return getDefaultDataOverride(currentQuarter);
    }

    const hasData = currentQuarter === 'Q1';
    return {
      digitalMetrics: [
        { id: 1, name: 'Доля digital активных клиентов ЮЛ в цифровых каналах (MAU)', weight: '20 %', fact: hasData ? 89.94 : 0, plan: 90.8, type: '=', maxPercent: '∞', percent: hasData ? '99,1 %' : '0 %' },
        { id: 2, name: 'MAU Spotlight', weight: '20 %', fact: hasData ? 23800 : 0, plan: 21000, type: '=', maxPercent: '∞', percent: hasData ? '113,3 %' : '0 %', isNew: true },
        { id: 3, name: 'Объем вторичных цифровых продаж продуктов ММБ', weight: '30 %', fact: hasData ? 171780 : 0, plan: 131736, type: '=', maxPercent: '∞', percent: hasData ? '130,4 %' : '0 %', runrate: hasData ? '149,42%' : '0%' },
        { id: 4, name: 'Операционная прибыль от цифровых продаж СБ', weight: '30 %', fact: hasData ? 3.492 : 0, plan: 2.786, type: '=', maxPercent: '∞', percent: hasData ? '125,3 %' : '0 %', isNew: true },
      ],
      stabilityMetrics: [
        { id: 1, name: 'Скорость загрузки главной страницы АБ', weight: '20 %', fact: hasData ? 2.8 : 0, plan: 4.2, type: '<=', maxPercent: '∞', percent: hasData ? '145,2 %' : '0 %' },
        { id: 2, name: 'VOC стабильности', weight: '20 %', fact: hasData ? 0.0345 : 0, plan: 0.06, type: '<=', maxPercent: '∞', percent: hasData ? '142,5 %' : '0 %' },
        { id: 3, name: 'Downtime канала АБ', weight: '20 %', fact: hasData ? 57 : 0, plan: 100, type: '<=', maxPercent: '100', percent: hasData ? '100 %' : '0 %' },
        { id: 4, name: 'SLA инцидентов в платформе продаж', weight: '20 %', fact: hasData ? 100 : 0, plan: 80, type: '=', maxPercent: '∞', percent: hasData ? '125,0 %' : '0 %', isNew: true },
        { id: 5, name: 'Стабильность платформы продаж (доля потерь просмотров)', weight: '20 %', fact: hasData ? 0.09 : 0, plan: 4.04, type: '<=', maxPercent: '120', percent: hasData ? '120,0 %' : '0 %', isNew: true },
      ],
      productionMetrics: [
        { id: 1, name: 'НКПК ЦК ЮЛ (дефекты с учетом плато)', weight: '10 %', fact: hasData ? 100 : 0, plan: 100, type: '=', maxPercent: '∞', percent: hasData ? '100 %' : '0 %' },
        { id: 2, name: 'Чистота ведения задач Jira', weight: '10 %', fact: hasData ? 98 : 0, plan: 100, type: '=', maxPercent: '∞', percent: hasData ? '98 %' : '0 %' },
        { id: 3, name: 'Сходимость КР (прогнозируемая)', weight: '50 %', fact: hasData ? 91 : 0, plan: 90, type: '=', maxPercent: '∞', percent: hasData ? '101,1 %' : '0 %' },
        { id: 4, name: 'Соблюдение стандартов', weight: '30 %', fact: hasData ? 85 : 0, plan: 80, type: '=', maxPercent: '∞', percent: hasData ? '106,3 %' : '0 %', isNew: true },
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
        const result = await loadDataProp(currentQuarter);
        const sourceData = result || getDefaultData();
        
        setDigitalMetrics(syncMetrics(sourceData.digitalMetrics));
        setStabilityMetrics(syncMetrics(sourceData.stabilityMetrics));
        setProductionMetrics(syncMetrics(sourceData.productionMetrics));
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
      const payload = {
        digitalMetrics: syncMetrics(digitalMetrics),
        stabilityMetrics: syncMetrics(stabilityMetrics),
        productionMetrics: syncMetrics(productionMetrics),
        vocData,
        enpsData,
        visibilityData,
        totalsConfig,
        hiddenWidgets,
      };

      await saveDataProp(currentQuarter, payload);

      // Mirror to localStorage for Export functionality in Layout
      const stored = localStorage.getItem(localStorageKey);
      const allData = stored ? JSON.parse(stored) : {};
      allData[currentQuarter] = payload;
      localStorage.setItem(localStorageKey, JSON.stringify(allData));
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
      const percent = calculateMetricPercent(metric) / 100;
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
        const updated = normalizeMetric({ ...metric, [field]: value });
        if (field === 'fact' || field === 'plan' || field === 'type' || field === 'maxPercent') {
          updated.percent = formatPercent(calculateMetricPercent(updated));
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
      type: '=',
      maxPercent: '∞',
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
                  {isEditing && <th className="text-left text-gray-500 text-sm pb-3 w-20">Тип</th>}
                  <th className="text-left text-gray-500 text-sm pb-3 w-32">План</th>
                  <th className="text-left text-gray-500 text-sm pb-3 w-24">%</th>
                  {isEditing && <th className="text-left text-gray-500 text-sm pb-3 w-28">Макс%</th>}
                  {isEditing && <th className="w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => {
                  const percentValue = calculateMetricPercent(metric);
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
                      {isEditing && (
                        <td className="py-4 align-top">
                          <select
                            value={metric.type || '='}
                            onChange={(e) => handleEditMetric(setter, metric.id, 'type', e.target.value)}
                            className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1.5 text-emerald-300"
                          >
                            <option value="=">=</option>
                            <option value=">">{'>'}</option>
                            <option value=">=">{'>='}</option>
                            <option value="<">{'<'}</option>
                            <option value="<=">{'<='}</option>
                          </select>
                        </td>
                      )}
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
                          <span className="text-gray-400">{`${metric.type || '='} ${metric.plan.toLocaleString('ru-RU')}`}</span>
                        )}
                      </td>
                      <td className={`py-4 font-semibold align-top ${percentColor}`}>{formatPercent(percentValue)}</td>
                      {isEditing && (
                        <td className="py-4 align-top">
                          <input
                            type="text"
                            value={metric.maxPercent || '∞'}
                            onChange={(e) => handleEditMetric(setter, metric.id, 'maxPercent', e.target.value)}
                            className="w-full bg-[#0a0a0a]/50 border border-amber-500/30 rounded px-3 py-1.5 text-amber-300"
                            placeholder="∞"
                          />
                        </td>
                      )}
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
              const percentValue = calculateMetricPercent(metric);
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
                        <div className={`font-semibold ${percentColor} px-2 py-1`}>{formatPercent(percentValue)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Тип</span>
                        <select
                          value={metric.type || '='}
                          onChange={(e) => handleEditMetric(setter, metric.id, 'type', e.target.value)}
                          className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1 text-emerald-300"
                        >
                          <option value="=">=</option>
                          <option value=">">{'>'}</option>
                          <option value=">=">{'>='}</option>
                          <option value="<">{'<'}</option>
                          <option value="<=">{'<='}</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Макс%</span>
                        <input
                          type="text"
                          value={metric.maxPercent || '∞'}
                          onChange={(e) => handleEditMetric(setter, metric.id, 'maxPercent', e.target.value)}
                          className="w-full bg-[#0a0a0a]/50 border border-amber-500/30 rounded px-2 py-1 text-amber-300"
                          placeholder="∞"
                        />
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
                    <div className="text-center mt-3 space-y-2">
                      <div className={`text-4xl font-bold ${percentColor}`}>
                        {metric.fact.toLocaleString('ru-RU')}
                      </div>
                      <div className="text-xs text-gray-500">
                        План: {metric.type || '='} {metric.plan.toLocaleString('ru-RU')}
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
        {(pageTitle || backPath) && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {backPath && (
                <Link
                  to={backPath}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
                >
                  <ArrowLeft size={16} />
                  Назад
                </Link>
              )}
              {pageTitle && (
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">КШ CDPO</div>
                  <h2 className="text-3xl font-bold text-white">{pageTitle}</h2>
                </div>
              )}
            </div>
          </div>
        )}

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
                <h3 className="text-xl font-bold text-white mb-4 pr-10">{vocTitle}</h3>
                
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

export function Dashboard() {
  return <RedCapPage />;
}
