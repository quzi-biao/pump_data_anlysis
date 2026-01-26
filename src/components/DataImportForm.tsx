'use client';

import { useState } from 'react';
import { ImportConfig, ImportDataType, DataFormat, LabelMapping, ImportResult } from '@/types';
import { Save, X, Upload, Plus, Trash2 } from 'lucide-react';

interface Props {
  config: Partial<ImportConfig> | null;
  mode: 'template' | 'import';
  onSave?: (config: ImportConfig) => void;
  onCancel: () => void;
}

export default function DataImportForm({ config, mode, onSave, onCancel }: Props) {
  const [formData, setFormData] = useState<Partial<ImportConfig>>(config || {
    name: '',
    description: '',
    dataType: 'minute',
    startRow: 3,
    startColumn: 4,
    dataFormat: 'column',
    dateFormat: '',
    labelMappings: [],
  });

  const [files, setFiles] = useState<FileList | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const addLabelMapping = () => {
    setFormData({
      ...formData,
      labelMappings: [
        ...(formData.labelMappings || []),
        { original: '', mapped: '' },
      ],
    });
  };

  const updateLabelMapping = (index: number, field: 'original' | 'mapped', value: string) => {
    const mappings = [...(formData.labelMappings || [])];
    mappings[index] = { ...mappings[index], [field]: value };
    setFormData({ ...formData, labelMappings: mappings });
  };

  const removeLabelMapping = (index: number) => {
    const mappings = [...(formData.labelMappings || [])];
    mappings.splice(index, 1);
    setFormData({ ...formData, labelMappings: mappings });
  };

  const handleSaveTemplate = () => {
    if (!formData.name) {
      alert('请输入模板名称');
      return;
    }
    if (onSave) {
      onSave(formData as ImportConfig);
    }
  };

  const handleImport = async () => {
    if (!files || files.length === 0) {
      alert('请选择要导入的文件');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalFailed = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataToSend = new FormData();
        formDataToSend.append('file', file);
        formDataToSend.append('config', JSON.stringify(formData));

        const response = await fetch('/api/import-data', {
          method: 'POST',
          body: formDataToSend,
        });

        const result = await response.json();
        if (result.success) {
          totalInserted += result.data.inserted;
          totalUpdated += result.data.updated;
          totalFailed += result.data.failed;
          if (result.data.errors) {
            allErrors.push(...result.data.errors);
          }
        } else {
          allErrors.push(`文件 ${file.name} 导入失败: ${result.error}`);
        }
      }

      const finalResult = {
        success: true,
        inserted: totalInserted,
        updated: totalUpdated,
        failed: totalFailed,
        errors: allErrors,
      };

      setImportResult(finalResult);
      alert(`导入完成！\n新增: ${totalInserted} 条\n更新: ${totalUpdated} 条\n失败: ${totalFailed} 条`);
    } catch (error) {
      alert('导入失败：' + error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="space-y-6">
        {mode === 'template' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">模板名称</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入模板名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="输入模板描述"
              />
            </div>
          </>
        )}

        {mode === 'import' ? (
          <>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div>
                <span className="text-xs font-medium text-blue-700">模板：</span>
                <span className="text-sm text-blue-900 ml-1">{formData.name || '未命名模板'}</span>
              </div>
              {formData.description && (
                <p className="text-xs text-blue-600">{formData.description}</p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-2 border-t border-blue-200">
                <div>
                  <span className="text-blue-600">数据类型：</span>
                  <span className="text-blue-900">
                    {formData.dataType === 'minute' ? '分钟/秒级' : formData.dataType === 'hour' ? '小时' : '日'}数据
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">数据格式：</span>
                  <span className="text-blue-900">
                    {formData.dataFormat === 'column' ? '列数据' : '行数据'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">起始位置：</span>
                  <span className="text-blue-900">第{formData.startRow}行，第{formData.startColumn}列</span>
                </div>
                {formData.dateFormat && (
                  <div>
                    <span className="text-blue-600">日期格式：</span>
                    <span className="text-blue-900">{formData.dateFormat}</span>
                  </div>
                )}
                {(formData.labelMappings || []).length > 0 && (
                  <div className="col-span-2">
                    <span className="text-blue-600">标签映射：</span>
                    <span className="text-blue-900">
                      {(formData.labelMappings || []).map(m => `${m.original}→${m.mapped}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择文件</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">支持 Excel (.xlsx, .xls) 和 CSV 文件，可选择多个文件批量导入</p>
              {files && files.length > 0 && (
                <p className="mt-2 text-sm text-gray-700">已选择 {files.length} 个文件</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">数据类型</label>
                <select
                  value={formData.dataType || 'minute'}
                  onChange={(e) => setFormData({ ...formData, dataType: e.target.value as ImportDataType })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="minute">分钟/秒级数据</option>
                  <option value="hour">小时数据</option>
                  <option value="day">日数据</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">数据格式</label>
                <select
                  value={formData.dataFormat || 'column'}
                  onChange={(e) => setFormData({ ...formData, dataFormat: e.target.value as DataFormat })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="column">列数据（日期在第一行）</option>
                  <option value="row">行数据（日期在第一列）</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">起始行</label>
                <input
                  type="number"
                  min="1"
                  value={formData.startRow || 1}
                  onChange={(e) => setFormData({ ...formData, startRow: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="数据起始行（从1开始）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">起始列</label>
                <input
                  type="number"
                  min="1"
                  value={formData.startColumn || 1}
                  onChange={(e) => setFormData({ ...formData, startColumn: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="数据起始列（从1开始）"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日期格式（可选）</label>
              <input
                type="text"
                value={formData.dateFormat || ''}
                onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="留空使用默认格式"
              />
              <p className="mt-1 text-xs text-gray-500">
                默认支持: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD，可选时间 HH:mm 或 HH:mm:ss
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">标签映射</label>
                <button
                  onClick={addLabelMapping}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + 添加映射
                </button>
              </div>
              <div className="space-y-3">
                {(formData.labelMappings || []).map((mapping, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={mapping.original}
                        onChange={(e) => updateLabelMapping(index, 'original', e.target.value)}
                        className="px-3 py-2 border rounded bg-white"
                        placeholder="原始标签"
                      />
                      <input
                        type="text"
                        value={mapping.mapped}
                        onChange={(e) => updateLabelMapping(index, 'mapped', e.target.value)}
                        className="px-3 py-2 border rounded bg-white"
                        placeholder="映射后标签"
                      />
                    </div>
                    <button
                      onClick={() => removeLabelMapping(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(formData.labelMappings || []).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">暂无标签映射，点击"添加映射"开始配置</p>
                )}
              </div>
            </div>
          </>
        )}

        {importResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">导入结果</h4>
            <div className="space-y-1 text-sm text-green-800">
              <p>✓ 新增记录: {importResult.inserted} 条</p>
              <p>✓ 更新记录: {importResult.updated} 条</p>
              {importResult.failed > 0 && (
                <p className="text-red-600">✗ 失败记录: {importResult.failed} 条</p>
              )}
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-900 mb-1">错误详情:</p>
                <div className="max-h-40 overflow-y-auto text-xs text-red-800 space-y-1">
                  {importResult.errors.slice(0, 10).map((error, idx) => (
                    <p key={idx}>• {error}</p>
                  ))}
                  {importResult.errors.length > 10 && (
                    <p>... 还有 {importResult.errors.length - 10} 条错误</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            {mode === 'import' ? '关闭' : '取消'}
          </button>
          {mode === 'template' ? (
            <button
              onClick={handleSaveTemplate}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              保存模板
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={importing || !files || files.length === 0}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? '导入中...' : '开始导入'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
