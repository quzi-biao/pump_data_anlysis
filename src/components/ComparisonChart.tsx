'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { AnalysisResult } from '@/types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Download, Settings, Plus, Trash2, Save } from 'lucide-react';
import { 
  ComparisonMetricStyle, 
  MonthMetricStyle, 
  LineStyle, 
  BackgroundZone, 
  ChartType 
} from '@/types/chart';

interface Props {
  result: AnalysisResult;
  chartType?: 'line' | 'bar';
  lineStyles?: Record<string, LineStyle>;
  backgroundZones?: BackgroundZone[];
  queryName?: string;
  onStylesChange?: (metricStyles: Record<string, ComparisonMetricStyle>) => void;
  canSaveStyles?: boolean;
  onSaveStyles?: () => void;
  savedMetricStyles?: Record<string, ComparisonMetricStyle>;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export default function ComparisonChart({ result, chartType, lineStyles, backgroundZones = [], queryName, onStylesChange, canSaveStyles, onSaveStyles, savedMetricStyles }: Props) {
  const { data, config } = result;
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 获取所有数值列（排除时间戳和对比组）
  const numericColumns = Object.keys(data[0] || {}).filter(
    key => key !== 'timestamp' && key !== 'comparisonGroup' && typeof data[0][key] === 'number'
  );

  // 获取对比组（月份）
  const comparisonGroups = Array.from(new Set(data.map(row => (row as any).comparisonGroup)));

  // 每个指标的样式配置状态
  const [metricStyles, setMetricStyles] = useState<Record<string, ComparisonMetricStyle>>(() => {
    const styles: Record<string, ComparisonMetricStyle> = {};
    numericColumns.forEach((col, index) => {
      if (savedMetricStyles?.[col]) {
        styles[col] = savedMetricStyles[col];
      } else {
        const monthStyles: Record<string, MonthMetricStyle> = {};
        comparisonGroups.forEach((group, groupIndex) => {
          monthStyles[group as string] = {
            color: DEFAULT_COLORS[(index * comparisonGroups.length + groupIndex) % DEFAULT_COLORS.length],
            thickness: 2,
            chartType: 'line',
            visible: true,
          };
        });
        styles[col] = {
          monthStyles,
          backgroundZones: [],
          chartHeight: 500,
          chartGroup: col,
        };
      }
    });
    return styles;
  });

  const [showSettingsFor, setShowSettingsFor] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(comparisonGroups[0] as string || '');
  const [localChartGroup, setLocalChartGroup] = useState<Record<string, string>>({});

  // 当保存的样式更新时，重新加载样式
  useEffect(() => {
    if (savedMetricStyles) {
      setMetricStyles(prevStyles => {
        const updatedStyles: Record<string, ComparisonMetricStyle> = { ...prevStyles };
        Object.keys(savedMetricStyles).forEach(col => {
          updatedStyles[col] = savedMetricStyles[col];
        });
        return updatedStyles;
      });
    }
  }, [savedMetricStyles]);

  // 更新指标样式
  const updateMetricStyle = (column: string, updates: Partial<ComparisonMetricStyle>) => {
    const newStyles = {
      ...metricStyles,
      [column]: { ...metricStyles[column], ...updates }
    };
    setMetricStyles(newStyles);
    if (onStylesChange) {
      onStylesChange(newStyles);
    }
  };

  // 更新特定月份的样式
  const updateMonthStyle = (column: string, month: string, updates: Partial<MonthMetricStyle>) => {
    const monthStyles = {
      ...metricStyles[column].monthStyles,
      [month]: { ...metricStyles[column].monthStyles[month], ...updates }
    };
    updateMetricStyle(column, { monthStyles });
  };

  // 添加背景区域
  const addZone = (column: string) => {
    const newZone: BackgroundZone = {
      id: Date.now().toString(),
      start: 0,
      end: chartData.length - 1,
      color: '#e0e0e0',
      label: `区域 ${metricStyles[column].backgroundZones.length + 1}`,
      showAverage: false,
      averageLineColor: '#ff0000',
    };
    updateMetricStyle(column, {
      backgroundZones: [...metricStyles[column].backgroundZones, newZone]
    });
  };

  // 更新背景区域
  const updateZone = (column: string, zoneId: string, updates: Partial<BackgroundZone>) => {
    const zones = metricStyles[column].backgroundZones.map(zone =>
      zone.id === zoneId ? { ...zone, ...updates } : zone
    );
    updateMetricStyle(column, { backgroundZones: zones });
  };

  // 删除背景区域
  const removeZone = (column: string, zoneId: string) => {
    const zones = metricStyles[column].backgroundZones.filter(zone => zone.id !== zoneId);
    updateMetricStyle(column, { backgroundZones: zones });
  };

  // 保存样式
  const handleSaveStyles = async () => {
    if (onSaveStyles) {
      setIsSaving(true);
      try {
        await onSaveStyles();
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 格式化时间戳用于 X 轴（对比模式：只显示日期部分）
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (result.comparisonType === 'month') {
      if (config.timeDimension === 'minute') {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      } else if (config.timeDimension === 'hour') {
        return `${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}时`;
      } else {
        return `${date.getDate()}日`;
      }
    }
    
    // 按日对比
    if (config.timeDimension === 'minute') {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (config.timeDimension === 'hour') {
      return `${String(date.getHours()).padStart(2, '0')}时`;
    } else {
      return `${date.getMonth() + 1}-${date.getDate()}`;
    }
  };

  // 移除异常大值和小值的函数（使用IQR方法）
  const removeOutliers = (data: any[], column: string) => {
    const values = data
      .map(row => row[column])
      .filter(val => typeof val === 'number' && !isNaN(val))
      .sort((a, b) => a - b);
    
    if (values.length < 4) return data; // 数据太少，不过滤
    
    // 计算四分位数
    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;
    
    // 定义异常值边界（上下界都过滤，系数为50）
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // 过滤异常值
    return data.map(row => {
      const value = row[column];
      if (typeof value === 'number' && (value < lowerBound || value > upperBound)) {
        // 将异常值替换为null，这样图表会跳过这个点
        return { ...row, [column]: null };
      }
      return row;
    });
  };

  // 准备图表数据（先定义变量，后面会赋值）
  let chartData: Array<Record<string, any>> = data.map(row => ({
    ...row,
    displayTime: formatTimestamp(row.timestamp as string),
    dayOfMonth: new Date(row.timestamp as string).getDate(),
  }));

  // 对每个数值列移除异常值
  numericColumns.forEach(column => {
    chartData = removeOutliers(chartData, column);
  });
  
  // 过滤0值点，将0替换为null使其不在曲线上显示
  chartData = chartData.map(row => {
    const newRow = { ...row };
    numericColumns.forEach(column => {
      if (newRow[column] === 0) {
        newRow[column] = null;
      }
    });
    return newRow;
  });

  // 如果是按月对比且时间维度是天，需要重组数据结构
  if (result.comparisonType === 'month' && config.timeDimension === 'day') {
    // 创建1-31日的完整横坐标，每个日期包含所有对比组的数据
    const allDays = Array.from({ length: 31 }, (_, i) => i + 1);
    const restructuredData: any[] = [];
    
    allDays.forEach(day => {
      const dayData: any = {
        displayTime: `${day}日`,
        dayOfMonth: day,
      };
      
      // 为每个对比组添加该日期的数据
      comparisonGroups.forEach(group => {
        const groupDayData = chartData.find(
          row => (row as any).comparisonGroup === group && row.dayOfMonth === day
        );
        
        if (groupDayData) {
          // 将该组的所有指标数据添加到这一天的记录中
          numericColumns.forEach(column => {
            dayData[`${column}_${group}`] = (groupDayData as any)[column];
          });
        }
      });
      
      // 只添加至少有一个对比组有数据的日期
      const hasData = comparisonGroups.some(group => 
        numericColumns.some(column => dayData[`${column}_${group}`] !== undefined)
      );
      
      if (hasData) {
        restructuredData.push(dayData);
      }
    });
    
    chartData = restructuredData;
  }

  // 计算每个区域每个指标的平均值
  const calculateZoneAverage = (column: string, zone: BackgroundZone): number | null => {
    const zoneData = chartData.slice(zone.start, zone.end + 1);
    
    // 对于对比模式，需要计算所有对比组的平均值
    if (result.comparisonType === 'month' && config.timeDimension === 'day') {
      // 收集所有对比组的数据
      const allValues: number[] = [];
      comparisonGroups.forEach(group => {
        const dataKey = `${column}_${group}`;
        const values = zoneData
          .map(row => row[dataKey])
          .filter(val => typeof val === 'number' && !isNaN(val) && val !== null);
        allValues.push(...values);
      });
      
      if (allValues.length === 0) return null;
      const sum = allValues.reduce((acc, val) => acc + val, 0);
      return sum / allValues.length;
    } else {
      // 其他模式直接计算
      const values = zoneData
        .map(row => row[column])
        .filter(val => typeof val === 'number' && !isNaN(val) && val !== null);
      
      if (values.length === 0) return null;
      const sum = values.reduce((acc, val) => acc + val, 0);
      return sum / values.length;
    }
  };

  // 导出单个图表为PNG
  const exportChartToPNG = async (column: string) => {
    const chartElement = chartRefs.current[column];
    if (!chartElement) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = queryName 
        ? `${queryName}_${column}_${timestamp}.png`
        : `${column}_${timestamp}.png`;
      
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('导出PNG失败:', error);
      alert('导出失败，请重试');
    }
  };

  // 按 chartGroup 分组指标
  const groupedMetrics = useMemo(() => {
    const groups: Record<string, string[]> = {};
    numericColumns.forEach(col => {
      const groupName = metricStyles[col]?.chartGroup || col;
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(col);
    });
    return groups;
  }, [numericColumns, metricStyles]);

  return (
    <div className="space-y-8">
      {/* Save Styles Button */}
      {canSaveStyles && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveStyles}
            disabled={isSaving}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? '保存中...' : '保存所有样式'}
          </button>
        </div>
      )}

      {Object.entries(groupedMetrics).map(([groupName, columns]) => {
        const firstColumn = columns[0];
        const currentStyle = metricStyles[firstColumn];
        const isGrouped = columns.length > 1;
        
        return (
          <div key={groupName} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-gray-900">
                  {isGrouped ? `${groupName} (${columns.length}个指标)` : firstColumn}
                </h3>
                <button
                  onClick={() => setShowSettingsFor(showSettingsFor === groupName ? null : groupName)}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                  title="样式设置"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => exportChartToPNG(groupName)}
                className="px-2 py-1 text-xs rounded flex items-center bg-green-600 text-white hover:bg-green-700"
              >
                <Download className="w-3 h-3 mr-1" />
                保存PNG
              </button>
            </div>

            {/* Style Settings Panel */}
            {showSettingsFor === groupName && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-4">
                {/* Metrics in this group */}
                {columns.map(column => {
                  const colStyle = metricStyles[column];
                  return (
                    <div key={column} className="border-b pb-3 last:border-b-0">
                      <h4 className="text-sm font-medium text-gray-800 mb-2">{column}</h4>
                      
                      {/* Chart Group */}
                      <div className="mb-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-700 whitespace-nowrap">图表分组:</label>
                          <input
                            type="text"
                            value={localChartGroup[column] ?? colStyle.chartGroup ?? column}
                            onChange={(e) => setLocalChartGroup({ ...localChartGroup, [column]: e.target.value })}
                            onBlur={(e) => {
                              updateMetricStyle(column, { chartGroup: e.target.value });
                              const newLocal = { ...localChartGroup };
                              delete newLocal[column];
                              setLocalChartGroup(newLocal);
                            }}
                            placeholder="输入分组名称"
                            className="px-2 py-1 text-xs border rounded flex-1"
                          />
                        </div>
                      </div>

                      {/* Month Selector */}
                      <div className="mb-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-700 whitespace-nowrap">选择月份:</label>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-2 py-1 text-xs border rounded bg-white flex-1"
                          >
                            {comparisonGroups.map(group => (
                              <option key={group} value={group as string}>{group}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {selectedMonth && colStyle.monthStyles[selectedMonth] && (
                        <div className="space-y-2 pl-2">
                          {/* Visibility, Chart Type, Color, Thickness in one row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={colStyle.monthStyles[selectedMonth].visible}
                                onChange={(e) => updateMonthStyle(column, selectedMonth, { visible: e.target.checked })}
                                className="w-3 h-3 rounded"
                              />
                              <span className="text-xs text-gray-700">显示</span>
                            </label>
                            
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600">类型:</span>
                              <select
                                value={colStyle.monthStyles[selectedMonth].chartType}
                                onChange={(e) => updateMonthStyle(column, selectedMonth, { chartType: e.target.value as ChartType })}
                                className="px-2 py-1 text-xs border rounded bg-white"
                              >
                                <option value="line">折线</option>
                                <option value="bar">柱状</option>
                                <option value="area">面积</option>
                              </select>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600">颜色:</span>
                              <input
                                type="color"
                                value={colStyle.monthStyles[selectedMonth].color}
                                onChange={(e) => updateMonthStyle(column, selectedMonth, { color: e.target.value })}
                                className="w-8 h-6 rounded cursor-pointer"
                              />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">粗细:</span>
                              <input
                                type="range"
                                min="1"
                                max="5"
                                value={colStyle.monthStyles[selectedMonth].thickness}
                                onChange={(e) => updateMonthStyle(column, selectedMonth, { thickness: Number(e.target.value) })}
                                className="w-24"
                              />
                              <span className="text-xs text-gray-500">{colStyle.monthStyles[selectedMonth].thickness}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Chart Height */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    图表高度: {currentStyle.chartHeight || 500}px
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="800"
                    step="50"
                    value={currentStyle.chartHeight || 500}
                    onChange={(e) => {
                      columns.forEach(col => updateMetricStyle(col, { chartHeight: Number(e.target.value) }));
                    }}
                    className="w-full"
                  />
                </div>

                {/* Background Zones */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-medium text-gray-700">背景区域</label>
                    <button
                      onClick={() => addZone(firstColumn)}
                      className="flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      添加区域
                    </button>
                  </div>
                  
                  {currentStyle.backgroundZones.map((zone) => (
                    <div key={zone.id} className="bg-white border rounded p-2">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={zone.label}
                          onChange={(e) => updateZone(firstColumn, zone.id, { label: e.target.value })}
                          className="px-2 py-1 text-xs border rounded flex-1"
                          placeholder="区域名称"
                        />
                        <input
                          type="number"
                          value={zone.start}
                          onChange={(e) => updateZone(firstColumn, zone.id, { start: Number(e.target.value) })}
                          className="px-2 py-1 text-xs border rounded w-20"
                          placeholder="起始"
                          min={0}
                          max={chartData.length - 1}
                        />
                        <input
                          type="number"
                          value={zone.end}
                          onChange={(e) => updateZone(firstColumn, zone.id, { end: Number(e.target.value) })}
                          className="px-2 py-1 text-xs border rounded w-20"
                          placeholder="结束"
                          min={zone.start}
                          max={chartData.length - 1}
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-600">颜色:</span>
                          <input
                            type="color"
                            value={zone.color}
                            onChange={(e) => updateZone(firstColumn, zone.id, { color: e.target.value })}
                            className="w-8 h-6 rounded cursor-pointer"
                          />
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap" title="显示区域平均值线">
                          <input
                            type="checkbox"
                            checked={zone.showAverage || false}
                            onChange={(e) => updateZone(firstColumn, zone.id, { showAverage: e.target.checked })}
                            className="w-3 h-3 rounded"
                          />
                          <span className="text-[10px] text-gray-600">平均线</span>
                        </label>
                        {zone.showAverage && (
                          <input
                            type="color"
                            value={zone.averageLineColor || '#ff0000'}
                            onChange={(e) => updateZone(firstColumn, zone.id, { averageLineColor: e.target.value })}
                            className="w-8 h-6 rounded cursor-pointer"
                            title="平均线颜色"
                          />
                        )}
                        <button
                          onClick={() => removeZone(firstColumn, zone.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                          title="删除区域"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={(el) => { chartRefs.current[groupName] = el; }}>
              <ResponsiveContainer width="100%" height={currentStyle.chartHeight || 500}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="displayTime"
                    tick={{ fontSize: 11 }}
                    angle={result.comparisonType === 'month' ? 0 : -45}
                    textAnchor={result.comparisonType === 'month' ? 'middle' : 'end'}
                    height={result.comparisonType === 'month' ? 60 : 80}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any) => 
                      typeof value === 'number' ? value.toFixed(4) : value
                    }
                  />
                  <Legend />
                  
                  {/* Background Zones */}
                  {currentStyle.backgroundZones.map((zone) => (
                    <ReferenceArea
                      key={zone.id}
                      x1={chartData[zone.start]?.displayTime}
                      x2={chartData[zone.end]?.displayTime}
                      fill={zone.color}
                      fillOpacity={0.3}
                      label={{ value: zone.label, position: 'top', fontSize: 10 }}
                    />
                  ))}
                  
                  {/* Average Lines for Zones */}
                  {currentStyle.backgroundZones.map((zone) => {
                    if (!zone.showAverage) return null;
                    const average = calculateZoneAverage(firstColumn, zone);
                    if (average === null) return null;
                    
                    return (
                      <ReferenceLine
                        key={`avg-${zone.id}`}
                        y={average}
                        stroke={zone.averageLineColor || '#ff0000'}
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `${zone.label} 平均: ${average.toFixed(4)}`,
                          position: 'right',
                          fontSize: 10,
                          fill: zone.averageLineColor || '#ff0000'
                        }}
                      />
                    );
                  })}
                  
                  {/* Render all columns in this group */}
                  {columns.map(column => {
                    const colStyle = metricStyles[column];
                    
                    return comparisonGroups.map((group) => {
                      const monthStyle = colStyle.monthStyles[group as string];
                      
                      if (!monthStyle || monthStyle.visible === false) {
                        return null;
                      }
                      
                      const dataKey = (result.comparisonType === 'month' && config.timeDimension === 'day')
                        ? `${column}_${group}`
                        : column;
                      
                      const groupColor = monthStyle.color;
                      const strokeWidth = monthStyle.thickness;
                      const displayName = isGrouped ? `${column} - ${group}` : `${group}`;
                      
                      // Render based on chart type
                      if (monthStyle.chartType === 'line') {
                        if (result.comparisonType === 'month' && config.timeDimension === 'day') {
                          return (
                            <Line
                              key={`${column}-${group}`}
                              type="monotone"
                              dataKey={dataKey}
                              stroke={groupColor}
                              name={displayName}
                              dot={false}
                              strokeWidth={strokeWidth}
                              connectNulls={true}
                            />
                          );
                        } else {
                          const lineData = chartData.filter(row => (row as any).comparisonGroup === group);
                          return (
                            <Line
                              key={`${column}-${group}`}
                              data={lineData}
                              type="monotone"
                              dataKey={dataKey}
                              stroke={groupColor}
                              name={displayName}
                              dot={false}
                              strokeWidth={strokeWidth}
                              connectNulls={true}
                            />
                          );
                        }
                      } else if (monthStyle.chartType === 'bar') {
                        return (
                          <Bar
                            key={`${column}-${group}`}
                            dataKey={dataKey}
                            fill={groupColor}
                            name={displayName}
                          />
                        );
                      } else if (monthStyle.chartType === 'area') {
                        if (result.comparisonType === 'month' && config.timeDimension === 'day') {
                          return (
                            <Area
                              key={`${column}-${group}`}
                              type="monotone"
                              dataKey={dataKey}
                              fill={groupColor}
                              stroke={groupColor}
                              name={displayName}
                              fillOpacity={0.3}
                              strokeWidth={strokeWidth}
                              connectNulls={true}
                            />
                          );
                        } else {
                          const areaData = chartData.filter(row => (row as any).comparisonGroup === group);
                          return (
                            <Area
                              key={`${column}-${group}`}
                              data={areaData}
                              type="monotone"
                              dataKey={dataKey}
                              fill={groupColor}
                              stroke={groupColor}
                              name={displayName}
                              fillOpacity={0.3}
                              strokeWidth={strokeWidth}
                              connectNulls={true}
                            />
                          );
                        }
                      }
                      return null;
                    });
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
