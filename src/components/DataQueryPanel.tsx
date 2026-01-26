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
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentChartStyles, setCurrentChartStyles] = useState<any>(null);
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);

  // 从数据库加载已保存的查询
  useEffect(() => {
    loadSavedQueries();
  }, []);

  const loadSavedQueries = async () => {
    try {
      const response = await fetch('/api/saved-queries');
      const result = await response.json();
      if (result.success) {
        const queries = result.data.map((q: any) => {
          const params = typeof q.query_params === 'string' 
            ? JSON.parse(q.query_params) 
            : q.query_params;
          
          const chartStyles = q.chart_styles 
            ? (typeof q.chart_styles === 'string' ? JSON.parse(q.chart_styles) : q.chart_styles)
            : null;
          
          return {
            id: q.id.toString(),
            name: q.name,
            configId: q.config_id,
            startTime: params.startTime || '',
            endTime: params.endTime || '',
            comparisonType: params.comparisonType || 'none',
            selectedMonths: params.selectedMonths || [],
            chartStyles,
            savedAt: q.created_at,
          };
        });
        setSavedQueries(queries);
      }
    } catch (error) {
      console.error('加载保存的查询失败:', error);
    }
  };

  // 保存查询到数据库
  const saveQuery = async (name: string) => {
    if (!selectedConfigId) {
      alert('请选择分析配置');
      return;
    }

    if (selectedMonths.length === 0 && (!startTime || !endTime)) {
      alert('请完善查询条件');
      return;
    }

    try {
      const queryParams = {
        startTime,
        endTime,
        comparisonType,
        selectedMonths: selectedMonths.length > 0 ? selectedMonths : undefined,
      };

      const response = await fetch('/api/saved-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          configId: selectedConfigId,
          queryParams,
          chartStyles: currentChartStyles,
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
    setSelectedMonths(query.selectedMonths || []);
    setCurrentQueryId(query.id);
    // 加载保存的图表样式
    if (query.chartStyles) {
      setCurrentChartStyles(query.chartStyles);
    }
  };

  // 保存图表样式到数据库
  const saveChartStyles = async () => {
    if (!currentQueryId) {
      alert('当前没有关联的已保存查询');
      return;
    }

    try {
      const response = await fetch('/api/saved-queries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentQueryId,
          chartStyles: currentChartStyles,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('样式已保存');
        loadSavedQueries(); // 重新加载列表
      } else {
        alert('保存失败：' + result.error);
      }
    } catch (error) {
      alert('保存失败');
      console.error(error);
    }
  };

  // 直接执行已保存的查询
  const queryDirect = async (query: SavedQuery) => {
    // 先加载查询参数和图表样式
    loadQuery(query);
    
    // 等待状态更新后执行查询
    setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        let queryStartTime: string;
        let queryEndTime: string;
        let queryComparisonType = query.comparisonType;

        if (query.selectedMonths && query.selectedMonths.length > 0) {
          // 月份选择模式
          const sortedMonths = [...query.selectedMonths].sort();
          const firstMonth = new Date(sortedMonths[0] + '-01');
          const lastMonth = new Date(sortedMonths[sortedMonths.length - 1] + '-01');
          lastMonth.setMonth(lastMonth.getMonth() + 1);
          lastMonth.setDate(0);
          
          queryStartTime = firstMonth.toISOString();
          queryEndTime = lastMonth.toISOString();
        } else {
          // 时间范围模式
          queryStartTime = new Date(query.startTime).toISOString();
          queryEndTime = new Date(query.endTime).toISOString();
        }

        const params: QueryParams = {
          analysisId: query.configId,
          startTime: queryStartTime,
          endTime: queryEndTime,
          comparisonType: queryComparisonType,
          selectedMonths: query.selectedMonths && query.selectedMonths.length > 0 ? query.selectedMonths : undefined,
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
    }, 100);
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

    // 验证时间选择
    if (selectedMonths.length === 0 && (!startTime || !endTime)) {
      alert('请选择时间范围或月份');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let queryStartTime: string;
      let queryEndTime: string;
      let queryComparisonType = comparisonType;

      if (selectedMonths.length > 0) {
        // 月份选择模式
        const sortedMonths = [...selectedMonths].sort();
        const firstMonth = new Date(sortedMonths[0] + '-01');
        const lastMonth = new Date(sortedMonths[sortedMonths.length - 1] + '-01');
        lastMonth.setMonth(lastMonth.getMonth() + 1);
        lastMonth.setDate(0); // 设置为月末
        
        queryStartTime = firstMonth.toISOString();
        queryEndTime = lastMonth.toISOString();
        // 不强制设置对比类型，使用用户选择的 comparisonType
      } else {
        // 时间范围模式
        queryStartTime = new Date(startTime).toISOString();
        queryEndTime = new Date(endTime).toISOString();
      }

      const params: QueryParams = {
        analysisId: selectedConfigId,
        startTime: queryStartTime,
        endTime: queryEndTime,
        comparisonType: queryComparisonType,
        selectedMonths: selectedMonths.length > 0 ? selectedMonths : undefined,
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
          selectedMonths={selectedMonths}
          onConfigChange={setSelectedConfigId}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onComparisonTypeChange={setComparisonType}
          onSelectedMonthsChange={setSelectedMonths}
          onQuery={handleQuery}
          onSave={() => setShowSaveDialog(true)}
        />
        
        <SavedQueriesList
          queries={savedQueries}
          configs={configs}
          onLoad={loadQuery}
          onQueryDirect={queryDirect}
          onDelete={deleteQuery}
        />
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 overflow-y-auto">
        <QueryResult
          result={result}
          error={error}
          chartStyles={currentChartStyles}
          onExportCSV={exportToCSV}
          onChartStylesChange={setCurrentChartStyles}
          canSaveStyles={!!currentQueryId}
          onSaveStyles={saveChartStyles}
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
