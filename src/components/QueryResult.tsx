'use client';

import { useState } from 'react';
import { AnalysisResult } from '@/types';
import { Table as TableIcon, BarChart3, Search } from 'lucide-react';
import DataTable from './DataTable';
import DataChart from './DataChart';

interface Props {
  result: AnalysisResult | null;
  error: string | null;
  chartStyles?: any;
  onExportCSV: () => void;
  onChartStylesChange?: (styles: any) => void;
  canSaveStyles?: boolean;
  onSaveStyles?: () => void;
  queryName?: string;
}

export default function QueryResult({ result, error, chartStyles, onExportCSV, onChartStylesChange, canSaveStyles, onSaveStyles, queryName }: Props) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">请在左侧设置查询条件并开始查询</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header with Result Info and Actions */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">查询结果</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
            <div>
              <span className="font-medium">数据条数：</span>
              <span className="text-gray-900">{result.data.length}</span>
            </div>
            <div>
              <span className="font-medium">时间范围：</span>
              <span className="text-gray-900">
                {result.config.timeDimension === 'day'
                  ? `${new Date(result.timeRange.start).toLocaleDateString('zh-CN')} 至 ${new Date(result.timeRange.end).toLocaleDateString('zh-CN')}`
                  : `${new Date(result.timeRange.start).toLocaleString('zh-CN')} 至 ${new Date(result.timeRange.end).toLocaleString('zh-CN')}`
                }
              </span>
            </div>
            <div>
              <span className="font-medium">对比方式：</span>
              <span className="text-gray-900">
                {result.comparisonType === 'none' ? '无' :
                 result.comparisonType === 'month' ? '按月' : '按日'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center px-3 py-1.5 text-xs rounded ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TableIcon className="w-3 h-3 mr-1" />
            表格
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center px-3 py-1.5 text-xs rounded ${
              viewMode === 'chart'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-3 h-3 mr-1" />
            图表
          </button>
          <button
            onClick={onExportCSV}
            className="flex items-center px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出CSV
          </button>
        </div>
      </div>

      {/* Data Display */}
      {viewMode === 'table' ? (
        <DataTable result={result} />
      ) : (
        <DataChart 
          result={result} 
          chartStyles={chartStyles} 
          onChartStylesChange={onChartStylesChange}
          canSaveStyles={canSaveStyles}
          onSaveStyles={onSaveStyles}
          queryName={queryName}
        />
      )}
    </div>
  );
}
