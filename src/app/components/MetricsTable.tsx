interface Metric {
  id: number;
  name: string;
  weight: string;
  fact: string | number;
  plan: string | number;
  percent: string;
  isNew?: boolean;
  hasAlert?: boolean;
  runrate?: string;
}

interface MetricsTableProps {
  title: string;
  metrics: Metric[];
  isEditing?: boolean;
  onEdit?: (id: number, field: string, value: string) => void;
}

export function MetricsTable({ title, metrics, isEditing, onEdit }: MetricsTableProps) {
  const getPercentColor = (percent: string) => {
    const value = parseFloat(percent);
    if (value >= 100) return 'text-green-400';
    if (value >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return value.toLocaleString('ru-RU');
    }
    return value;
  };

  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
      {title && <h3 className="text-xl font-bold text-white mb-4">{title}</h3>}
      
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left text-gray-500 text-sm pb-3 w-12">№</th>
            <th className="text-left text-gray-500 text-sm pb-3">Показатель</th>
            <th className="text-left text-gray-500 text-sm pb-3 w-24">Вес</th>
            <th className="text-left text-gray-500 text-sm pb-3 w-32">Факт</th>
            <th className="text-left text-gray-500 text-sm pb-3 w-32">План</th>
            <th className="text-left text-gray-500 text-sm pb-3 w-24">%</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.id} className="border-b border-gray-800 last:border-0">
              <td className="py-4 text-white">{metric.id}</td>
              <td className="py-4 text-white">
                {metric.name}{' '}
                {metric.isNew && <span className="text-green-400 text-xs ml-2 font-semibold">NEW</span>}
                {metric.hasAlert && <span className="text-red-400 text-xs ml-2">!!!</span>}
                {metric.runrate && (
                  <div className="text-xs text-gray-500 mt-1">Runrate: {metric.runrate}</div>
                )}
              </td>
              <td className="py-4 text-gray-400">{metric.weight}</td>
              <td className="py-4">
                {isEditing ? (
                  <input
                    type="text"
                    value={metric.fact}
                    onChange={(e) => onEdit?.(metric.id, 'fact', e.target.value)}
                    className="bg-[#0a0a0a] border border-gray-700 rounded px-3 py-1.5 text-white w-full"
                  />
                ) : (
                  <span className={getPercentColor(metric.percent)}>{formatValue(metric.fact)}</span>
                )}
              </td>
              <td className="py-4">
                {isEditing ? (
                  <input
                    type="text"
                    value={metric.plan}
                    onChange={(e) => onEdit?.(metric.id, 'plan', e.target.value)}
                    className="bg-[#0a0a0a] border border-gray-700 rounded px-3 py-1.5 text-white w-full"
                  />
                ) : (
                  <span className="text-gray-400">{formatValue(metric.plan)}</span>
                )}
              </td>
              <td className={`py-4 font-semibold ${getPercentColor(metric.percent)}`}>
                {metric.percent}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}