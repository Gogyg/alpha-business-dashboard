import type { Widget } from "../../types_new/widget";
import { Plus, Trash2, X, GripVertical, Settings } from "lucide-react";
import { Button } from "../ui/button";

interface WidgetContentProps {
  widget: Widget;
  allWidgets?: Widget[];
  isEditing?: boolean;
  onUpdate?: (data: any) => void;
}

export function WidgetContent({ widget, allWidgets = [], isEditing = false, onUpdate }: WidgetContentProps) {
  switch (widget.type) {
    case "table-widget":
      return <TableWidget data={widget.data} isEditing={isEditing} onUpdate={onUpdate} />;
    case "metric-simple":
      return <MetricSimpleWidget data={widget.data} isEditing={isEditing} onUpdate={onUpdate} />;
    case "redcap-summary":
      return <RedcapSummaryWidget data={widget.data} allWidgets={allWidgets} />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-gray-500 italic">
          Контент этого типа виджета находится в разработке
        </div>
      );
  }
}

function TableWidget({ data, isEditing, onUpdate }: { data: any, isEditing: boolean, onUpdate?: (data: any) => void }) {
  const metrics = data.metrics || [];

  const normalizeMetric = (metric: any) => ({
    ...metric,
    name: typeof metric.name === "string" ? metric.name : "",
    type: metric.type || "=",
    maxPercent: metric.maxPercent || "∞",
    percent: metric.percent || "0 %",
  });

  const parseMaxPercent = (value?: string) => {
    if (!value || value === "∞") return Infinity;
    const numeric = parseFloat(String(value).replace(",", "."));
    return Number.isFinite(numeric) ? numeric : Infinity;
  };

  const formatPercent = (value: number) => `${value.toFixed(1).replace(".", ",")} %`;

  const calculateMetricPercent = (metric: any) => {
    const fact = parseFloat(String(metric.fact)) || 0;
    const plan = parseFloat(String(metric.plan)) || 0;
    if (plan <= 0 && fact <= 0) return 0;
    if (plan <= 0) return 0;

    let rawPercent = 0;
    if (metric.type === "<=" || metric.type === "<") {
      rawPercent = fact > 0 ? (plan / fact) * 100 : 100;
    } else {
      rawPercent = (fact / plan) * 100;
    }

    return Math.max(0, Math.min(rawPercent, parseMaxPercent(metric.maxPercent)));
  };

  const handleEdit = (id: number, field: string, value: any) => {
    if (!onUpdate) return;
    const newMetrics = metrics.map((m: any) => {
      if (m.id === id) {
        const updated = normalizeMetric({ ...m, [field]: value });
        if (field === 'fact' || field === 'plan' || field === 'type' || field === 'maxPercent') {
          updated.percent = formatPercent(calculateMetricPercent(updated));
        }
        return updated;
      }
      return m;
    });
    onUpdate({ ...data, metrics: newMetrics });
  };

  const addRow = () => {
    if (!onUpdate) return;
    const newMetrics = [...metrics, {
      id: Date.now(),
      name: '',
      weight: '0 %',
      fact: 0,
      plan: 0,
      type: '=',
      maxPercent: '∞',
      percent: '0 %'
    }];
    onUpdate({ ...data, metrics: newMetrics });
  };

  const deleteRow = (id: number) => {
    if (!onUpdate) return;
    onUpdate({ ...data, metrics: metrics.filter((m: any) => m.id !== id) });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/10">
            <th className="pb-3 text-gray-500 text-xs uppercase font-medium">Показатель</th>
            <th className="pb-3 text-gray-500 text-xs uppercase font-medium w-20">Вес</th>
            <th className="pb-3 text-gray-500 text-xs uppercase font-medium w-24">Факт</th>
            <th className="pb-3 text-gray-500 text-xs uppercase font-medium w-24">План</th>
            <th className="pb-3 text-gray-500 text-xs uppercase font-medium w-20">%</th>
            {isEditing && <th className="pb-3 text-gray-500 text-xs uppercase font-medium w-20">Тип</th>}
            {isEditing && <th className="pb-3 text-gray-500 text-xs uppercase font-medium w-24">Макс%</th>}
            {isEditing && <th className="w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m: any) => {
            const normalized = normalizeMetric(m);
            const percentValue = calculateMetricPercent(normalized);
            const percentColor = percentValue >= 100 ? 'text-green-400' : percentValue >= 80 ? 'text-yellow-400' : 'text-red-400';
            
            return (
              <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="py-3 pr-2">
                  {isEditing ? (
                    <textarea value={normalized.name} onChange={(e) => handleEdit(m.id, 'name', e.target.value)} 
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white resize-none" rows={2}/>
                  ) : (
                    <span className={`text-sm font-medium ${normalized.name ? 'text-white' : 'text-gray-500 italic'}`}>
                      {normalized.name || 'Цель не заполнена'}
                    </span>
                  )}
                </td>
                <td className="py-3">
                   {isEditing ? (
                    <input type="text" value={normalized.weight} onChange={(e) => handleEdit(m.id, 'weight', e.target.value)} 
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-gray-400" />
                  ) : (
                    <span className="text-gray-400 text-sm">{normalized.weight}</span>
                  )}
                </td>
                <td className="py-3">
                   {isEditing ? (
                    <input type="number" value={normalized.fact} onChange={(e) => handleEdit(m.id, 'fact', e.target.value)} 
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                  ) : (
                    <span className={`text-sm font-bold ${percentColor}`}>{normalized.fact.toLocaleString()}</span>
                  )}
                </td>
                <td className="py-3">
                   {isEditing ? (
                    <input type="number" value={normalized.plan} onChange={(e) => handleEdit(m.id, 'plan', e.target.value)} 
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                  ) : (
                    <span className="text-gray-400 text-sm">{normalized.type} {normalized.plan.toLocaleString()}</span>
                  )}
                </td>
                <td className={`py-3 text-sm font-bold ${percentColor}`}>{formatPercent(percentValue)}</td>
                {isEditing && (
                  <td className="py-3">
                    <select
                      value={normalized.type}
                      onChange={(e) => handleEdit(m.id, 'type', e.target.value)}
                      className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1 text-sm text-emerald-300"
                    >
                      <option value="=">=</option>
                      <option value=">">{">"}</option>
                      <option value=">=">{">="}</option>
                      <option value="<">{"<"}</option>
                      <option value="<=">{"<="}</option>
                    </select>
                  </td>
                )}
                {isEditing && (
                  <td className="py-3">
                    <input
                      type="text"
                      value={normalized.maxPercent}
                      onChange={(e) => handleEdit(m.id, 'maxPercent', e.target.value)}
                      className="w-full bg-black/40 border border-amber-500/30 rounded px-2 py-1 text-sm text-amber-300"
                    />
                  </td>
                )}
                {isEditing && (
                  <td className="py-3">
                    <button onClick={() => deleteRow(m.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
          {isEditing && (
            <tr>
              <td colSpan={8} className="pt-4 text-center">
                <Button variant="ghost" size="sm" onClick={addRow} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                  <Plus size={14} className="mr-1" /> Добавить строку
                </Button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MetricSimpleWidget({ data, isEditing, onUpdate }: { data: any, isEditing: boolean, onUpdate?: (data: any) => void }) {
  const percentValue = data.value || 0;
  const percentColor = percentValue >= (data.plan || 0) ? 'text-green-400' : 'text-red-400';

  return (
    <div className="flex flex-col items-start justify-center h-full">
      {isEditing ? (
        <div className="space-y-4 w-full">
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Факт (%)</label>
            <input type="number" value={data.value} onChange={(e) => onUpdate?.({...data, value: parseFloat(e.target.value)})} 
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-2xl font-bold text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">План (%)</label>
            <input type="number" value={data.plan} onChange={(e) => onUpdate?.({...data, plan: parseFloat(e.target.value)})} 
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white" />
          </div>
        </div>
      ) : (
        <>
          <div className={`text-6xl font-black ${percentColor} mb-2 tracking-tighter`}>
            {data.value}%
          </div>
          {data.subtitle && (
            <div className="mb-3 text-sm text-gray-500">
              {data.subtitle}
            </div>
          )}
          <div className="text-sm text-gray-500 font-medium bg-white/5 px-3 py-1 rounded-full border border-white/10">
            ПЛАН {data.plan}%
          </div>
        </>
      )}
    </div>
  );
}

function RedcapSummaryWidget({ data, allWidgets }: { data: any; allWidgets: Widget[] }) {
  const weights = data?.weights || {
    scoreCard: 30,
    stability: 20,
    production: 20,
    voc: 20,
    personnel: 10,
  };

  const getTableScore = (title: string) => {
    const widget = allWidgets.find((item) => item.type === "table-widget" && item.title === title);
    const metrics = widget?.data?.metrics || [];
    if (!metrics.length) return "0";

    let totalWeight = 0;
    let totalScore = 0;
    metrics.forEach((metric: any) => {
      const weight = parseFloat(String(metric.weight).replace(",", ".")) / 100 || 0;
      const fact = parseFloat(String(metric.fact)) || 0;
      const plan = parseFloat(String(metric.plan)) || 0;
      const type = metric.type || "=";
      const maxPercent = metric.maxPercent || "∞";

      let rawPercent = 0;
      if (plan > 0) {
        rawPercent = type === "<=" || type === "<" ? (fact > 0 ? (plan / fact) * 100 : 100) : (fact / plan) * 100;
      }

      const maxValue = maxPercent === "∞" ? Infinity : parseFloat(String(maxPercent).replace(",", "."));
      const finalPercent = Math.max(0, Math.min(rawPercent, Number.isFinite(maxValue) ? maxValue : Infinity));

      totalWeight += weight;
      totalScore += weight * (finalPercent / 100);
    });

    return totalWeight > 0 ? (totalScore / totalWeight * 100).toFixed(0) : "0";
  };

  const getSimpleMetricValue = (title: string) => {
    const widget = allWidgets.find((item) => item.type === "metric-simple" && item.title === title);
    const fact = parseFloat(String(widget?.data?.value ?? 0)) || 0;
    const plan = parseFloat(String(widget?.data?.plan ?? 0)) || 0;
    if (plan <= 0) return "0";
    return (fact >= plan ? 100 : 0).toFixed(0);
  };

  const scoreCardValue = getTableScore("SCORE-КАРТА");
  const stabilityValue = getTableScore("СТАБИЛЬНОСТЬ/ПРОЕКТЫ");
  const productionValue = getTableScore("ПРОИЗВОДСТВО");
  const vocValue = getSimpleMetricValue("VOC");
  const personnelValue = "100";

  const totalValue = Math.round(
    parseInt(scoreCardValue, 10) * (weights.scoreCard / 100) +
    parseInt(stabilityValue, 10) * (weights.stability / 100) +
    parseInt(productionValue, 10) * (weights.production / 100) +
    parseInt(vocValue, 10) * (weights.voc / 100) +
    parseInt(personnelValue, 10) * (weights.personnel / 100)
  );

  const items = [
    { title: "SCORE-КАРТА", value: scoreCardValue, weight: weights.scoreCard },
    { title: "СТАБИЛЬНОСТЬ/\nПРОЕКТЫ", value: stabilityValue, weight: weights.stability },
    { title: "ПРОИЗВОДСТВО", value: productionValue, weight: weights.production },
    { title: "VOC", value: vocValue, weight: weights.voc },
    { title: "ПЕРСОНАЛИИ", value: personnelValue, weight: weights.personnel },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-6 md:items-end">
      {items.map((item) => (
        <div key={item.title} className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500 whitespace-pre-line">
            {item.title}
          </div>
          <div className="text-5xl font-black tracking-tighter text-emerald-400">
            {item.value}%
          </div>
          <div className="text-sm text-gray-500">Вес {item.weight}%</div>
        </div>
      ))}
      <div className="space-y-3 border-l border-white/10 pl-6 md:col-span-1">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
          ИТОГО КРАСНАЯ ШАПОЧКА
        </div>
        <div className="bg-gradient-to-r from-[#34d399] to-[#3b82f6] bg-clip-text text-6xl font-black tracking-tighter text-transparent">
          {totalValue}%
        </div>
      </div>
    </div>
  );
}
