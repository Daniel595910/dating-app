import React, { useMemo } from 'react';
import styles from './LineChart.module.css';

export interface LineChartDataPoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showAxis?: boolean;
  showArea?: boolean;
  formatValue?: (value: number) => string;
  formatDate?: (date: string) => string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  color = '#ef4444',
  height = 200,
  showGrid = true,
  showAxis = true,
  showArea = true,
  formatValue = (v) => v.toLocaleString(),
  formatDate = (d) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  },
}) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const padding = { top: 20, right: 20, bottom: showAxis ? 30 : 10, left: showAxis ? 40 : 10 };
    const width = 800;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map((d) => d.value);
    const maxValue = Math.max(...values, 1);
    const minValue = 0;
    const range = maxValue - minValue;

    const points = data.map((d, i) => {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight;
      return { x, y, value: d.value, date: d.date };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    // Y-axis labels (5 ticks)
    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const value = minValue + (range / 4) * i;
      const y = padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
      return { value: Math.round(value), y };
    });

    // X-axis labels (every ~5th point)
    const step = Math.max(1, Math.ceil(data.length / 6));
    const xTicks = points.filter((_, i) => i % step === 0 || i === points.length - 1);

    return {
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      points,
      pathD,
      areaD,
      yTicks,
      xTicks,
      maxValue,
    };
  }, [data, height, showAxis]);

  if (!chartData || data.length === 0) {
    return (
      <div className={styles.empty} style={{ height }}>
        <p>No data available</p>
      </div>
    );
  }

  const { width, padding, chartHeight, points, pathD, areaD, yTicks, xTicks } = chartData;

  return (
    <div className={styles.chartWrapper} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={styles.svg}
      >
        {/* Grid lines */}
        {showGrid &&
          yTicks.map((tick, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.5"
            />
          ))}

        {/* Area */}
        {showArea && (
          <defs>
            <linearGradient id={`area-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
        )}
        {showArea && <path d={areaD} fill={`url(#area-${color.replace('#', '')})`} />}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={color}
            stroke="var(--color-bg-elevated)"
            strokeWidth="2"
            className={styles.point}
          >
            <title>{`${formatDate(p.date)}: ${formatValue(p.value)}`}</title>
          </circle>
        ))}

        {/* Y-axis labels */}
        {showAxis &&
          yTicks.map((tick, i) => (
            <text
              key={i}
              x={padding.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              className={styles.axisLabel}
            >
              {formatValue(tick.value)}
            </text>
          ))}

        {/* X-axis labels */}
        {showAxis &&
          xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
              y={height - 8}
              textAnchor="middle"
              className={styles.axisLabel}
            >
              {formatDate(tick.date)}
            </text>
          ))}
      </svg>
    </div>
  );
};
