'use client';

import { useState } from 'react';
import { AnalysisResult } from '@/types';
import { Table as TableIcon, BarChart3, Search, Sparkles } from 'lucide-react';
import DataTable from './DataTable';
import DataChart from './DataChart';
import AIAnalysisDrawer from './AIAnalysisDrawer';

interface Props {
  result: AnalysisResult | null;
  error: string | null;
  chartStyles?: any;
  onExportCSV: () => void;
  onChartStylesChange?: (styles: any) => void;
  canSaveStyles?: boolean;
  onSaveStyles?: () => void;
  queryName?: string;
  queryId?: number;
}

export default function QueryResult({ result, error, chartStyles, onExportCSV, onChartStylesChange, canSaveStyles, onSaveStyles, queryName, queryId }: Props) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);
  const [showAnalysisPreview, setShowAnalysisPreview] = useState(false);

  // 加载最新的 AI 分析报告
  const loadLatestAnalysis = async () => {
    if (!queryId) return;
    
    try {
      const response = await fetch(`/api/query/${queryId}/ai-analysis`);
      const data = await response.json();
      
      if (data.success && data.analysis) {
        setLatestAnalysis(data.analysis);
        setShowAnalysisPreview(true);
      } else {
        // 没有历史分析报告
        alert('该查询暂无历史 AI 分析报告，请点击"AI解读"按钮进行分析');
      }
    } catch (error) {
      console.error('加载分析报告失败:', error);
      alert('加载分析报告失败，请稍后重试');
    }
  };

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
      {/* Latest AI Analysis Preview */}
      {queryId && showAnalysisPreview && latestAnalysis && (
        <div className="mb-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-purple-900">最新 AI 分析报告</h3>
              </div>
              {latestAnalysis.summary && (
                <p className="text-xs text-gray-700 line-clamp-2 mb-2">{latestAnalysis.summary}</p>
              )}
              <button
                onClick={() => setShowAIDrawer(true)}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                查看完整报告 →
              </button>
            </div>
            <button
              onClick={() => setShowAnalysisPreview(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header with Result Info and Actions */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">查询结果</h2>
          {queryId && !showAnalysisPreview && (
            <button
              onClick={loadLatestAnalysis}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              查看历史 AI 分析
            </button>
          )}
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
            onClick={() => setShowAIDrawer(true)}
            className="flex items-center px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            AI解读
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

      {/* AI Analysis Drawer */}
      <AIAnalysisDrawer
        isOpen={showAIDrawer}
        onClose={() => setShowAIDrawer(false)}
        result={result}
        queryName={queryName}
        queryId={queryId}
      />
    </div>
  );
}
