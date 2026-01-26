'use client';

import { AnalysisResult } from '@/types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LineStyle {
  color: string;
  thickness: number;
}

interface Props {
  result: AnalysisResult;
  chartType: 'line' | 'bar';
  lineStyles?: Record<string, LineStyle>;
}

export default function NormalChart({ result, chartType, lineStyles }: Props) {
  const { data, config } = result;

  // 获取所有数值列（排除时间戳）
  const numericColumns = Object.keys(data[0] || {}).filter(
    key => key !== 'timestamp' && typeof data[0][key] === 'number'
  );

  // 默认颜色方案
  const defaultColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  ];

  // 格式化时间戳用于 X 轴
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (config.timeDimension === 'minute') {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (config.timeDimension === 'hour') {
      return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit' });
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  // 准备图表数据
  const chartData = data.map(row => ({
    ...row,
    displayTime: formatTimestamp(row.timestamp as string),
  }));

  return (
    <div className="space-y-8">
      {numericColumns.map((column, index) => (
        <div key={column} className="border rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{column}</h3>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="displayTime"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => 
                    typeof value === 'number' ? value.toFixed(4) : value
                  }
                  labelFormatter={(label) => `时间: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={column}
                  stroke={lineStyles?.[column]?.color || defaultColors[index % defaultColors.length]}
                  name={column}
                  dot={false}
                  strokeWidth={lineStyles?.[column]?.thickness || 2}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="displayTime"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => 
                    typeof value === 'number' ? value.toFixed(4) : value
                  }
                  labelFormatter={(label) => `时间: ${label}`}
                />
                <Legend />
                <Bar
                  dataKey={column}
                  fill={lineStyles?.[column]?.color || defaultColors[index % defaultColors.length]}
                  name={column}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
