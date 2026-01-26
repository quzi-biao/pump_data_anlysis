'use client';

import { useState, useEffect } from 'react';
import { ImportConfig } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import ImportTemplateCard from './ImportTemplateCard';
import DataImportForm from './DataImportForm';

export default function DataImportPanel() {
  const [configs, setConfigs] = useState<ImportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteMode, setShowDeleteMode] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<ImportConfig> | null>(null);
  const [formMode, setFormMode] = useState<'template' | 'import'>('template');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/import-config');
      const result = await response.json();
      if (result.success) {
        setConfigs(result.data);
      }
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingConfig({
      name: '',
      description: '',
      dataType: 'minute',
      startRow: 3,
      startColumn: 4,
      dataFormat: 'column',
      dateFormat: '',
      labelMappings: [],
    });
    setFormMode('template');
  };

  const handleEditTemplate = (config: ImportConfig) => {
    setEditingConfig(config);
    setFormMode('template');
  };

  const handleCopyTemplate = (config: ImportConfig) => {
    // 创建模板的副本，移除 id 并修改名称
    const copiedConfig: Partial<ImportConfig> = {
      name: `${config.name} - 副本`,
      description: config.description,
      dataType: config.dataType,
      startRow: config.startRow,
      startColumn: config.startColumn,
      dataFormat: config.dataFormat,
      dateFormat: config.dateFormat,
      labelMappings: JSON.parse(JSON.stringify(config.labelMappings)),
    };
    setEditingConfig(copiedConfig);
    setFormMode('template');
  };

  const handleUseTemplate = (config: ImportConfig) => {
    setEditingConfig(config);
    setFormMode('import');
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('确定要删除此导入模板吗？')) return;

    try {
      const response = await fetch(`/api/import-config?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        loadConfigs();
      } else {
        alert('删除失败：' + result.error);
      }
    } catch (error) {
      alert('删除失败');
      console.error(error);
    }
  };

  const handleSaveTemplate = async (config: ImportConfig) => {
    try {
      const method = config.id ? 'PUT' : 'POST';
      const response = await fetch('/api/import-config', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      if (result.success) {
        setEditingConfig(null);
        loadConfigs();
        alert(config.id ? '模板更新成功' : '模板创建成功');
      } else {
        alert('保存失败：' + result.error);
      }
    } catch (error) {
      alert('保存失败');
      console.error(error);
    }
  };

  const handleCancel = () => {
    setEditingConfig(null);
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">导入模板列表</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateTemplate}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            新建模板
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

      {/* Template List */}
      {!editingConfig && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {configs.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500">暂无导入模板，点击"新建模板"开始创建</p>
            </div>
          ) : (
            configs.map((config) => (
              <ImportTemplateCard
                key={config.id}
                config={config}
                showDelete={showDeleteMode}
                onUse={handleUseTemplate}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onCopy={handleCopyTemplate}
              />
            ))
          )}
        </div>
      )}

      {/* Edit/Import Form */}
      {editingConfig && (
        <DataImportForm
          config={editingConfig}
          mode={formMode}
          onSave={formMode === 'template' ? handleSaveTemplate : undefined}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
