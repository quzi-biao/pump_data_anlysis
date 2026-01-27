'use client';

import { RotateCcw, FileText } from 'lucide-react';
import { AIAnalysisResponse } from './AIAnalysisDrawer';

interface Props {
  result: AIAnalysisResponse;
  onReset: () => void;
}

export default function AIAnalysisResult({ result, onReset }: Props) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">分析报告</h3>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          重新分析
        </button>
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-900 mb-2">📋 分析摘要</h4>
          <p className="text-gray-800 leading-relaxed">{result.summary}</p>
        </div>
      )}

      {/* Findings */}
      {result.findings && result.findings.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            🔍 关键发现
          </h4>
          <ul className="space-y-2">
            {result.findings.map((finding, i) => (
              <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded-full">
                  {i + 1}
                </span>
                <span className="text-gray-800 flex-1">{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Insights */}
      {result.insights && result.insights.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            💡 数据洞察
          </h4>
          <ul className="space-y-2">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <span className="text-purple-600 mt-1">◆</span>
                <span className="text-gray-800 flex-1">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Anomalies */}
      {result.anomalies && result.anomalies.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            ⚠️ 异常分析
          </h4>
          <ul className="space-y-2">
            {result.anomalies.map((anomaly, i) => (
              <li key={i} className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-orange-600 mt-1">⚠</span>
                <span className="text-gray-800 flex-1">{anomaly}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics */}
      {result.metrics && Object.keys(result.metrics).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            📊 关键指标
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(result.metrics).map(([key, value]) => (
              <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">{key}</div>
                {typeof value === 'object' && value !== null ? (
                  <div className="space-y-1">
                    {Object.entries(value).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-600">{k}:</span>
                        <span className="font-medium text-gray-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-lg font-semibold text-gray-900">
                    {typeof value === 'number' ? value.toFixed(2) : String(value)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            ✅ 优化建议
          </h4>
          <ul className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-gray-800 flex-1">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {result.risks && result.risks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            🔴 风险评估
          </h4>
          <ul className="space-y-2">
            {result.risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <span className="text-red-600 mt-1">●</span>
                <span className="text-gray-800 flex-1">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
