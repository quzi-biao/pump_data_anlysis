'use client';

import { useRef } from 'react';
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
  ReferenceArea,
} from 'recharts';
import { Download } from 'lucide-react';

interface LineStyle {
  color: string;
  thickness: number;
}

interface BackgroundZone {
  id: string;
  start: number;
  end: number;
  color: string;
  label: string;
}

interface Props {
  result: AnalysisResult;
  chartType: 'line' | 'bar';
  lineStyles?: Record<string, LineStyle>;
  backgroundZones?: BackgroundZone[];
  queryName?: string;
}

export default function NormalChart({ result, chartType, lineStyles, backgroundZones = [], queryName }: Props) {
  const { data, config } = result;
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // 导出单个图表为PNG
  const exportChartToPNG = async (column: string) => {
    const chartElement = chartRefs.current[column];
    if (!chartElement) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = queryName 
        ? `${queryName}_${column}_${timestamp}.png`
        : `${column}_${timestamp}.png`;
      
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('导出PNG失败:', error);
      alert('导出失败，请重试');
    }
  };

  return (
    <div className="space-y-8">
      {numericColumns.map((column, index) => (
        <div key={column} className="border rounded-lg p-4" ref={(el) => { chartRefs.current[column] = el; }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">{column}</h3>
            <button
              onClick={() => exportChartToPNG(column)}
              className="px-2 py-1 text-xs rounded flex items-center bg-green-600 text-white hover:bg-green-700"
            >
              <Download className="w-3 h-3 mr-1" />
              保存PNG
            </button>
          </div>
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
                {/* Background Zones */}
                {backgroundZones.map((zone) => (
                  <ReferenceArea
                    key={zone.id}
                    x1={chartData[zone.start]?.displayTime}
                    x2={chartData[zone.end]?.displayTime}
                    fill={zone.color}
                    fillOpacity={0.3}
                    label={{ value: zone.label, position: 'top', fontSize: 10 }}
                  />
                ))}
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
                {/* Background Zones */}
                {backgroundZones.map((zone) => (
                  <ReferenceArea
                    key={zone.id}
                    x1={chartData[zone.start]?.displayTime}
                    x2={chartData[zone.end]?.displayTime}
                    fill={zone.color}
                    fillOpacity={0.3}
                    label={{ value: zone.label, position: 'top', fontSize: 10 }}
                  />
                ))}
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
