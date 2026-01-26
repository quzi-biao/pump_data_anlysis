'use client';

import { useState } from 'react';
import { AnalysisResult } from '@/types';
import ComparisonChart from './ComparisonChart';
import NormalChart from './NormalChart';
import { Settings } from 'lucide-react';

interface Props {
  result: AnalysisResult;
}

interface LineStyle {
  color: string;
  thickness: number;
}

interface GroupStyle {
  color: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

export default function DataChart({ result }: Props) {
  const { data } = result;
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [showSettings, setShowSettings] = useState(false);

  // 检查是否有对比组
  const hasComparisonGroup = 'comparisonGroup' in (data[0] || {});

  // 获取所有数值列（排除时间戳和对比组）
  const numericColumns = Object.keys(data[0]).filter(
    key => key !== 'timestamp' && key !== 'comparisonGroup' && typeof data[0][key] === 'number'
  );

  // 获取对比组列表
  const comparisonGroups = hasComparisonGroup 
    ? Array.from(new Set(data.map(row => (row as any).comparisonGroup)))
    : [];

  // 初始化线条样式（用于非对比模式）
  const [lineStyles, setLineStyles] = useState<Record<string, LineStyle>>(() => {
    const styles: Record<string, LineStyle> = {};
    numericColumns.forEach((col, index) => {
      styles[col] = {
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        thickness: 2
      };
    });
    return styles;
  });

  // 初始化对比组样式（用于对比模式）
  const [groupStyles, setGroupStyles] = useState<Record<string, Record<string, GroupStyle>>>(() => {
    const styles: Record<string, Record<string, GroupStyle>> = {};
    numericColumns.forEach((col) => {
      styles[col] = {};
      comparisonGroups.forEach((group, index) => {
        styles[col][group as string] = {
          color: DEFAULT_COLORS[index % DEFAULT_COLORS.length]
        };
      });
    });
    return styles;
  });

  const updateLineStyle = (column: string, updates: Partial<LineStyle>) => {
    setLineStyles(prev => ({
      ...prev,
      [column]: { ...prev[column], ...updates }
    }));
  };

  const updateGroupStyle = (column: string, group: string, color: string) => {
    setGroupStyles(prev => ({
      ...prev,
      [column]: {
        ...prev[column],
        [group]: { color }
      }
    }));
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无数据
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Type Toggle and Settings */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 text-xs rounded ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            折线图
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 text-xs rounded ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            柱状图
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-1.5 text-xs rounded flex items-center ${
              showSettings
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings className="w-3 h-3 mr-1" />
            样式设置
          </button>
        </div>

        <div className="text-xs text-gray-500">
          共 {numericColumns.length} 个指标
        </div>
      </div>

      {/* Style Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 border rounded p-3">
          <h4 className="text-xs font-medium text-gray-700 mb-2">
            {hasComparisonGroup ? '对比组样式设置' : '曲线样式设置'}
          </h4>
          
          {hasComparisonGroup ? (
            // 对比模式：显示每个指标的每个对比组的颜色设置
            <div className="space-y-3">
              {numericColumns.map((column) => (
                <div key={column} className="bg-white border rounded p-2">
                  <div className="text-xs font-medium text-gray-700 mb-2">{column}</div>
                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-4 gap-2 flex-1">
                      {comparisonGroups.map((group) => (
                        <div key={`${column}-${group}`} className="flex items-center gap-1 p-1.5 bg-gray-50 border rounded">
                          <span className="text-[10px] text-gray-600 flex-1 truncate" title={String(group)}>
                            {String(group)}
                          </span>
                          <input
                            type="color"
                            value={groupStyles[column]?.[group as string]?.color || DEFAULT_COLORS[0]}
                            onChange={(e) => updateGroupStyle(column, group as string, e.target.value)}
                            className="w-6 h-5 rounded cursor-pointer"
                            title={`${group} 的颜色`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 p-1.5 bg-gray-50 border rounded flex-shrink-0">
                      <span className="text-[10px] text-gray-600 flex-1 truncate">粗细</span>
                      <select
                        value={lineStyles[column]?.thickness || 2}
                        onChange={(e) => updateLineStyle(column, { thickness: Number(e.target.value) })}
                        className="px-1 py-0.5 text-xs border rounded bg-white"
                        title="线条粗细"
                      >
                        <option value="1">细</option>
                        <option value="2">中</option>
                        <option value="3">粗</option>
                        <option value="4">很粗</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // 非对比模式：显示每个指标的颜色和粗细
            <div className="grid grid-cols-2 gap-2">
              {numericColumns.map((column) => (
                <div key={column} className="flex items-center gap-2 p-2 bg-white border rounded">
                  <span className="text-xs text-gray-700 flex-1 truncate" title={column}>
                    {column}
                  </span>
                  <input
                    type="color"
                    value={lineStyles[column]?.color || DEFAULT_COLORS[0]}
                    onChange={(e) => updateLineStyle(column, { color: e.target.value })}
                    className="w-8 h-6 rounded cursor-pointer"
                    title="选择颜色"
                  />
                  <select
                    value={lineStyles[column]?.thickness || 2}
                    onChange={(e) => updateLineStyle(column, { thickness: Number(e.target.value) })}
                    className="px-1 py-0.5 text-xs border rounded"
                    title="线条粗细"
                  >
                    <option value="1">细</option>
                    <option value="2">中</option>
                    <option value="3">粗</option>
                    <option value="4">很粗</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {hasComparisonGroup ? (
        <ComparisonChart result={result} chartType={chartType} lineStyles={lineStyles} groupStyles={groupStyles} />
      ) : (
        <NormalChart result={result} chartType={chartType} lineStyles={lineStyles} />
      )}
    </div>
  );
}
