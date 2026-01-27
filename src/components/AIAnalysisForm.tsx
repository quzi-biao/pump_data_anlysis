'use client';

import { useState } from 'react';
import { Send, Loader2, Lightbulb } from 'lucide-react';
import { AnalysisResult } from '@/types';
import { AIAnalysisResponse } from './AIAnalysisDrawer';
import { submitToN8n } from '@/lib/n8n-service';

interface Props {
  result: AnalysisResult | null;
  queryName?: string;
  queryId?: number;
  onAnalysisComplete: (result: AIAnalysisResponse) => void;
}

const PROMPT_TEMPLATES = [
  {
    title: '全面分析',
    prompt: '对这些数据进行全面分析，包括整体趋势、异常情况、关键发现和优化建议。',
  },
  {
    title: '异常检测',
    prompt: '重点分析数据中的异常值和异常模式，找出可能的问题原因。',
  },
  {
    title: '趋势预测',
    prompt: '分析数据的变化趋势，预测未来可能的发展方向。',
  },
  {
    title: '相关性分析',
    prompt: '分析各个指标之间的相关性，找出影响因素和关联关系。',
  },
  {
    title: '运维建议',
    prompt: '基于数据分析结果，提供具体的运维优化建议和风险预警。',
  },
];

export default function AIAnalysisForm({ result, queryName, queryId, onAnalysisComplete }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('请输入分析目标');
      return;
    }

    if (!result) {
      setError('没有可分析的数据');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 提取所有可见的指标名称
      const allIndicators = [
        ...(result.config.baseIndicators?.filter(ind => ind.visible !== false).map(ind => ind.name) || []),
        ...(result.config.extendedIndicators?.filter(ind => ind.visible !== false).map(ind => ind.name) || [])
      ];

      const response = await submitToN8n({
        data: result.data,
        prompt: prompt.trim(),
        metadata: {
          queryName: queryName || '未命名查询',
          timeRange: result.timeRange,
          comparisonType: result.comparisonType,
          config: result.config,
          indicators: allIndicators,
        },
      });

      if (response.success && response.result) {
        onAnalysisComplete(response.result);
        
        // 如果有 queryId，保存分析报告到数据库
        if (queryId) {
          try {
            await fetch(`/api/query/${queryId}/ai-analysis`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                analysis: response.result,
              }),
            });
          } catch (saveError) {
            console.error('保存分析报告失败:', saveError);
            // 不影响主流程，只记录错误
          }
        }
      } else {
        setError(response.error || '分析失败，请重试');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误，请检查 n8n 服务是否正常运行');
    } finally {
      setLoading(false);
    }
  };

  // 提取所有指标名称
  const getIndicatorNames = () => {
    if (!result?.config) return [];
    
    const baseNames = result.config.baseIndicators
      ?.filter(ind => ind.visible !== false)
      .map(ind => ind.name) || [];
    
    const extendedNames = result.config.extendedIndicators
      ?.filter(ind => ind.visible !== false)
      .map(ind => ind.name) || [];
    
    return [...baseNames, ...extendedNames];
  };

  const indicators = getIndicatorNames();

  return (
    <div className="p-6 space-y-6">
      {/* Context Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">📊 当前数据上下文</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <div><strong>查询名称：</strong>{queryName || '未命名查询'}</div>
          <div><strong>时间范围：</strong>{result?.timeRange.start} ~ {result?.timeRange.end}</div>
          <div><strong>数据点数：</strong>{result?.data.length || 0}</div>
          <div><strong>监测指标：</strong>{indicators.length > 0 ? indicators.join('、') : '无'}</div>
        </div>
      </div>

      {/* Prompt Templates */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          快速模板
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {PROMPT_TEMPLATES.map((template, index) => (
            <button
              key={index}
              onClick={() => setPrompt(template.prompt)}
              className="text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div className="font-medium text-sm text-gray-900">{template.title}</div>
              <div className="text-xs text-gray-600 mt-1">{template.prompt}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Prompt Input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          自定义分析目标
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要了解的内容，例如：&#10;- 分析流量数据的周期性规律&#10;- 找出压力异常的时间段和原因&#10;- 评估当前运行状态并给出优化建议"
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <div className="mt-2 text-xs text-gray-500">
          {prompt.length} / 500 字符
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            AI 分析中...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            开始 AI 分析
          </>
        )}
      </button>
    </div>
  );
}
