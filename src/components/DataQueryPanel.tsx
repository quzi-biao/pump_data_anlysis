'use client';

import { useState, useEffect } from 'react';
import { AnalysisConfig, QueryParams, AnalysisResult, ComparisonType } from '@/types';
import QueryForm from './QueryForm';
import SavedQueriesList, { SavedQuery } from './SavedQueriesList';
import SaveQueryDialog from './SaveQueryDialog';
import QueryResult from './QueryResult';

interface Props {
  configs: AnalysisConfig[];
}

export default function DataQueryPanel({ configs }: Props) {
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [comparisonType, setComparisonType] = useState<ComparisonType>('none');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // 从数据库加载已保存的查询
  useEffect(() => {
    loadSavedQueries();
  }, []);

  const loadSavedQueries = async () => {
    try {
      const response = await fetch('/api/saved-queries');
      const result = await response.json();
      if (result.success) {
        const queries = result.data.map((q: any) => ({
          id: q.id.toString(),
          name: q.name,
          configId: q.config_id,
          startTime: q.start_time,
          endTime: q.end_time,
          comparisonType: q.comparison_type,
          savedAt: q.created_at,
        }));
        setSavedQueries(queries);
      }
    } catch (error) {
      console.error('加载保存的查询失败:', error);
    }
  };

  // 保存查询到数据库
  const saveQuery = async (name: string) => {
    if (!selectedConfigId || !startTime || !endTime) {
      alert('请完善查询条件');
      return;
    }

    try {
      const response = await fetch('/api/saved-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          configId: selectedConfigId,
          startTime,
          endTime,
          comparisonType,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowSaveDialog(false);
        alert('查询已保存');
        loadSavedQueries(); // 重新加载列表
      } else {
        alert('保存失败：' + result.error);
      }
    } catch (error) {
      alert('保存失败');
      console.error(error);
    }
  };

  // 加载已保存的查询
  const loadQuery = (query: SavedQuery) => {
    setSelectedConfigId(query.configId);
    setStartTime(query.startTime);
    setEndTime(query.endTime);
    setComparisonType(query.comparisonType);
  };

  // 删除已保存的查询
  const deleteQuery = async (id: string) => {
    if (!confirm('确定要删除此查询吗？')) return;
    
    try {
      const response = await fetch(`/api/saved-queries?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        loadSavedQueries(); // 重新加载列表
      } else {
        alert('删除失败：' + result.error);
      }
    } catch (error) {
      alert('删除失败');
      console.error(error);
    }
  };

  const handleQuery = async () => {
    if (!selectedConfigId) {
      alert('请选择分析配置');
      return;
    }

    if (!startTime || !endTime) {
      alert('请选择时间范围');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: QueryParams = {
        analysisId: selectedConfigId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        comparisonType,
      };

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const apiResult = await response.json();

      if (apiResult.success) {
        setResult(apiResult.data);
      } else {
        setError(apiResult.error || '查询失败');
      }
    } catch (err) {
      setError('查询失败，请检查网络连接');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedConfig = configs.find(c => c.id === selectedConfigId);

  // 导出 CSV
  const exportToCSV = () => {
    if (!result) return;

    // 获取所有列名
    const columns = Object.keys(result.data[0] || {});
    
    // 生成 CSV 内容
    const csvContent = [
      // 表头
      columns.join(','),
      // 数据行
      ...result.data.map(row => 
        columns.map(col => {
          const value = row[col];
          // 处理包含逗号或换行的值
          if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // 创建 Blob 并下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `查询结果_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Left Panel - Query Form */}
      <div className="w-96 flex-shrink-0 space-y-6 overflow-y-auto">
        <QueryForm
          configs={configs}
          selectedConfigId={selectedConfigId}
          startTime={startTime}
          endTime={endTime}
          comparisonType={comparisonType}
          loading={loading}
          onConfigChange={setSelectedConfigId}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onComparisonTypeChange={setComparisonType}
          onQuery={handleQuery}
          onSave={() => setShowSaveDialog(true)}
        />
        
        <SavedQueriesList
          queries={savedQueries}
          configs={configs}
          onLoad={loadQuery}
          onDelete={deleteQuery}
        />
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 overflow-y-auto">
        <QueryResult
          result={result}
          error={error}
          onExportCSV={exportToCSV}
        />
      </div>

      {/* Save Query Dialog */}
      <SaveQueryDialog
        show={showSaveDialog}
        onSave={saveQuery}
        onCancel={() => setShowSaveDialog(false)}
      />
    </div>
  );
}
