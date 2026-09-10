import React from 'react';
import styles from './BarChart.module.css';

export interface BarChartDataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  color = '#ef4444',
  height = 200,
  formatValue = (v) => v.toLocaleString(),
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={styles.chart} style={{ height }}>
      {data.length === 0 ? (
        <div className={styles.empty}>
          <p>No data available</p>
        </div>
      ) : (
        <div className={styles.bars}>
          {data.map((item, i) => {
            const percent = (item.value / maxValue) * 100;
            return (
              <div key={i} className={styles.barRow}>
                <span className={styles.barLabel}>{item.label}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${Math.max(percent, 2)}%`,
                      background: color,
                    }}
                  />
                </div>
                <span className={styles.barValue}>{formatValue(item.value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
