import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DepartmentBarChartProps {
  data: {
    departmentName: string;
    code: string;
    attendance: number | null;
    students: number;
  }[];
}

export const DepartmentBarChart: React.FC<DepartmentBarChartProps> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--chart-grid)"
          />
          <XAxis
            dataKey="code"
            tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
            contentStyle={{
              backgroundColor: 'var(--chart-tooltip-bg)',
              borderRadius: '8px',
              border: '1px solid var(--chart-tooltip-border)',
              color: '#F8FAFC',
              fontSize: '12px',
            }}
            formatter={(value: unknown, name: unknown) => {
              if (name === 'attendance') return [`${value}%`, 'Avg Attendance'];
              return [String(value), String(name)];
            }}
            labelFormatter={(label) => {
              const dept = data.find((d) => d.code === label);
              return dept ? dept.departmentName : label;
            }}
          />
          <Bar
            dataKey="attendance"
            fill="#3939E7"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
