import { Plus, Trash2 } from "lucide-react";

export type StatusColor = "green" | "yellow" | "red";
export type MetricType = "=" | ">=" | "<=" | ">" | "<";

export interface StandardVocItem {
  id: string;
  label: string;
  value: number;
  color?: StatusColor;
}

export interface StandardVocWidget {
  title: string;
  nib: number;
  nibColor?: StatusColor;
  range: string;
  items: StandardVocItem[];
}

export interface StandardStabilityMetric {
  id: string | number;
  name: string;
  weight: string;
  fact: number;
  plan: number;
  type: MetricType;
  maxPercent: string;
  factColor?: StatusColor;
  percentColor?: StatusColor;
  runrate?: string;
  hasAlert?: boolean;
}

const parseMaxPercent = (value: string) => {
  if (!value || value === "∞") return Infinity;
  const numeric = parseFloat(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : Infinity;
};

const calculateMetricPercent = (metric: StandardStabilityMetric) => {
  const fact = Number(metric.fact) || 0;
  const plan = Number(metric.plan) || 0;
  if (plan <= 0 && fact <= 0) return 0;
  if (plan <= 0) return 0;

  let rawPercent = 0;
  if (metric.type === "<=" || metric.type === "<") {
    rawPercent = fact > 0 ? (plan / fact) * 100 : 100;
  } else {
    rawPercent = (fact / plan) * 100;
  }
  const cappedPercent = Math.min(rawPercent, parseMaxPercent(metric.maxPercent));
  return Number.isFinite(cappedPercent) ? Math.max(cappedPercent, 0) : 0;
};

const formatPercent = (value: number) => `${value.toFixed(1).replace(".", ",")} %`;
const formatMetricNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("ru-RU");
};
const cycleStatusColor = (color?: StatusColor) => {
  if (!color) return "green";
  if (color === "green") return "yellow";
  if (color === "yellow") return "red";
  return undefined;
};
const statusTextColorClass = (color?: StatusColor) => {
  if (color === "green") return "text-green-400";
  if (color === "yellow") return "text-yellow-400";
  if (color === "red") return "text-red-400";
  return "";
};
const statusDotClass = (color?: StatusColor) => {
  if (color === "green") return "bg-green-400/80 border-green-400";
  if (color === "yellow") return "bg-yellow-400/80 border-yellow-400";
  if (color === "red") return "bg-red-400/80 border-red-400";
  return "bg-white/10 border-white/20";
};

export function StandardVocWidgetCard({
  widget,
  isEditing,
  onWidgetChange,
  onRowChange,
  onDeleteRow,
  onAddRow,
}: {
  widget: StandardVocWidget;
  isEditing: boolean;
  onWidgetChange: (patch: Partial<StandardVocWidget>) => void;
  onRowChange: (rowId: string, patch: Partial<StandardVocItem>) => void;
  onDeleteRow: (rowId: string) => void;
  onAddRow: () => void;
}) {
  return (
    <div className="p-6 relative flex flex-col">
      {isEditing ? (
        <input
          value={widget.title}
          onChange={(e) => onWidgetChange({ title: e.target.value })}
          className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-xl font-bold text-white mb-4 pr-20"
        />
      ) : (
        <h3 className="text-xl font-bold text-white mb-4">{widget.title}</h3>
      )}

      <div className="mb-6 flex flex-col items-start">
        {isEditing ? (
          <div className="flex items-center gap-2 w-full">
            <input
              type="number"
              step="0.01"
              value={widget.nib}
              onChange={(e) => onWidgetChange({ nib: parseFloat(e.target.value) || 0 })}
              className={`w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-4xl font-bold ${statusTextColorClass(widget.nibColor)}`}
            />
            <button
              type="button"
              onClick={() => onWidgetChange({ nibColor: cycleStatusColor(widget.nibColor) as StatusColor })}
              className={`h-4 w-4 rounded-full border ${statusDotClass(widget.nibColor)} transition-colors`}
              title="Цвет значения НИБ"
            />
          </div>
        ) : (
          <div className={`text-4xl font-bold mb-2 ${statusTextColorClass(widget.nibColor)}`}>{widget.nib}</div>
        )}
        <div className="text-sm text-gray-500 mt-2">
          {isEditing ? (
            <input
              value={widget.range}
              onChange={(e) => onWidgetChange({ range: e.target.value })}
              className="w-32 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm"
            />
          ) : (
            `План ${widget.range}`
          )}
        </div>
      </div>

      <div className="space-y-3">
        {widget.items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            {isEditing ? (
              <input
                value={item.label}
                onChange={(e) => onRowChange(item.id, { label: e.target.value })}
                className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-sm text-gray-300"
              />
            ) : (
              <div className="text-sm text-gray-500">{item.label}</div>
            )}

            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={item.value}
                  onChange={(e) => onRowChange(item.id, { value: parseFloat(e.target.value) || 0 })}
                  className={`w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-sm font-bold ${statusTextColorClass(item.color)}`}
                />
                <button
                  type="button"
                  onClick={() => onRowChange(item.id, { color: cycleStatusColor(item.color) as StatusColor })}
                  className={`h-4 w-4 rounded-full border ${statusDotClass(item.color)} transition-colors`}
                  title="Цвет значения"
                />
              </div>
            ) : (
              <div className={`text-lg font-bold ${statusTextColorClass(item.color)}`}>{item.value}</div>
            )}

            {isEditing && (
              <button
                onClick={() => onDeleteRow(item.id)}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-red-400"
                title="Удалить строку"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onAddRow}
            disabled={widget.items.length >= 5}
            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl transition-all border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            title={widget.items.length >= 5 ? "Максимум 5 строк" : "Добавить строку"}
          >
            <Plus size={16} className="text-emerald-400" />
          </button>
        </div>
      )}
    </div>
  );
}

export function StandardStabilityWidgetCard({
  title,
  metrics,
  isEditing,
  onTitleChange,
  onMetricChange,
  onAddMetric,
  onDeleteMetric,
}: {
  title: string;
  metrics: StandardStabilityMetric[];
  isEditing: boolean;
  onTitleChange: (title: string) => void;
  onMetricChange: (metricId: string | number, patch: Partial<StandardStabilityMetric>) => void;
  onAddMetric: () => void;
  onDeleteMetric: (metricId: string | number) => void;
}) {
  return (
    <div className="p-6 relative flex flex-col">
      {isEditing ? (
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-xl font-bold text-white mb-6 pr-20"
        />
      ) : (
        <h3 className="text-xl font-bold text-white mb-6">{title}</h3>
      )}

      <div className="overflow-x-auto">
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
              {isEditing && <th className="w-12" />}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, index) => {
              const percentValue = calculateMetricPercent(metric);
              const percentColor = percentValue >= 100 ? "text-green-400" : percentValue >= 80 ? "text-yellow-400" : "text-red-400";
              return (
                <tr key={metric.id} className="border-b border-gray-800/30 last:border-0">
                  <td className="py-4 text-white align-top">{index + 1}</td>
                  <td className="py-4 pr-4 align-top">
                    {isEditing ? (
                      <textarea
                        value={metric.name}
                        onChange={(e) => onMetricChange(metric.id, { name: e.target.value })}
                        className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white resize-none"
                        rows={2}
                      />
                    ) : (
                      <span className="text-white">
                        {metric.name} {metric.hasAlert && <span className="text-red-400 text-xs ml-2">!!!</span>}
                      </span>
                    )}
                    {!isEditing && metric.runrate && <div className="text-xs text-gray-500 mt-1">Runrate: {metric.runrate}</div>}
                  </td>
                  <td className="py-4 align-top">
                    {isEditing ? (
                      <input
                        value={metric.weight}
                        onChange={(e) => onMetricChange(metric.id, { weight: e.target.value })}
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
                          onChange={(e) => onMetricChange(metric.id, { fact: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white"
                        />
                        <button
                          type="button"
                          onClick={() => onMetricChange(metric.id, { factColor: cycleStatusColor(metric.factColor) })}
                          className={`h-4 w-4 rounded-full border ${statusDotClass(metric.factColor)} transition-colors`}
                          title="Цвет факта"
                        />
                      </div>
                    ) : (
                      <span className={metric.factColor ? statusTextColorClass(metric.factColor) : percentColor}>{formatMetricNumber(metric.fact)}</span>
                    )}
                  </td>
                  {isEditing && (
                    <td className="py-4 align-top">
                      <select
                        value={metric.type}
                        onChange={(e) => onMetricChange(metric.id, { type: e.target.value as MetricType })}
                        className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1.5 text-emerald-300"
                      >
                        <option value="=">=</option>
                        <option value=">">{">"}</option>
                        <option value=">=">{">="}</option>
                        <option value="<">{"<"}</option>
                        <option value="<=">{"<="}</option>
                      </select>
                    </td>
                  )}
                  <td className="py-4 align-top">
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={metric.plan}
                        onChange={(e) => onMetricChange(metric.id, { plan: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white"
                      />
                    ) : (
                      <span className="text-gray-400">{`${metric.type} ${formatMetricNumber(metric.plan)}`}</span>
                    )}
                  </td>
                  <td className="py-4 align-top">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${metric.percentColor ? statusTextColorClass(metric.percentColor) : percentColor}`}>
                        {formatPercent(percentValue)}
                      </span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => onMetricChange(metric.id, { percentColor: cycleStatusColor(metric.percentColor) })}
                          className={`h-4 w-4 rounded-full border ${statusDotClass(metric.percentColor)} transition-colors`}
                          title="Цвет процента"
                        />
                      )}
                    </div>
                  </td>
                  {isEditing && (
                    <td className="py-4 align-top">
                      <input
                        value={metric.maxPercent}
                        onChange={(e) => onMetricChange(metric.id, { maxPercent: e.target.value })}
                        className="w-full bg-[#0a0a0a]/50 border border-amber-500/30 rounded px-3 py-1.5 text-amber-300"
                      />
                    </td>
                  )}
                  {isEditing && (
                    <td className="py-4 align-top">
                      <button
                        onClick={() => onDeleteMetric(metric.id)}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="mt-4 flex justify-end">
          <button onClick={onAddMetric} className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl transition-all border border-emerald-500/30">
            <Plus size={16} className="text-emerald-400" />
          </button>
        </div>
      )}
    </div>
  );
}
