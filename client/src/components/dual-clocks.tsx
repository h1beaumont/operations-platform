import { useEffect, useState } from "react";

interface DualClocksProps {
  size?: 'default' | 'large' | 'small';
}

// Analogue clock component
function AnalogueClock({ date, size = 'default' }: { date: Date; size?: string }) {
  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // Calculate rotation angles
  const secondAngle = (seconds / 60) * 360;
  const minuteAngle = ((minutes + seconds / 60) / 60) * 360;
  const hourAngle = ((hours + minutes / 60) / 12) * 360;

  const clockSize = size === 'small' ? 56 : size === 'large' ? 96 : 72;
  const center = clockSize / 2;

  return (
    <svg width={clockSize} height={clockSize} viewBox={`0 0 ${clockSize} ${clockSize}`} className="drop-shadow-sm">
      {/* Clock face background */}
      <circle 
        cx={center} 
        cy={center} 
        r={center - 2} 
        fill="hsl(var(--card))" 
        stroke="hsl(var(--border))" 
        strokeWidth="2"
      />
      
      {/* Hour markers */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const innerRadius = center - 8;
        const outerRadius = center - 4;
        const x1 = center + innerRadius * Math.cos(angle);
        const y1 = center + innerRadius * Math.sin(angle);
        const x2 = center + outerRadius * Math.cos(angle);
        const y2 = center + outerRadius * Math.sin(angle);
        
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={i % 3 === 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            strokeWidth={i % 3 === 0 ? "2" : "1.5"}
            opacity={i % 3 === 0 ? "0.8" : "0.3"}
          />
        );
      })}

      {/* Center dot */}
      <circle cx={center} cy={center} r="3" fill="hsl(var(--primary))" />

      {/* Hour hand */}
      <line
        x1={center}
        y1={center}
        x2={center}
        y2={center - (center * 0.4)}
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} ${center} ${center})`}
        opacity="0.9"
      />

      {/* Minute hand */}
      <line
        x1={center}
        y1={center}
        x2={center}
        y2={center - (center * 0.6)}
        stroke="hsl(var(--foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle} ${center} ${center})`}
        opacity="0.8"
      />

      {/* Second hand */}
      <line
        x1={center}
        y1={center}
        x2={center}
        y2={center - (center * 0.65)}
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        transform={`rotate(${secondAngle} ${center} ${center})`}
        opacity="0.7"
      />
    </svg>
  );
}

export function DualClocks({ size = 'default' }: DualClocksProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeInZone = (timeZone: string) => {
    return new Date(currentTime.toLocaleString('en-US', { timeZone }));
  };

  const formatDigitalTime = (date: Date, timeZone: string) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
      timeZone 
    });
  };

  const formatDate = (date: Date) => {
    const day = parseInt(date.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'Europe/London' }));
    const monthName = date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' });
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Europe/London' });
    
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return `${dayName} ${day}${getOrdinalSuffix(day)} ${monthName}`;
  };

  const ukTime = getTimeInZone('Europe/London');
  const phTime = getTimeInZone('Asia/Manila');

  // Size-based styles
  const clockSize = size === 'small' ? 'small' : size === 'large' ? 'large' : 'default';
  const dateSize = size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm';
  const labelSize = size === 'small' ? 'text-[10px]' : size === 'large' ? 'text-sm' : 'text-xs';
  const timeSize = size === 'small' ? 'text-xs' : size === 'large' ? 'text-lg' : 'text-sm';

  return (
    <div className="flex flex-col items-center gap-3 w-full" data-testid="dual-clocks-container">
      {/* Compact date display */}
      <div className={`${dateSize} font-medium text-muted-foreground text-center`} data-testid="text-date">
        {formatDate(currentTime)}
      </div>

      {/* Side-by-side analogue clocks */}
      <div className="flex items-center justify-center gap-6" data-testid="dual-clocks">
        {/* UK Clock */}
        <div className="flex flex-col items-center gap-1.5" data-testid="clock-uk">
          <AnalogueClock date={ukTime} size={clockSize} />
          <div className="text-center">
            <div className={`${labelSize} font-semibold text-foreground`}>UK</div>
            <div className={`font-mono ${timeSize} text-muted-foreground`} data-testid="text-uk-time">
              {formatDigitalTime(currentTime, 'Europe/London')}
            </div>
          </div>
        </div>

        {/* Philippines Clock */}
        <div className="flex flex-col items-center gap-1.5" data-testid="clock-philippines">
          <AnalogueClock date={phTime} size={clockSize} />
          <div className="text-center">
            <div className={`${labelSize} font-semibold text-foreground`}>PH</div>
            <div className={`font-mono ${timeSize} text-muted-foreground`} data-testid="text-philippines-time">
              {formatDigitalTime(currentTime, 'Asia/Manila')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
