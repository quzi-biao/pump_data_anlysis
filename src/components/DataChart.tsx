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
import { useState } from 'react';

interface Props {
  result: AnalysisResult;
}

export default function DataChart({ result }: Props) {
  const { data, config } = result;
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无数据
      </div>
    );
  }

  // 获取所有数值列（排除时间戳和对比组）
  const numericColumns = Object.keys(data[0]).filter(
    key => key !== 'timestamp' && key !== 'comparisonGroup' && typeof data[0][key] === 'number'
  );

  // 颜色方案
  const colors = [
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

  // 格式化完整时间戳用于 Tooltip
  const formatFullTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (config.timeDimension === 'day') {
      return date.toLocaleDateString('zh-CN');
    } else {
      return date.toLocaleString('zh-CN');
    }
  };

  // 准备图表数据
  const chartData = data.map(row => ({
    ...row,
    displayTime: formatTimestamp(row.timestamp as string),
  }));

  // 如果有对比组，按组分组数据
  const hasComparisonGroup = 'comparisonGroup' in data[0];
  const comparisonGroups = hasComparisonGroup
    ? Array.from(new Set(data.map(row => (row as any).comparisonGroup)))
    : [];

  return (
    <div className="space-y-6">
      {/* Chart Type Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-4 py-2 rounded-lg ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            折线图
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-4 py-2 rounded-lg ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            柱状图
          </button>
        </div>

        <div className="text-sm text-gray-500">
          共 {numericColumns.length} 个指标
        </div>
      </div>

      {/* Charts */}
      {hasComparisonGroup ? (
        // 对比模式：每个指标一个图表，包含所有对比组
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
                    />
                    <Legend />
                    {comparisonGroups.map((group, groupIndex) => {
                      const groupData = chartData.filter(
                        row => (row as any).comparisonGroup === group
                      );
                      return (
                        <Line
                          key={group}
                          data={groupData}
                          type="monotone"
                          dataKey={column}
                          stroke={colors[groupIndex % colors.length]}
                          name={`${group}`}
                          dot={false}
                          strokeWidth={2}
                        />
                      );
                    })}
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
                    />
                    <Legend />
                    {comparisonGroups.map((group, groupIndex) => {
                      return (
                        <Bar
                          key={group}
                          dataKey={column}
                          fill={colors[groupIndex % colors.length]}
                          name={`${group}`}
                        />
                      );
                    })}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      ) : (
        // 普通模式：每个指标一个独立图表
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
                      stroke={colors[index % colors.length]}
                      name={column}
                      dot={false}
                      strokeWidth={2}
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
                      fill={colors[index % colors.length]}
                      name={column}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* Indicator List */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">指标列表</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {numericColumns.map((column, index) => (
            <div key={column} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-700">{column}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
