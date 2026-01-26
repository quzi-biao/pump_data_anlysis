'use client';

import { AnalysisConfig, BaseIndicator, ExtendedIndicator, TimeDimension } from '@/types';
import { Save, X } from 'lucide-react';

interface Props {
  editingConfig: Partial<AnalysisConfig>;
  onConfigChange: (config: Partial<AnalysisConfig>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function ConfigEditForm({ editingConfig, onConfigChange, onSave, onCancel }: Props) {
  const addBaseIndicator = () => {
    onConfigChange({
      ...editingConfig,
      baseIndicators: [
        ...(editingConfig.baseIndicators || []),
        { id: Date.now().toString(), name: '', indicator_id: '' },
      ],
    });
  };

  const updateBaseIndicator = (index: number, field: keyof BaseIndicator, value: string | boolean) => {
    const indicators = [...(editingConfig.baseIndicators || [])];
    indicators[index] = { ...indicators[index], [field]: value };
    onConfigChange({ ...editingConfig, baseIndicators: indicators });
  };

  const validateBaseIndicatorName = (name: string): boolean => {
    const invalidChars = /[+\-*/.()\s]/;
    return !invalidChars.test(name);
  };

  const removeBaseIndicator = (index: number) => {
    const indicators = [...(editingConfig.baseIndicators || [])];
    indicators.splice(index, 1);
    onConfigChange({ ...editingConfig, baseIndicators: indicators });
  };

  const addExtendedIndicator = () => {
    onConfigChange({
      ...editingConfig,
      extendedIndicators: [
        ...(editingConfig.extendedIndicators || []),
        { id: Date.now().toString(), name: '', formula: '', baseIndicators: [] },
      ],
    });
  };

  const updateExtendedIndicator = (index: number, field: keyof ExtendedIndicator, value: any) => {
    const indicators = [...(editingConfig.extendedIndicators || [])];
    indicators[index] = { ...indicators[index], [field]: value };
    onConfigChange({ ...editingConfig, extendedIndicators: indicators });
  };

  const removeExtendedIndicator = (index: number) => {
    const indicators = [...(editingConfig.extendedIndicators || [])];
    indicators.splice(index, 1);
    onConfigChange({ ...editingConfig, extendedIndicators: indicators });
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="space-y-6">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">配置名称</label>
          <input
            type="text"
            value={editingConfig.name || ''}
            onChange={(e) => onConfigChange({ ...editingConfig, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入配置名称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
          <textarea
            value={editingConfig.description || ''}
            onChange={(e) => onConfigChange({ ...editingConfig, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="输入配置描述"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">时间维度</label>
          <select
            value={editingConfig.timeDimension || 'minute'}
            onChange={(e) => onConfigChange({ ...editingConfig, timeDimension: e.target.value as TimeDimension })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="minute">分钟</option>
            <option value="hour">小时</option>
            <option value="day">日</option>
          </select>
        </div>

        {/* Base Indicators */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">基础指标</label>
            <button
              onClick={addBaseIndicator}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + 添加指标
            </button>
          </div>
          <div className="space-y-3">
            {(editingConfig.baseIndicators || []).map((indicator, index) => (
              <div key={indicator.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={indicator.name}
                    onChange={(e) => updateBaseIndicator(index, 'name', e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value && !validateBaseIndicatorName(e.target.value)) {
                        alert('基础指标名称不能包含运算符字符（+、-、*、/、.、括号、空格）');
                      }
                    }}
                    className="px-3 py-2 border rounded bg-white"
                    placeholder="指标名称"
                  />
                  <input
                    type="text"
                    value={indicator.indicator_id}
                    onChange={(e) => updateBaseIndicator(index, 'indicator_id', e.target.value)}
                    className="px-3 py-2 border rounded bg-white"
                    placeholder="指标 ID"
                  />
                  <select
                    value={indicator.aggregation || 'avg'}
                    onChange={(e) => updateBaseIndicator(index, 'aggregation', e.target.value)}
                    className="px-3 py-2 border rounded bg-white"
                  >
                    <option value="avg">均值</option>
                    <option value="max">最大值</option>
                    <option value="min">最小值</option>
                  </select>
                  <label className="flex items-center justify-center px-3 py-2 border rounded bg-white cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={indicator.visible !== false}
                      onChange={(e) => updateBaseIndicator(index, 'visible', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">显示</span>
                  </label>
                </div>
                <button
                  onClick={() => removeBaseIndicator(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Extended Indicators */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">扩展指标（计算字段）</label>
            <button
              onClick={addExtendedIndicator}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + 添加扩展指标
            </button>
          </div>
          <div className="space-y-3">
            {(editingConfig.extendedIndicators || []).map((indicator, index) => (
              <div key={indicator.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex gap-3 items-start mb-3">
                  <input
                    type="text"
                    value={indicator.name}
                    onChange={(e) => updateExtendedIndicator(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded bg-white"
                    placeholder="扩展指标名称"
                  />
                  <button
                    onClick={() => removeExtendedIndicator(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={indicator.formula}
                  onChange={(e) => updateExtendedIndicator(index, 'formula', e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white"
                  placeholder="计算公式（例如：温度 + 湿度 或 (温度 - 湿度) / 压力 * 100）"
                />
                <p className="mt-2 text-xs text-gray-500">
                  使用基础指标的名称编写公式，支持 +、-、*、/ 和括号。注意：基础指标名称不能包含运算符字符
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
