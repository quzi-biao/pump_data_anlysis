'use client';

import { useState } from 'react';
import { AnalysisConfig, ComparisonType } from '@/types';
import { Search, Save, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  configs: AnalysisConfig[];
  selectedConfigId: number | null;
  startTime: string;
  endTime: string;
  comparisonType: ComparisonType;
  loading: boolean;
  onConfigChange: (id: number | null) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onComparisonTypeChange: (type: ComparisonType) => void;
  onQuery: () => void;
  onSave: () => void;
}

export default function QueryForm({
  configs,
  selectedConfigId,
  startTime,
  endTime,
  comparisonType,
  loading,
  onConfigChange,
  onStartTimeChange,
  onEndTimeChange,
  onComparisonTypeChange,
  onQuery,
  onSave,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const selectedConfig = configs.find(c => c.id === selectedConfigId);

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div 
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold text-gray-900">查询条件</h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Analysis Config Selection */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            选择分析配置
          </label>
          <select
            value={selectedConfigId || ''}
            onChange={(e) => onConfigChange(Number(e.target.value) || null)}
            className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">请选择...</option>
            {configs.map((config) => (
              <option key={config.id} value={config.id}>
                {config.name}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            开始时间
          </label>
          <input
            type={selectedConfig?.timeDimension === 'day' ? 'date' : 'datetime-local'}
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            结束时间
          </label>
          <input
            type={selectedConfig?.timeDimension === 'day' ? 'date' : 'datetime-local'}
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Comparison Type */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            对比方式
          </label>
          <select
            value={comparisonType}
            onChange={(e) => onComparisonTypeChange(e.target.value as ComparisonType)}
            className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="none">不对比</option>
            <option value="month">按月对比</option>
            <option value="day">按日对比</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            选择对比方式后，数据将按月份或日期分组显示在同一图表中
          </p>
        </div>
      </div>

        {/* Query Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onQuery}
            disabled={loading}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4 mr-1.5" />
            {loading ? '查询中...' : '开始查询'}
          </button>
          <button
            onClick={onSave}
            disabled={!selectedConfigId || !startTime || !endTime}
            className="px-3 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
        </div>
      )}
    </div>
  );
}
