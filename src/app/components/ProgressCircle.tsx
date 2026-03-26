interface ProgressCircleProps {
  value: number;
  label: string;
  target?: number;
  size?: 'sm' | 'md' | 'lg';
  showNA?: boolean;
  color?: 'green' | 'yellow' | 'red';
  onColorChange?: (color: 'green' | 'yellow' | 'red') => void;
  isEditing?: boolean;
}

export function ProgressCircle({ 
  value, 
  label, 
  target, 
  size = 'md',
  showNA = false,
  color,
  onColorChange,
  isEditing = false
}: ProgressCircleProps) {
  const sizes = {
    sm: { outer: 80, stroke: 8, text: 'text-lg' },
    md: { outer: 100, stroke: 10, text: 'text-2xl' },
    lg: { outer: 120, stroke: 12, text: 'text-3xl' }
  };
  
  const { outer, stroke, text } = sizes[size];
  const radius = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = showNA ? 0 : (value / 100) * circumference;
  
  const getColor = () => {
    if (color) {
      const colors = {
        green: '#22C55E',
        yellow: '#EAB308',
        red: '#EF4444'
      };
      return colors[color];
    }
    if (showNA) return '#6B7280';
    if (value >= 100) return '#22C55E';
    if (value >= 80) return '#EAB308';
    return '#EF4444';
  };

  const cycleColor = () => {
    if (!onColorChange || !color) return;
    const cycle = { green: 'yellow' as const, yellow: 'red' as const, red: 'green' as const };
    onColorChange(cycle[color]);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className={`relative ${isEditing && onColorChange ? 'cursor-pointer' : ''}`} 
        style={{ width: outer, height: outer }}
        onClick={isEditing && onColorChange ? cycleColor : undefined}
      >
        <svg width={outer} height={outer} className="transform -rotate-90">
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={stroke}
          />
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${text} font-bold text-white`}>
            {showNA ? 'NA' : `${value}%`}
          </span>
        </div>
      </div>
      <div className="text-sm text-white/70 text-center">
        {label}
        {target && !showNA && (
          <div className="text-xs text-white/50 mt-1">План ≥ {target}%</div>
        )}
      </div>
    </div>
  );
}