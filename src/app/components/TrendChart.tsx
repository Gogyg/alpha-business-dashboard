import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

interface TrendChartProps {
  title: string;
  targetLabel: string;
  data: {
    period: string;
    value: number;
    target?: number;
  }[];
}

export function TrendChart({ title, targetLabel, data }: TrendChartProps) {
  const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
  const minValue = Math.min(...data.map(d => d.value)) * 0.9;

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-6 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <div className="text-gray-400 text-sm mt-1">{targetLabel}</div>
      </div>
      
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.2)" />
          <XAxis 
            dataKey="period" 
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(147,51,234,0.3)' }}
          />
          <YAxis 
            domain={[minValue, maxValue]}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(147,51,234,0.3)' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#8B5CF6" 
            strokeWidth={3}
            fill="url(#colorValue)"
          />
          {data.some(d => d.target) && (
            <Line 
              type="monotone" 
              dataKey="target" 
              stroke="#10B981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}