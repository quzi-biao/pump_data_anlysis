'use client';

import { useState } from 'react';
import { AnalysisConfig } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import ConfigCard from './ConfigCard';
import ConfigEditForm from './ConfigEditForm';

interface Props {
  configs: AnalysisConfig[];
  onConfigsChange: () => void;
  loading: boolean;
}

export default function AnalysisConfigManager({ configs, onConfigsChange, loading }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<AnalysisConfig> | null>(null);
  const [showDeleteMode, setShowDeleteMode] = useState(false);

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

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">分析配置列表</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreate}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            新建配置
          </button>
          <button
            onClick={() => setShowDeleteMode(!showDeleteMode)}
            className={`flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showDeleteMode 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {showDeleteMode ? '取消删除' : '删除'}
          </button>
        </div>
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
              <ConfigCard
                key={config.id}
                config={config}
                showDelete={showDeleteMode}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}

      {/* Edit Form */}
      {isEditing && editingConfig && (
        <ConfigEditForm
          editingConfig={editingConfig}
          onConfigChange={setEditingConfig}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
