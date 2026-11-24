import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StatusPieChartProps {
  present: number;
  absent: number;
  leave: number;
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({
  present,
  absent,
  leave,
}) => {
  const data = [
    { name: 'Present', value: present, color: '#10B981' },
    { name: 'Absent', value: absent, color: '#EF4444' },
    { name: 'Leave', value: leave, color: '#F59E0B' },
  ].filter((d) => d.value > 0);

  const total = present + absent + leave;

  return (
    <div className="h-64 w-full flex flex-col items-center justify-between py-1">
      <ResponsiveContainer width="100%" height="78%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={52}
            outerRadius={74}
            paddingAngle={3}
            stroke="none"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--chart-tooltip-bg)',
              borderRadius: '8px',
              border: '1px solid var(--chart-tooltip-border)',
              color: '#F8FAFC',
              fontSize: '12px',
            }}
            formatter={(value: unknown, name: unknown) => [
              `${value} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 text-xs text-secondary tabular-nums">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Present ({present})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Absent ({absent})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Leave ({leave})</span>
        </div>
      </div>
    </div>
  );
};
