'use client';

import { useState } from 'react';
import { RotateCcw, FileText, Save, Check } from 'lucide-react';
import { AIAnalysisResponse } from './AIAnalysisDrawer';

interface Props {
  result: AIAnalysisResponse;
  onReset: () => void;
  queryId?: number;
}

export default function AIAnalysisResult({ result, onReset, queryId }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!queryId) {
      alert('无法保存：未关联到查询记录');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/query/${queryId}/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis: result,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('保存失败：' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('保存分析报告失败:', error);
      alert('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" />
          <h3 className="text-base font-semibold text-gray-900">分析报告</h3>
        </div>
        <div className="flex items-center gap-2">
          {queryId && (
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                saved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  已保存
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  {saving ? '保存中...' : '保存报告'}
                </>
              )}
            </button>
          )}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重新分析
          </button>
        </div>
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-purple-900 mb-1.5">📋 分析摘要</h4>
          <p className="text-xs text-gray-700 leading-relaxed">{result.summary}</p>
        </div>
      )}

      {/* Findings */}
      {result.findings && result.findings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            🔍 关键发现
          </h4>
          <ul className="space-y-1.5">
            {result.findings.map((finding, i) => (
              <li key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  {i + 1}
                </span>
                <span className="text-xs text-gray-700 flex-1 leading-relaxed">{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Insights */}
      {result.insights && result.insights.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            💡 数据洞察
          </h4>
          <ul className="space-y-1.5">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 p-2 bg-purple-50 rounded-md border border-purple-100">
                <span className="text-purple-600 text-xs mt-0.5">◆</span>
                <span className="text-xs text-gray-700 flex-1 leading-relaxed">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Anomalies */}
      {result.anomalies && result.anomalies.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            ⚠️ 异常分析
          </h4>
          <ul className="space-y-1.5">
            {result.anomalies.map((anomaly, i) => (
              <li key={i} className="flex items-start gap-2 p-2 bg-orange-50 rounded-md border border-orange-200">
                <span className="text-orange-600 text-xs mt-0.5">⚠</span>
                <span className="text-xs text-gray-700 flex-1 leading-relaxed">{anomaly}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics */}
      {result.metrics && Object.keys(result.metrics).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            📊 关键指标
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(result.metrics).map(([key, value]) => (
              <div key={key} className="bg-gray-50 border border-gray-200 rounded-md p-2">
                <div className="text-[10px] text-gray-600 mb-1">{key}</div>
                {typeof value === 'object' && value !== null ? (
                  <div className="space-y-0.5">
                    {Object.entries(value).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-gray-600">{k}:</span>
                        <span className="font-medium text-gray-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-gray-900">
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
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            ✅ 优化建议
          </h4>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 p-2 bg-green-50 rounded-md border border-green-200">
                <span className="text-green-600 text-xs mt-0.5">✓</span>
                <span className="text-xs text-gray-700 flex-1 leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {result.risks && result.risks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            🔴 风险评估
          </h4>
          <ul className="space-y-1.5">
            {result.risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded-md border border-red-200">
                <span className="text-red-600 text-xs mt-0.5">●</span>
                <span className="text-xs text-gray-700 flex-1 leading-relaxed">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
