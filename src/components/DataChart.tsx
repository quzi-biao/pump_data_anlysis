'use client';

import { useState, useMemo } from 'react';
import { AnalysisResult } from '@/types';
import ComparisonChart from './ComparisonChart';
import NormalChart from './NormalChart';
import ChartStyleConfig, { BackgroundZone } from './ChartStyleConfig';
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

  // 计算横轴范围（基于数据索引）
  const xAxisRange = useMemo(() => {
    return {
      min: 0,
      max: data.length - 1
    };
  }, [data.length]);

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

  // 背景区域配置
  const [backgroundZones, setBackgroundZones] = useState<BackgroundZone[]>([]);

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
        <ChartStyleConfig
          numericColumns={numericColumns}
          comparisonGroups={comparisonGroups}
          hasComparisonGroup={hasComparisonGroup}
          lineStyles={lineStyles}
          groupStyles={groupStyles}
          backgroundZones={backgroundZones}
          xAxisRange={xAxisRange}
          onUpdateLineStyle={updateLineStyle}
          onUpdateGroupStyle={updateGroupStyle}
          onUpdateBackgroundZones={setBackgroundZones}
        />
      )}

      {/* Charts */}
      {hasComparisonGroup ? (
        <ComparisonChart 
          result={result} 
          chartType={chartType} 
          lineStyles={lineStyles} 
          groupStyles={groupStyles}
          backgroundZones={backgroundZones}
        />
      ) : (
        <NormalChart 
          result={result} 
          chartType={chartType} 
          lineStyles={lineStyles}
          backgroundZones={backgroundZones}
        />
      )}
    </div>
  );
}
