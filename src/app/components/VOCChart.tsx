import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, LabelList } from 'recharts';

interface VOCChartProps {
  data: {
    name: string;
    value: number;
    target: number;
  }[];
}

export function VOCChart({ data }: VOCChartProps) {
  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.target))) * 1.1;

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-6 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-white">VOC (канал)</h3>
        <div className="text-3xl font-bold text-white mt-2">НИБ 0.00</div>
        <div className="text-green-400 mt-1">4.76 <span className="text-gray-400 text-sm">/4.75-4.78</span></div>
      </div>
      
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.2)" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(147,51,234,0.3)' }}
          />
          <YAxis 
            domain={[4.6, maxValue]}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(147,51,234,0.3)' }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.value >= entry.target ? '#8B5CF6' : '#EF4444'} />
            ))}
            <LabelList 
              dataKey="value" 
              position="top" 
              fill="white"
              fontSize={12}
            />
          </Bar>
          <Bar dataKey="target" radius={[8, 8, 0, 0]} fill="transparent" stroke="#10B981" strokeWidth={2}>
            <LabelList 
              dataKey="target" 
              position="top" 
              fill="#10B981"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}