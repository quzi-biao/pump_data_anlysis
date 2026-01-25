'use client';

import { useState } from 'react';
import { AnalysisConfig, BaseIndicator, ExtendedIndicator, TimeDimension } from '@/types';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface Props {
  configs: AnalysisConfig[];
  onConfigsChange: () => void;
  loading: boolean;
}

export default function AnalysisConfigManager({ configs, onConfigsChange, loading }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<AnalysisConfig> | null>(null);

  const handleCreate = () => {
    setEditingConfig({
      name: '',
      description: '',
      baseIndicators: [],
      extendedIndicators: [],
      timeDimension: 'minute',
    });
    setIsEditing(true);
  };

  const handleEdit = (config: AnalysisConfig) => {
    setEditingConfig(config);
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此分析配置吗？')) return;

    try {
      const response = await fetch(`/api/analysis?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        onConfigsChange();
      } else {
        alert('删除失败：' + result.error);
      }
    } catch (error) {
      alert('删除失败');
      console.error(error);
    }
  };

  // 计算配置内容的 MD5
  const calculateConfigMD5 = async (config: Partial<AnalysisConfig>): Promise<string> => {
    const content = JSON.stringify({
      baseIndicators: config.baseIndicators,
      extendedIndicators: config.extendedIndicators,
      timeDimension: config.timeDimension,
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleSave = async () => {
    if (!editingConfig) return;

    try {
      // 计算当前配置的 MD5
      const currentMD5 = await calculateConfigMD5(editingConfig);
      
      // 检查是否存在相同内容的配置（排除当前编辑的配置）
      const duplicateConfig = configs.find(c => {
        if (editingConfig.id && c.id === editingConfig.id) return false;
        const configContent = JSON.stringify({
          baseIndicators: c.baseIndicators,
          extendedIndicators: c.extendedIndicators,
          timeDimension: c.timeDimension,
        });
        return configContent === JSON.stringify({
          baseIndicators: editingConfig.baseIndicators,
          extendedIndicators: editingConfig.extendedIndicators,
          timeDimension: editingConfig.timeDimension,
        });
      });

      if (duplicateConfig) {
        if (!confirm(`已存在相同配置内容的分析配置"${duplicateConfig.name}"，是否继续保存？`)) {
          return;
        }
      }

      const method = editingConfig.id ? 'PUT' : 'POST';
      const response = await fetch('/api/analysis', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig),
      });

      const result = await response.json();
      if (result.success) {
        setIsEditing(false);
        setEditingConfig(null);
        onConfigsChange();
      } else {
        alert('保存失败：' + result.error);
      }
    } catch (error) {
      alert('保存失败');
      console.error(error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingConfig(null);
  };

  const addBaseIndicator = () => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      baseIndicators: [
        ...(editingConfig.baseIndicators || []),
        { id: Date.now().toString(), name: '', indicator_id: '' },
      ],
    });
  };

  const updateBaseIndicator = (index: number, field: keyof BaseIndicator, value: string | boolean) => {
    if (!editingConfig) return;
    
    const indicators = [...(editingConfig.baseIndicators || [])];
    indicators[index] = { ...indicators[index], [field]: value };
    setEditingConfig({ ...editingConfig, baseIndicators: indicators });
  };

  const validateBaseIndicatorName = (name: string): boolean => {
    const invalidChars = /[+\-*/.()\s]/;
    return !invalidChars.test(name);
  };

  const getAggregationLabel = (type: string) => {
    switch (type) {
      case 'avg': return '均值';
      case 'max': return '最大值';
      case 'min': return '最小值';
      default: return '均值';
    }
  };

  const removeBaseIndicator = (index: number) => {
    if (!editingConfig) return;
    const indicators = [...(editingConfig.baseIndicators || [])];
    indicators.splice(index, 1);
    setEditingConfig({ ...editingConfig, baseIndicators: indicators });
  };

  const addExtendedIndicator = () => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      extendedIndicators: [
        ...(editingConfig.extendedIndicators || []),
        { id: Date.now().toString(), name: '', formula: '', baseIndicators: [] },
      ],
    });
  };

  const updateExtendedIndicator = (index: number, field: keyof ExtendedIndicator, value: any) => {
    if (!editingConfig) return;
    const indicators = [...(editingConfig.extendedIndicators || [])];
    indicators[index] = { ...indicators[index], [field]: value };
    setEditingConfig({ ...editingConfig, extendedIndicators: indicators });
  };

  const removeExtendedIndicator = (index: number) => {
    if (!editingConfig) return;
    const indicators = [...(editingConfig.extendedIndicators || [])];
    indicators.splice(index, 1);
    setEditingConfig({ ...editingConfig, extendedIndicators: indicators });
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">分析配置列表</h2>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          新建配置
        </button>
      </div>

      {/* Config List */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {configs.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500">暂无分析配置，点击"新建配置"开始创建</p>
            </div>
          ) : (
            configs.map((config) => (
              <div key={config.id} className="bg-white rounded-lg border p-5 hover:shadow-lg transition-shadow flex flex-col">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-1">{config.name}</h3>
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
                      <span className="font-medium text-gray-900">{config.extendedIndicators.length} 个</span>
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
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => handleEdit(config)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    编辑
                  </button>
                  <button
                    onClick={() => config.id && handleDelete(config.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Form */}
      {isEditing && editingConfig && (
        <div className="bg-white rounded-lg border p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">配置名称</label>
              <input
                type="text"
                value={editingConfig.name || ''}
                onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入配置名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
              <textarea
                value={editingConfig.description || ''}
                onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="输入配置描述"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">时间维度</label>
              <select
                value={editingConfig.timeDimension || 'minute'}
                onChange={(e) => setEditingConfig({ ...editingConfig, timeDimension: e.target.value as TimeDimension })}
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
                onClick={handleCancel}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
