import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AttendanceTrendChartProps {
  data: {
    date: string;
    displayDate: string;
    percentage: number | null;
    present: number;
    absent: number;
    leave: number;
  }[];
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({
  data,
}) => {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--chart-grid)"
          />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--chart-tooltip-bg)',
              borderRadius: '6px',
              border: '1px solid var(--chart-tooltip-border)',
              color: '#FFFFFF',
              fontSize: '12px',
            }}
            formatter={(value: unknown, name: unknown) => {
              if (name === 'percentage') return [`${value}%`, 'Turnout'];
              return [String(value), String(name)];
            }}
          />
          <Line
            type="monotone"
            dataKey="percentage"
            stroke="#3939E7"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3939E7', strokeWidth: 0 }}
            activeDot={{ r: 4, fill: '#2828D6' }}
            name="percentage"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
