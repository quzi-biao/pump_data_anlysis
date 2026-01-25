'use client';

import { AnalysisResult } from '@/types';
import { Download } from 'lucide-react';

interface Props {
  result: AnalysisResult;
}

export default function DataTable({ result }: Props) {
  const { data, config } = result;

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无数据
      </div>
    );
  }

  // 获取所有列名
  const columns = Object.keys(data[0]).filter(key => key !== 'comparisonGroup');
  const hasComparisonGroup = 'comparisonGroup' in data[0];

  // 导出 CSV
  const exportCSV = () => {
    const headers = columns.join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col];
        return typeof value === 'number' ? value.toFixed(4) : value;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${config.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {hasComparisonGroup && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  对比组
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column === 'timestamp' ? '时间' : column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {hasComparisonGroup && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white">
                    {(row as any).comparisonGroup}
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {column === 'timestamp'
                      ? config.timeDimension === 'day'
                        ? new Date(row[column] as string).toLocaleDateString('zh-CN')
                        : new Date(row[column] as string).toLocaleString('zh-CN')
                      : typeof row[column] === 'number'
                      ? (row[column] as number).toFixed(4)
                      : row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Info */}
      <div className="text-sm text-gray-500 text-center">
        共 {data.length} 条记录
      </div>
    </div>
  );
}
