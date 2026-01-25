'use client';

import { useState } from 'react';
import { AnalysisResult } from '@/types';
import ComparisonChart from './ComparisonChart';
import NormalChart from './NormalChart';

interface Props {
  result: AnalysisResult;
}

export default function DataChart({ result }: Props) {
  const { data } = result;
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无数据
      </div>
    );
  }

  // 检查是否有对比组
  const hasComparisonGroup = 'comparisonGroup' in (data[0] || {});

  // 获取所有数值列（排除时间戳和对比组）
  const numericColumns = Object.keys(data[0]).filter(
    key => key !== 'timestamp' && key !== 'comparisonGroup' && typeof data[0][key] === 'number'
  );

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
        <ComparisonChart result={result} chartType={chartType} />
      ) : (
        <NormalChart result={result} chartType={chartType} />
      )}
    </div>
  );
}
