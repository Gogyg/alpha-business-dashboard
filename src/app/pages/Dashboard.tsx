import { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Eye, EyeOff, Loader2, ArrowLeft, X, RotateCcw } from 'lucide-react';
import { Link, useOutletContext } from 'react-router';
import { PasswordModal } from '../components/PasswordModal';
import { dashboardAPI } from '../utils/api';
import { StandardStabilityWidgetCard, StandardVocWidgetCard } from '../components/RedcapStandardWidgets';

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
  factColor?: 'green' | 'yellow' | 'red';
  percentColor?: 'green' | 'yellow' | 'red';
}

interface RedCapPageProps {
  loadData?: (quarter: string) => Promise<any>;
  saveData?: (quarter: string, data: any) => Promise<any>;
  localStorageKey?: string;
  vocTitle?: string;
  pageTitle?: string;
  backPath?: string;
  getDefaultDataOverride?: (quarter: string) => any;
  enableTemplateAdd?: boolean;
}

interface VocItem {
  id: string;
  label: string;
  value: number;
  color?: 'green' | 'yellow' | 'red';
}

interface VocData {
  nib: number;
  nibColor?: 'green' | 'yellow' | 'red';
  range: string;
  plan: number;
  items: VocItem[];
}

type ExtraWidget =
  | {
      id: string;
      template: 'voc';
      title: string;
      vocData: VocData;
    }
  | {
      id: string;
      template: 'stability';
      title: string;
      metrics: Metric[];
    };

interface WidgetTitles {
  scoreCard: string;
  stability: string;
  production: string;
  voc: string;
  enps: string;
  visibility: string;
  totals: string;
}

const VOC_TEMPLATE_PREVIEW = {
  title: 'Название',
  nib: 0,
  nibColor: 'green' as const,
  range: '0-0',
  items: [
    { id: 'voc-preview-1', label: 'Название', value: 0, color: 'green' as const },
    { id: 'voc-preview-2', label: 'Название', value: 0, color: 'green' as const },
    { id: 'voc-preview-3', label: 'Название', value: 0, color: 'green' as const },
  ],
};

const STABILITY_TEMPLATE_PREVIEW = [
  { id: 1, name: 'Новый показатель', weight: '0 %', fact: 0, plan: 0, type: '=', maxPercent: '∞' as const },
];

export function RedCapPage({
  loadData: loadDataProp = dashboardAPI.get,
  saveData: saveDataProp = dashboardAPI.save,
  localStorageKey = 'dashboard-data',
  vocTitle = 'VOC Канал АБ',
  pageTitle,
  backPath,
  getDefaultDataOverride,
  enableTemplateAdd = false,
}: RedCapPageProps) {
  const { currentQuarter, currentYear, isEditingMode, setIsEditingMode } = useOutletContext<OutletContext>();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [digitalMetrics, setDigitalMetrics] = useState<Metric[]>([]);
  const [stabilityMetrics, setStabilityMetrics] = useState<Metric[]>([]);
  const [productionMetrics, setProductionMetrics] = useState<Metric[]>([]);
  const [vocData, setVocData] = useState<VocData>({ nib: 0, range: '0-0', plan: 85, items: [] });
  const [enpsData, setEnpsData] = useState<any>({});
  const [visibilityData, setVisibilityData] = useState<any>({});
  const [totalsConfig, setTotalsConfig] = useState<any>(getDefaultData().totalsConfig);
  const [hiddenWidgets, setHiddenWidgets] = useState<any>({});
  const [deletedWidgets, setDeletedWidgets] = useState<any>({});
  const [purgedWidgets, setPurgedWidgets] = useState<any>({});
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [extraWidgets, setExtraWidgets] = useState<ExtraWidget[]>([]);
  const [draggedExtraWidgetId, setDraggedExtraWidgetId] = useState<string | null>(null);
  const [dragOverExtraWidgetId, setDragOverExtraWidgetId] = useState<string | null>(null);
  const [bottomWidgetOrder, setBottomWidgetOrder] = useState<string[]>(['voc', 'enps', 'visibility']);
  const [draggedBottomWidgetKey, setDraggedBottomWidgetKey] = useState<string | null>(null);
  const [widgetTitles, setWidgetTitles] = useState<WidgetTitles>({
    scoreCard: 'SCORE-КАРТА',
    stability: 'СТАБИЛЬНОСТЬ/ПРОЕКТЫ',
    production: 'ПРОИЗВОДСТВО',
    voc: vocTitle,
    enps: 'eNPS',
    visibility: 'visibility',
    totals: 'Итоговые показатели красной шапочки',
  });
  const initialDataRef = useRef<any>(null);

  const normalizeMetric = (metric: Metric): Metric => {
    const rawMax = typeof metric.maxPercent === 'string' ? metric.maxPercent : '∞';
    const cleanedMax = rawMax.replace(/\s/g, '').replace(/∞/g, '') || '∞';
    return {
      ...metric,
      fact: Number.isFinite(Number(metric.fact)) ? Number(metric.fact) : 0,
      plan: Number.isFinite(Number(metric.plan)) ? Number(metric.plan) : 0,
      type: metric.type || '=',
      maxPercent: cleanedMax,
      factColor: metric.factColor,
      percentColor: metric.percentColor,
    };
  };

  const parseMaxPercent = (value: string | undefined) => {
    if (!value || value === '∞') return Infinity;
    const cleaned = value.replace('∞', '').replace(',', '.').trim();
    if (!cleaned) return Infinity;
    const numeric = parseFloat(cleaned);
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
  const isSameData = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

  const mergeChangedFields = (baseData: any, localData: any, latestData: any) => {
    const merged: any = {};
    const keys = new Set([
      ...Object.keys(baseData || {}),
      ...Object.keys(localData || {}),
      ...Object.keys(latestData || {}),
    ]);

    for (const key of keys) {
      const localValue = localData?.[key];
      const baseValue = baseData?.[key];
      const latestValue = latestData?.[key];
      const wasChangedLocally = !isSameData(localValue, baseValue);
      merged[key] = wasChangedLocally ? localValue : latestValue;
    }

    return merged;
  };

  const normalizeVocData = (raw: any): VocData => {
    const nib = Number.isFinite(Number(raw?.nib)) ? Number(raw.nib) : 0;
    const range = typeof raw?.range === 'string' ? raw.range : '0-0';
    const plan = Number.isFinite(Number(raw?.plan)) ? Number(raw.plan) : 85;

    const normalizedItems = Array.isArray(raw?.items)
      ? raw.items.slice(0, 5).map((item: any, index: number) => ({
          id: String(item?.id || `voc-item-${index + 1}`),
          label: typeof item?.label === 'string' && item.label.trim() ? item.label : `Строка ${index + 1}`,
          value: Number.isFinite(Number(item?.value)) ? Number(item.value) : 0,
          color: item?.color === 'yellow' || item?.color === 'red' ? item.color : 'green',
        }))
      : null;

    if (normalizedItems && normalizedItems.length > 0) {
      return {
        nib,
        nibColor: raw?.nibColor === 'yellow' || raw?.nibColor === 'red' ? raw.nibColor : 'green',
        range,
        plan,
        items: normalizedItems,
      };
    }

    const legacyItems: VocItem[] = [
      { id: 'voc-mmb', label: 'ММБ', value: Number.isFinite(Number(raw?.mmb)) ? Number(raw.mmb) : 0, color: 'green' },
      { id: 'voc-sb', label: 'СБ', value: Number.isFinite(Number(raw?.sb)) ? Number(raw.sb) : 0, color: 'green' },
      { id: 'voc-kib', label: 'КИБ', value: Number.isFinite(Number(raw?.kib)) ? Number(raw.kib) : 0, color: 'green' },
    ];

    return { nib, nibColor: 'green', range, plan, items: legacyItems };
  };

  function getDefaultWidgetTitles(): WidgetTitles {
    return {
    scoreCard: 'SCORE-КАРТА',
    stability: 'СТАБИЛЬНОСТЬ/ПРОЕКТЫ',
    production: 'ПРОИЗВОДСТВО',
    voc: vocTitle,
    enps: 'eNPS',
    visibility: 'visibility',
    totals: 'Итоговые показатели красной шапочки',
    };
  }

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
      vocData: {
        nib: hasData ? 4.76 : 0,
        nibColor: 'green',
        range: '4.75-4.78',
        plan: 85,
        items: [
          { id: 'voc-mmb', label: 'ММБ', value: hasData ? 4.76 : 0, color: 'green' },
          { id: 'voc-sb', label: 'СБ', value: hasData ? 4.76 : 0, color: 'green' },
          { id: 'voc-kib', label: 'КИБ', value: hasData ? 4.76 : 0, color: 'green' },
        ],
      },
      enpsData: { value: hasData ? 98 : 0, plan: 85 },
      visibilityData: { value: hasData ? 890 : 0, plan: 358 },
      totalsConfig: hasData ? {
        weights: { scoreCard: 30, stability: 20, production: 20, voc: 20, personnel: 10 },
        overrides: { scoreCard: '', stability: '', production: '', voc: '', personnel: '100', total: '' }
      } : {
        weights: { scoreCard: 30, stability: 20, production: 20, voc: 20, personnel: 10 },
        overrides: { scoreCard: '', stability: '', production: '', voc: '', personnel: '100', total: '' }
      },
      widgetTitles: getDefaultWidgetTitles(),
      hiddenWidgets: {},
      deletedWidgets: {},
      purgedWidgets: {},
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
        setVocData(normalizeVocData(sourceData.vocData));
        setEnpsData(sourceData.enpsData);
        setVisibilityData(sourceData.visibilityData);
        setTotalsConfig(sourceData.totalsConfig || getDefaultData().totalsConfig);
        setWidgetTitles({ ...getDefaultWidgetTitles(), ...(sourceData.widgetTitles || {}) });
        setHiddenWidgets(sourceData.hiddenWidgets || {});
        setDeletedWidgets(sourceData.deletedWidgets || {});
        setPurgedWidgets(sourceData.purgedWidgets || {});
        if (enableTemplateAdd) {
          setExtraWidgets(Array.isArray(sourceData.extraWidgets) ? sourceData.extraWidgets : []);
          setBottomWidgetOrder(
            Array.isArray(sourceData.bottomWidgetOrder) && sourceData.bottomWidgetOrder.length > 0
              ? sourceData.bottomWidgetOrder
              : ['voc', 'enps', 'visibility'],
          );
        } else {
          setExtraWidgets([]);
          setBottomWidgetOrder(['voc', 'enps', 'visibility']);
        }
        initialDataRef.current = {
          digitalMetrics: syncMetrics(sourceData.digitalMetrics || []),
          stabilityMetrics: syncMetrics(sourceData.stabilityMetrics || []),
          productionMetrics: syncMetrics(sourceData.productionMetrics || []),
          vocData: normalizeVocData(sourceData.vocData),
          enpsData: sourceData.enpsData,
          visibilityData: sourceData.visibilityData,
          totalsConfig: sourceData.totalsConfig || getDefaultData().totalsConfig,
          widgetTitles: { ...getDefaultWidgetTitles(), ...(sourceData.widgetTitles || {}) },
          hiddenWidgets: sourceData.hiddenWidgets || {},
          deletedWidgets: sourceData.deletedWidgets || {},
          purgedWidgets: sourceData.purgedWidgets || {},
          ...(enableTemplateAdd
            ? {
                extraWidgets: Array.isArray(sourceData.extraWidgets) ? sourceData.extraWidgets : [],
                bottomWidgetOrder:
                  Array.isArray(sourceData.bottomWidgetOrder) && sourceData.bottomWidgetOrder.length > 0
                    ? sourceData.bottomWidgetOrder
                    : ['voc', 'enps', 'visibility'],
              }
            : {}),
        };
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
      const localPayload = {
        digitalMetrics: syncMetrics(digitalMetrics),
        stabilityMetrics: syncMetrics(stabilityMetrics),
        productionMetrics: syncMetrics(productionMetrics),
        vocData,
        enpsData,
        visibilityData,
        totalsConfig,
        widgetTitles,
        hiddenWidgets,
        deletedWidgets,
        purgedWidgets,
        ...(enableTemplateAdd ? { extraWidgets, bottomWidgetOrder } : {}),
      };
      const latestRaw = (await loadDataProp(currentQuarter)) || getDefaultData();
      const latestPayload = {
        digitalMetrics: syncMetrics(latestRaw.digitalMetrics || []),
        stabilityMetrics: syncMetrics(latestRaw.stabilityMetrics || []),
        productionMetrics: syncMetrics(latestRaw.productionMetrics || []),
        vocData: normalizeVocData(latestRaw.vocData),
        enpsData: latestRaw.enpsData,
        visibilityData: latestRaw.visibilityData,
        totalsConfig: latestRaw.totalsConfig || getDefaultData().totalsConfig,
        widgetTitles: { ...getDefaultWidgetTitles(), ...(latestRaw.widgetTitles || {}) },
        hiddenWidgets: latestRaw.hiddenWidgets || {},
        deletedWidgets: latestRaw.deletedWidgets || {},
        purgedWidgets: latestRaw.purgedWidgets || {},
        ...(enableTemplateAdd
          ? {
              extraWidgets: Array.isArray(latestRaw.extraWidgets) ? latestRaw.extraWidgets : [],
              bottomWidgetOrder:
                Array.isArray(latestRaw.bottomWidgetOrder) && latestRaw.bottomWidgetOrder.length > 0
                  ? latestRaw.bottomWidgetOrder
                  : ['voc', 'enps', 'visibility'],
            }
          : {}),
      };
      const basePayload = initialDataRef.current || localPayload;
      const payload = mergeChangedFields(basePayload, localPayload, latestPayload);

      await saveDataProp(currentQuarter, payload);

      // Mirror to localStorage for Export functionality in Layout
      const stored = localStorage.getItem(localStorageKey);
      const allData = stored ? JSON.parse(stored) : {};
      allData[currentQuarter] = payload;
      localStorage.setItem(localStorageKey, JSON.stringify(allData));
      initialDataRef.current = JSON.parse(JSON.stringify(payload));
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

  const formatMetricNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return value.toLocaleString('ru-RU');
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
        let nextValue = value;
        if (field === 'maxPercent') {
          const raw = String(value).replace(/\s/g, '');
          if (!raw || raw === '∞') {
            nextValue = '∞';
          } else {
            nextValue = raw.replace(/∞/g, '');
          }
        }
        const updated = normalizeMetric({ ...metric, [field]: nextValue });
        if (field === 'fact' || field === 'plan' || field === 'type' || field === 'maxPercent') {
          updated.percent = formatPercent(calculateMetricPercent(updated));
        }
        return updated;
      }
      return metric;
    }));
  };

  const cycleColor = (color?: Metric['factColor']) => {
    if (!color) return 'green';
    if (color === 'green') return 'yellow';
    if (color === 'yellow') return 'red';
    return undefined;
  };

  const factColorClass = (color?: Metric['factColor']) => {
    if (color === 'green') return 'text-green-400';
    if (color === 'yellow') return 'text-yellow-400';
    if (color === 'red') return 'text-red-400';
    return '';
  };

  const factDotClass = (color?: Metric['factColor']) => {
    if (color === 'green') return 'bg-green-400/80 border-green-400';
    if (color === 'yellow') return 'bg-yellow-400/80 border-yellow-400';
    if (color === 'red') return 'bg-red-400/80 border-red-400';
    return 'bg-white/10 border-white/20';
  };

  const percentColorClass = (color?: Metric['percentColor']) => {
    if (color === 'green') return 'text-green-400';
    if (color === 'yellow') return 'text-yellow-400';
    if (color === 'red') return 'text-red-400';
    return '';
  };

  const percentDotClass = (color?: Metric['percentColor']) => {
    if (color === 'green') return 'bg-green-400/80 border-green-400';
    if (color === 'yellow') return 'bg-yellow-400/80 border-yellow-400';
    if (color === 'red') return 'bg-red-400/80 border-red-400';
    return 'bg-white/10 border-white/20';
  };

  const vocColorClass = (color?: 'green' | 'yellow' | 'red') => {
    if (color === 'yellow') return 'text-yellow-400';
    if (color === 'red') return 'text-red-400';
    return 'text-green-400';
  };

  const vocDotClass = (color?: 'green' | 'yellow' | 'red') => {
    if (color === 'yellow') return 'bg-yellow-400/80 border-yellow-400';
    if (color === 'red') return 'bg-red-400/80 border-red-400';
    return 'bg-green-400/80 border-green-400';
  };

  const cycleVocColor = (color?: 'green' | 'yellow' | 'red'): 'green' | 'yellow' | 'red' => {
    if (color === 'green') return 'yellow';
    if (color === 'yellow') return 'red';
    return 'green';
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

  const addVocItem = () => {
    setVocData((prev) => {
      const items = Array.isArray(prev.items) ? prev.items : [];
      if (items.length >= 5) return prev;
      return {
        ...prev,
        items: [
          ...items,
          {
            id: `voc-item-${Date.now()}`,
            label: `Строка ${items.length + 1}`,
            value: 0,
            color: 'green',
          },
        ],
      };
    });
  };

  const updateVocItem = (id: string, patch: Partial<VocItem>) => {
    setVocData((prev) => ({
      ...prev,
      items: (prev.items || []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const deleteVocItem = (id: string) => {
    setVocData((prev) => ({
      ...prev,
      items: (prev.items || []).filter((item) => item.id !== id),
    }));
  };

  const toggleWidgetVisibility = (widgetName: string) => {
    setHiddenWidgets((prev: any) => ({
      ...prev,
      [widgetName]: !prev[widgetName]
    }));
  };

  const deleteWidget = (widgetName: string, widgetLabel: string) => {
    const confirmed = window.confirm(`Удалить виджет "${widgetLabel}"?`);
    if (!confirmed) return;
    setDeletedWidgets((prev: any) => ({
      ...prev,
      [widgetName]: true,
    }));
    setHiddenWidgets((prev: any) => ({
      ...prev,
      [widgetName]: false,
    }));
  };

  const restoreWidget = (widgetName: string) => {
    setDeletedWidgets((prev: any) => ({
      ...prev,
      [widgetName]: false,
    }));
    setPurgedWidgets((prev: any) => ({
      ...prev,
      [widgetName]: false,
    }));
  };

  const purgeWidget = (widgetName: string) => {
    const confirmed = window.confirm('Удалить окончательно? Виджет исчезнет из корзины и восстановить его будет нельзя.');
    if (!confirmed) return;
    setDeletedWidgets((prev: any) => ({
      ...prev,
      [widgetName]: false,
    }));
    setPurgedWidgets((prev: any) => ({
      ...prev,
      [widgetName]: true,
    }));
  };

  const addWidgetFromTemplate = (template: 'voc' | 'stability') => {
    if (template === 'voc') {
      setExtraWidgets((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          template: 'voc',
          title: 'Название',
          vocData: {
            nib: 0,
            nibColor: 'green',
            range: '0-0',
            plan: 85,
            items: [{ id: `voc-item-${Date.now()}`, label: 'Название', value: 0, color: 'green' }],
          },
        },
      ]);
    } else {
      setExtraWidgets((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          template: 'stability',
          title: 'СТАБИЛЬНОСТЬ/ПРОЕКТЫ',
          metrics: [{ id: 1, name: 'Новый показатель', weight: '0 %', fact: 0, plan: 0, type: '=', maxPercent: '∞', percent: '0 %' }],
        },
      ]);
    }
    setIsTemplateModalOpen(false);
  };

  const moveExtraWidget = (fromId: string, toId: string) => {
    setExtraWidgets((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === fromId);
      const toIndex = prev.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const moveBottomWidget = (fromKey: string, toKey: string) => {
    setBottomWidgetOrder((prev) => {
      const fromIndex = prev.indexOf(fromKey);
      const toIndex = prev.indexOf(toKey);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const getBottomWidgetOrder = (key: string) => {
    const index = bottomWidgetOrder.indexOf(key);
    return index >= 0 ? index : 999;
  };

  const widgetCatalog = [
    { key: 'scoreCard', title: widgetTitles.scoreCard },
    { key: 'stability', title: widgetTitles.stability },
    { key: 'production', title: widgetTitles.production },
    { key: 'voc', title: widgetTitles.voc },
    { key: 'enps', title: widgetTitles.enps },
    { key: 'visibility', title: widgetTitles.visibility },
    { key: 'totals', title: widgetTitles.totals },
  ];

  const deletedWidgetList = widgetCatalog.filter((widget) => deletedWidgets[widget.key] && !purgedWidgets[widget.key]);

  const renderMetricsTable = (titleKey: keyof WidgetTitles, metrics: Metric[], setter: any, widgetKey: string) => {
    const isHidden = hiddenWidgets[widgetKey];
    const isDeleted = deletedWidgets[widgetKey];
    const isPurged = purgedWidgets[widgetKey];
    const title = widgetTitles[titleKey];
    if (isDeleted || isPurged) return null;
    
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
              onClick={() => deleteWidget(widgetKey, title)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400"
              title="Удалить виджет"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        <div className={`${isHidden ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
          <div className="mb-6 pr-24">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setWidgetTitles((prev) => ({ ...prev, [titleKey]: e.target.value }))}
                className="w-full max-w-xl bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-xl font-bold text-white"
              />
            ) : (
              <h3 className="text-xl font-bold text-white">{title}</h3>
            )}
          </div>
          
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
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              value={metric.fact}
                              onChange={(e) => handleEditMetric(setter, metric.id, 'fact', parseFloat(e.target.value))}
                              className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleEditMetric(setter, metric.id, 'factColor', cycleColor(metric.factColor))
                              }
                              className={`h-4 w-4 rounded-full border ${factDotClass(metric.factColor)} transition-colors`}
                              title="Цвет факта"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={metric.factColor ? factColorClass(metric.factColor) : percentColor}>
                              {formatMetricNumber(metric.fact)}
                            </span>
                          </div>
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
                          <span className="text-gray-400">{`${metric.type || '='} ${formatMetricNumber(metric.plan)}`}</span>
                        )}
                      </td>
                      <td className="py-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${metric.percentColor ? percentColorClass(metric.percentColor) : percentColor}`}>
                            {formatPercent(percentValue)}
                          </span>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() =>
                                handleEditMetric(setter, metric.id, 'percentColor', cycleColor(metric.percentColor))
                              }
                              className={`h-4 w-4 rounded-full border ${percentDotClass(metric.percentColor)} transition-colors`}
                              title="Цвет процента"
                            />
                          )}
                        </div>
                      </td>
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
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            value={metric.fact}
                            onChange={(e) => handleEditMetric(setter, metric.id, 'fact', parseFloat(e.target.value))}
                            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleEditMetric(setter, metric.id, 'factColor', cycleColor(metric.factColor))
                            }
                            className={`h-4 w-4 rounded-full border ${factDotClass(metric.factColor)} transition-colors`}
                            title="Цвет факта"
                          />
                        </div>
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
                        <div className="flex items-center gap-2 px-2 py-1">
                          <div className={`font-semibold ${metric.percentColor ? percentColorClass(metric.percentColor) : percentColor}`}>
                            {formatPercent(percentValue)}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleEditMetric(setter, metric.id, 'percentColor', cycleColor(metric.percentColor))
                            }
                            className={`h-4 w-4 rounded-full border ${percentDotClass(metric.percentColor)} transition-colors`}
                            title="Цвет процента"
                          />
                        </div>
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
                      <div className={`text-4xl font-bold ${metric.factColor ? factColorClass(metric.factColor) : percentColor}`}>
                        {formatMetricNumber(metric.fact)}
                      </div>
                      <div className={`text-base font-semibold ${metric.percentColor ? percentColorClass(metric.percentColor) : percentColor}`}>
                        {formatPercent(percentValue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        План: {metric.type || '='} {formatMetricNumber(metric.plan)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {isEditing && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => addMetric(setter)}
                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl transition-all border border-emerald-500/30"
              >
                <Plus size={16} className="text-emerald-400" />
              </button>
            </div>
          )}
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
          {renderMetricsTable('scoreCard', digitalMetrics, setDigitalMetrics, 'scoreCard')}
          {renderMetricsTable('stability', stabilityMetrics, setStabilityMetrics, 'stability')}
          {renderMetricsTable('production', productionMetrics, setProductionMetrics, 'production')}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {!deletedWidgets.voc && !purgedWidgets.voc && (
            <div
              draggable={enableTemplateAdd && isEditing}
              onDragStart={() => setDraggedBottomWidgetKey('voc')}
              onDragOver={(event) => {
                if (enableTemplateAdd && isEditing) event.preventDefault();
              }}
              onDrop={() => {
                if (enableTemplateAdd && isEditing && draggedBottomWidgetKey) {
                  moveBottomWidget(draggedBottomWidgetKey, 'voc');
                }
                setDraggedBottomWidgetKey(null);
              }}
              onDragEnd={() => setDraggedBottomWidgetKey(null)}
              style={enableTemplateAdd ? { order: getBottomWidgetOrder('voc') } : undefined}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col"
            >
              {isEditing && (
                <div className="absolute top-6 right-6 z-50 flex gap-2">
                  <button
                    onClick={() => toggleWidgetVisibility('voc')}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                  >
                    {hiddenWidgets.voc ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                  </button>
                  <button
                    onClick={() => deleteWidget('voc', widgetTitles.voc)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400"
                    title="Удалить виджет"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <div className={`${hiddenWidgets.voc ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <StandardVocWidgetCard
                  widget={{ ...vocData, title: widgetTitles.voc }}
                  isEditing={isEditing}
                  onWidgetChange={(patch) => {
                    if (typeof patch.title === 'string') {
                      setWidgetTitles((prev) => ({ ...prev, voc: patch.title as string }));
                    }
                    const { title: _title, ...vocPatch } = patch as any;
                    if (Object.keys(vocPatch).length > 0) {
                      setVocData((prev) => ({ ...prev, ...vocPatch }));
                    }
                  }}
                  onRowChange={updateVocItem}
                  onDeleteRow={deleteVocItem}
                  onAddRow={addVocItem}
                />
              </div>
            </div>
            )}

            {!deletedWidgets.enps && !purgedWidgets.enps && (
            <div
              draggable={enableTemplateAdd && isEditing}
              onDragStart={() => setDraggedBottomWidgetKey('enps')}
              onDragOver={(event) => {
                if (enableTemplateAdd && isEditing) event.preventDefault();
              }}
              onDrop={() => {
                if (enableTemplateAdd && isEditing && draggedBottomWidgetKey) {
                  moveBottomWidget(draggedBottomWidgetKey, 'enps');
                }
                setDraggedBottomWidgetKey(null);
              }}
              onDragEnd={() => setDraggedBottomWidgetKey(null)}
              style={enableTemplateAdd ? { order: getBottomWidgetOrder('enps') } : undefined}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col"
            >
              {isEditing && (
                <div className="absolute top-6 right-6 z-50 flex gap-2">
                  <button 
                    onClick={() => toggleWidgetVisibility('enps')} 
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                  >
                    {hiddenWidgets.enps ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                  </button>
                  <button
                    onClick={() => deleteWidget('enps', widgetTitles.enps)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400"
                    title="Удалить виджет"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <div className={`${hiddenWidgets.enps ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <div className="mb-4 pr-10">
                  {isEditing ? (
                    <input
                      type="text"
                      value={widgetTitles.enps}
                      onChange={(e) => setWidgetTitles((prev) => ({ ...prev, enps: e.target.value }))}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-xl font-bold text-white"
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-white">{widgetTitles.enps}</h3>
                  )}
                </div>
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
            )}

            {!deletedWidgets.visibility && !purgedWidgets.visibility && (
            <div
              draggable={enableTemplateAdd && isEditing}
              onDragStart={() => setDraggedBottomWidgetKey('visibility')}
              onDragOver={(event) => {
                if (enableTemplateAdd && isEditing) event.preventDefault();
              }}
              onDrop={() => {
                if (enableTemplateAdd && isEditing && draggedBottomWidgetKey) {
                  moveBottomWidget(draggedBottomWidgetKey, 'visibility');
                }
                setDraggedBottomWidgetKey(null);
              }}
              onDragEnd={() => setDraggedBottomWidgetKey(null)}
              style={enableTemplateAdd ? { order: getBottomWidgetOrder('visibility') } : undefined}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20 relative flex flex-col"
            >
              {isEditing && (
                <div className="absolute top-6 right-6 z-50 flex gap-2">
                  <button 
                    onClick={() => toggleWidgetVisibility('visibility')} 
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                  >
                    {hiddenWidgets.visibility ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                  </button>
                  <button
                    onClick={() => deleteWidget('visibility', widgetTitles.visibility)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400"
                    title="Удалить виджет"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <div className={`${hiddenWidgets.visibility ? 'opacity-40 blur-[2px] pointer-events-none' : ''} transition-all flex flex-col flex-1`}>
                <div className="mb-4 pr-10">
                  {isEditing ? (
                    <input
                      type="text"
                      value={widgetTitles.visibility}
                      onChange={(e) => setWidgetTitles((prev) => ({ ...prev, visibility: e.target.value }))}
                      className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-xl font-bold text-white"
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-white">{widgetTitles.visibility}</h3>
                  )}
                </div>
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
            )}
          </div>

          {!deletedWidgets.totals && !purgedWidgets.totals && (
          <div className="bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] border border-red-900/30 rounded-3xl p-6 shadow-[0_8px_30px_rgba(239,68,68,0.05)] relative overflow-hidden">
            {isEditing && (
              <div className="absolute top-6 right-6 z-50 flex gap-2">
                <button
                  onClick={() => toggleWidgetVisibility('totals')}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                >
                  {hiddenWidgets.totals ? <Eye size={16} className="text-white" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
                <button
                  onClick={() => deleteWidget('totals', widgetTitles.totals)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400"
                  title="Удалить виджет"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
            <div className="mb-4 relative z-10">
              {isEditing ? (
                <input
                  type="text"
                  value={widgetTitles.totals}
                  onChange={(e) => setWidgetTitles((prev) => ({ ...prev, totals: e.target.value }))}
                  className="w-full max-w-2xl bg-[#0a0a0a]/60 border border-gray-700/40 rounded px-3 py-2 text-sm text-gray-300 uppercase tracking-wide font-medium"
                />
              ) : (
                <h3 className="text-sm text-gray-400 uppercase tracking-wide font-medium">{widgetTitles.totals}</h3>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end relative z-10">
              {[
                { id: 'scoreCard', title: widgetTitles.scoreCard, value: scoreCardValue, weight: totalsConfig.weights.scoreCard },
                { id: 'stability', title: widgetTitles.stability, value: stabilityValue, weight: totalsConfig.weights.stability },
                { id: 'production', title: widgetTitles.production, value: productionValue, weight: totalsConfig.weights.production },
                { id: 'voc', title: widgetTitles.voc, value: vocValue, weight: totalsConfig.weights.voc },
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
          )}

          {enableTemplateAdd && (isEditing || extraWidgets.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="aspect-square rounded-3xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30 transition-all flex items-center justify-center text-center group"
                >
                  <div className="flex flex-col items-center gap-5">
                    <div className="size-16 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Plus size={28} className="text-gray-200" />
                    </div>
                    <div className="text-3xl font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">Добавить виджет</div>
                  </div>
                </button>
              )}

              {extraWidgets.map((widget) => (
                <div
                  key={widget.id}
                  draggable={isEditing}
                  onDragStart={() => {
                    setDraggedExtraWidgetId(widget.id);
                    setDragOverExtraWidgetId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedExtraWidgetId(null);
                    setDragOverExtraWidgetId(null);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnter={() => {
                    if (draggedExtraWidgetId && draggedExtraWidgetId !== widget.id) {
                      setDragOverExtraWidgetId(widget.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverExtraWidgetId === widget.id) {
                      setDragOverExtraWidgetId(null);
                    }
                  }}
                  onDrop={() => {
                    if (draggedExtraWidgetId) moveExtraWidget(draggedExtraWidgetId, widget.id);
                    setDraggedExtraWidgetId(null);
                    setDragOverExtraWidgetId(null);
                  }}
                  className={`${widget.template === 'stability' ? 'md:col-span-3' : ''} bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/20 relative flex flex-col transition-all ${
                    draggedExtraWidgetId === widget.id ? 'opacity-80 ring-2 ring-emerald-300/40' : ''
                  } ${dragOverExtraWidgetId === widget.id ? 'ring-2 ring-emerald-400/50' : ''}`}
                >
                  {isEditing && (
                    <button
                      onClick={() => setExtraWidgets((prev) => prev.filter((w) => w.id !== widget.id))}
                      className="absolute top-4 right-16 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400 z-10"
                      title="Удалить виджет"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {isEditing && (
                    <button
                      type="button"
                      className="absolute top-4 right-4 h-9 w-9 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25 transition-all z-10 cursor-grab active:cursor-grabbing flex items-center justify-center"
                      title="Перетащить виджет"
                    >
                      <span className="sr-only">Перетащить виджет</span>
                      <span
                        className="pointer-events-none h-5 w-[10px] rounded-full"
                        style={{
                          backgroundImage: "radial-gradient(circle, rgba(226,232,240,0.78) 1.3px, transparent 1.4px)",
                          backgroundSize: "8px 10px",
                          backgroundPosition: "center center",
                        }}
                      />
                    </button>
                  )}
                  {widget.template === 'voc' ? (
                    <StandardVocWidgetCard
                      widget={{ ...widget.vocData, title: widget.title }}
                      isEditing={isEditing}
                      onWidgetChange={(patch) =>
                        setExtraWidgets((prev) =>
                          prev.map((w) =>
                            w.id === widget.id && w.template === 'voc'
                              ? { ...w, title: typeof patch.title === 'string' ? patch.title : w.title, vocData: { ...w.vocData, ...(patch as any) } }
                              : w,
                          ),
                        )
                      }
                      onRowChange={(rowId, patch) =>
                        setExtraWidgets((prev) =>
                          prev.map((w) =>
                            w.id === widget.id && w.template === 'voc'
                              ? {
                                  ...w,
                                  vocData: {
                                    ...w.vocData,
                                    items: w.vocData.items.map((item) => (item.id === rowId ? { ...item, ...patch } : item)),
                                  },
                                }
                              : w,
                          ),
                        )
                      }
                      onDeleteRow={(rowId) =>
                        setExtraWidgets((prev) =>
                          prev.map((w) =>
                            w.id === widget.id && w.template === 'voc'
                              ? { ...w, vocData: { ...w.vocData, items: w.vocData.items.filter((item) => item.id !== rowId) } }
                              : w,
                          ),
                        )
                      }
                      onAddRow={() =>
                        setExtraWidgets((prev) =>
                          prev.map((w) =>
                            w.id === widget.id && w.template === 'voc'
                              ? {
                                  ...w,
                                  vocData: {
                                    ...w.vocData,
                                    items: [...w.vocData.items, { id: `voc-item-${Date.now()}`, label: 'Название', value: 0, color: 'green' }],
                                  },
                                }
                              : w,
                          ),
                        )
                      }
                    />
                  ) : (
                    <StandardStabilityWidgetCard
                      title={widget.title}
                      metrics={widget.metrics}
                      isEditing={isEditing}
                      onTitleChange={(title) =>
                        setExtraWidgets((prev) => prev.map((w) => (w.id === widget.id && w.template === 'stability' ? { ...w, title } : w)))
                      }
                      onMetricChange={(metricId, patch) =>
                        setExtraWidgets((prev) =>
                          prev.map((w) =>
                            w.id === widget.id && w.template === 'stability'
                              ? { ...w, metrics: w.metrics.map((m) => (m.id === metricId ? { ...m, ...patch } : m)) }
                              : w,
                          ),
                        )
                      }
                      onAddMetric={() =>
                        setExtraWidgets((prev) =>
                          prev.map((w) =>
                            w.id === widget.id && w.template === 'stability'
                              ? {
                                  ...w,
                                  metrics: [
                                    ...w.metrics,
                                    { id: Date.now(), name: 'Новый показатель', weight: '0 %', fact: 0, plan: 0, type: '=', maxPercent: '∞', percent: '0 %' },
                                  ],
                                }
                              : w,
                          ),
                        )
                      }
                      onDeleteMetric={(metricId) =>
                        setExtraWidgets((prev) =>
                          prev.map((w) =>
                            w.id === widget.id && w.template === 'stability'
                              ? { ...w, metrics: w.metrics.filter((m) => m.id !== metricId) }
                              : w,
                          ),
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {isEditing && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setIsTrashModalOpen(true)}
                className="w-[360px] max-w-full rounded-[26px] border border-white/20 bg-white/[0.08] backdrop-blur-2xl px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_30px_rgba(0,0,0,0.42)] hover:bg-white/[0.12] transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold text-white">Корзина виджетов</div>
                    <div className="text-sm text-gray-300/90 mt-1">
                      Удаленных: {deletedWidgetList.length}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl border border-white/20 bg-black/20 text-red-300">
                    <Trash2 size={18} />
                  </div>
                </div>
              </button>
            </div>
          )}
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

      {enableTemplateAdd && isTemplateModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[1200px] rounded-3xl border border-white/10 bg-[#0c0c12] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Выберите шаблон виджета</h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="grid grid-cols-3 gap-6 min-w-[980px]">
                <button
                  onClick={() => addWidgetFromTemplate('voc')}
                  className="col-span-1 text-left rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all overflow-hidden"
                >
                  <StandardVocWidgetCard
                    widget={VOC_TEMPLATE_PREVIEW}
                    isEditing={false}
                    onWidgetChange={() => {}}
                    onRowChange={() => {}}
                    onDeleteRow={() => {}}
                    onAddRow={() => {}}
                  />
                </button>
                <button
                  onClick={() => addWidgetFromTemplate('stability')}
                  className="col-span-3 text-left rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all overflow-hidden"
                >
                  <StandardStabilityWidgetCard
                    title="СТАБИЛЬНОСТЬ/ПРОЕКТЫ"
                    metrics={STABILITY_TEMPLATE_PREVIEW}
                    isEditing={false}
                    onTitleChange={() => {}}
                    onMetricChange={() => {}}
                    onAddMetric={() => {}}
                    onDeleteMetric={() => {}}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isTrashModalOpen && (
        <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0c0c12] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Корзина виджетов</h3>
              <button
                onClick={() => setIsTrashModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
              >
                <X size={18} />
              </button>
            </div>

            {deletedWidgetList.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-gray-400">
                Корзина пустая
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {deletedWidgetList.map((widget) => (
                  <div
                    key={widget.key}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="text-white font-medium">{widget.title}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreWidget(widget.key)}
                        className="px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all text-sm flex items-center gap-2"
                      >
                        <RotateCcw size={14} />
                        Восстановить
                      </button>
                      <button
                        onClick={() => purgeWidget(widget.key)}
                        className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all text-sm"
                      >
                        Удалить окончательно
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  return <RedCapPage />;
}
