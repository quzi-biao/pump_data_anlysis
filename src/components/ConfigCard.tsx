'use client';

import { AnalysisConfig } from '@/types';
import { Edit2, Trash2, Copy } from 'lucide-react';

interface Props {
  config: AnalysisConfig;
  showDelete: boolean;
  onEdit: (config: AnalysisConfig) => void;
  onDelete: (id: number) => void;
  onCopy: (config: AnalysisConfig) => void;
}

const getAggregationLabel = (type: string) => {
  switch (type) {
    case 'avg': return '均值';
    case 'max': return '最大值';
    case 'min': return '最小值';
    case 'sum': return '求和';
    case 'weighted_avg': return '加权平均';
    default: return '均值';
  }
};

export default function ConfigCard({ config, showDelete, onEdit, onDelete, onCopy }: Props) {
  return (
    <div className="bg-white rounded-lg border p-5 hover:shadow-lg transition-shadow flex flex-col relative">
      <div className="flex-1">
        <div>
        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-1">
            {config.name}
        </h3>
          <div className="absolute top-3 right-3 flex gap-1">
            <button
              onClick={() => onCopy(config)}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
              title="复制"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(config)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="编辑"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {config.description && (
          <p className="text-xs text-gray-500 mb-4 line-clamp-2">{config.description}</p>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">基础指标</span>
            <span className="font-medium text-gray-900">{config.baseIndicators.length} 个</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">扩展指标</span>
            <span className="font-medium text-gray-900">{config.extendedIndicators?.length || 0} 个</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">时间维度</span>
            <span className="font-medium text-gray-900">
              {config.timeDimension === 'minute' ? '分钟' : 
               config.timeDimension === 'hour' ? '小时' : '日'}
            </span>
          </div>
          {config.baseIndicators.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-600 mb-1">聚合方式</div>
              <div className="flex flex-wrap gap-1">
                {config.baseIndicators
                  .slice(0, 2)
                  .map(ind => (
                    <span key={ind.id} className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                      {ind.name}: {getAggregationLabel(ind.aggregation || 'avg')}
                    </span>
                  ))}
                {config.baseIndicators.length > 2 && (
                  <span className="text-xs text-gray-500">+{config.baseIndicators.length - 2}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDelete && (
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => config.id && onDelete(config.id)}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除
          </button>
        </div>
      )}
    </div>
  );
}
