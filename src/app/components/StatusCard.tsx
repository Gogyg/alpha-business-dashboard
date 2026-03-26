interface StatusItem {
  label: string;
  value: string;
  color: 'green' | 'red';
  sublabel?: string;
}

interface StatusCardProps {
  title: string;
  items: StatusItem[];
}

export function StatusCard({ title, items }: StatusCardProps) {
  const getColorClass = (color: 'green' | 'red') => {
    return color === 'green' ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30';
  };

  const getTextColor = (color: 'green' | 'red') => {
    return color === 'green' ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {items.map((item, index) => (
          <div 
            key={index}
            className={`${getColorClass(item.color)} border rounded-2xl p-4`}
          >
            <div className="text-white/70 text-sm mb-1">{item.label}</div>
            <div className={`text-2xl font-bold ${getTextColor(item.color)}`}>
              {item.value}
            </div>
            {item.sublabel && (
              <div className="text-white/50 text-xs mt-1">{item.sublabel}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
