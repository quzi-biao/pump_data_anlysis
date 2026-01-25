'use client';

import { useState, useEffect } from 'react';
import { AnalysisConfig, ComparisonType } from '@/types';
import { Search, Save, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

interface Props {
  configs: AnalysisConfig[];
  selectedConfigId: number | null;
  startTime: string;
  endTime: string;
  comparisonType: ComparisonType;
  loading: boolean;
  selectedMonths: string[];
  onConfigChange: (id: number | null) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onComparisonTypeChange: (type: ComparisonType) => void;
  onSelectedMonthsChange: (months: string[]) => void;
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
  selectedMonths,
  onConfigChange,
  onStartTimeChange,
  onEndTimeChange,
  onComparisonTypeChange,
  onSelectedMonthsChange,
  onQuery,
  onSave,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [timeSelectMode, setTimeSelectMode] = useState<'range' | 'months'>('range');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const selectedConfig = configs.find(c => c.id === selectedConfigId);

  // 根据 selectedMonths 自动切换时间选择模式
  useEffect(() => {
    if (selectedMonths.length > 0) {
      setTimeSelectMode('months');
      // 自动设置年份为第一个选中月份的年份
      const firstMonth = selectedMonths[0];
      const year = parseInt(firstMonth.split('-')[0]);
      setSelectedYear(year);
    } else if (startTime || endTime) {
      setTimeSelectMode('range');
    }
  }, [selectedMonths, startTime, endTime]);

  // 生成年份选项（2024年到当前年份）
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2024; year--) {
      years.push(year);
    }
    return years;
  };

  const yearOptions = generateYearOptions();

  // 生成指定年份的月份选项
  const generateMonthsForYear = (year: number) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const months = [];
    const maxMonth = year === currentYear ? currentMonth : 12;
    
    for (let month = 1; month <= maxMonth; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      months.push({
        value: monthStr,
        label: `${month}月`,
      });
    }
    return months;
  };

  const monthsForSelectedYear = generateMonthsForYear(selectedYear);

  const toggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      onSelectedMonthsChange(selectedMonths.filter(m => m !== month));
    } else {
      onSelectedMonthsChange([...selectedMonths, month]);
    }
  };

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

        {/* Time Selection Mode Toggle */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            时间选择方式
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTimeSelectMode('range')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-lg border ${
                timeSelectMode === 'range'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              时间范围
            </button>
            <button
              type="button"
              onClick={() => setTimeSelectMode('months')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-lg border ${
                timeSelectMode === 'months'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-3 h-3 inline mr-1" />
              按月选择
            </button>
          </div>
        </div>

        {timeSelectMode === 'range' ? (
          <>
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
          </>
        ) : (
          <>
            {/* Month Selection */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                选择年份
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
              
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                选择月份（可多选）
              </label>
              <div className="grid grid-cols-4 gap-2 p-2 border rounded-lg bg-gray-50">
                {monthsForSelectedYear.map((month) => (
                  <button
                    key={month.value}
                    type="button"
                    onClick={() => toggleMonth(month.value)}
                    className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                      selectedMonths.includes(month.value)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {month.label}
                  </button>
                ))}
              </div>
              {selectedMonths.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800 font-medium mb-1">
                    已选择 {selectedMonths.length} 个月份：
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedMonths.sort().map((month) => (
                      <span
                        key={month}
                        className="inline-flex items-center px-2 py-0.5 bg-blue-600 text-white text-xs rounded"
                      >
                        {month}
                        <button
                          type="button"
                          onClick={() => toggleMonth(month)}
                          className="ml-1 hover:text-blue-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

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
            {timeSelectMode === 'months' 
              ? '选择"按月对比"可对比不同月份的数据；选择"不对比"则将所有选中月份的数据合并为一条曲线' 
              : '选择对比方式后，数据将按月份或日期分组显示在同一图表中'}
          </p>
        </div>
      </div>

        {/* Query Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onQuery}
            disabled={loading || !selectedConfigId || (timeSelectMode === 'range' ? (!startTime || !endTime) : selectedMonths.length === 0)}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4 mr-1.5" />
            {loading ? '查询中...' : '开始查询'}
          </button>
          <button
            onClick={onSave}
            disabled={!selectedConfigId || (timeSelectMode === 'range' ? (!startTime || !endTime) : selectedMonths.length === 0)}
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
