'use client';

import { ImportConfig } from '@/types';
import { FileUp, Edit2, Trash2, Copy } from 'lucide-react';

interface Props {
  config: ImportConfig;
  showDelete: boolean;
  onUse: (config: ImportConfig) => void;
  onEdit: (config: ImportConfig) => void;
  onDelete: (id: number) => void;
  onCopy: (config: ImportConfig) => void;
}

const getDataTypeLabel = (type: string) => {
  switch (type) {
    case 'day': return '日数据';
    case 'hour': return '小时数据';
    case 'minute': return '分钟/秒数据';
    default: return type;
  }
};

const getDataFormatLabel = (format: string) => {
  switch (format) {
    case 'column': return '列数据';
    case 'row': return '行数据';
    default: return format;
  }
};

export default function ImportTemplateCard({ config, showDelete, onUse, onEdit, onDelete, onCopy }: Props) {
  return (
    <div className="bg-white rounded-lg border p-5 hover:shadow-lg transition-shadow flex flex-col relative">
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

      <div className="flex-1 pr-10">
        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-1">{config.name}</h3>
        {config.description && (
          <p className="text-xs text-gray-500 mb-4 line-clamp-2">{config.description}</p>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">数据类型</span>
            <span className="font-medium text-gray-900">{getDataTypeLabel(config.dataType)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">数据格式</span>
            <span className="font-medium text-gray-900">{getDataFormatLabel(config.dataFormat)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">起始位置</span>
            <span className="font-medium text-gray-900">第{config.startRow}行 第{config.startColumn}列</span>
          </div>
          {config.labelMappings.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-600 mb-1">标签映射</div>
              <div className="flex flex-wrap gap-1">
                {config.labelMappings.slice(0, 2).map((mapping, idx) => (
                  <span key={idx} className="inline-flex items-center px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                    {mapping.original} → {mapping.mapped}
                  </span>
                ))}
                {config.labelMappings.length > 2 && (
                  <span className="text-xs text-gray-500">+{config.labelMappings.length - 2}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={() => onUse(config)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
        >
          <FileUp className="w-3.5 h-3.5" />
          使用此模板导入
        </button>
      </div>

      {showDelete && (
        <div className="mt-2">
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
