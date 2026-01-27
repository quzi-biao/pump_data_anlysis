'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { AnalysisResult } from '@/types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
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

interface LineStyle {
  color: string;
  thickness: number;
}

interface BackgroundZone {
  id: string;
  start: number;
  end: number;
  color: string;
  label: string;
  showAverage?: boolean; // 是否显示区域内的平均值线
  averageLineColor?: string; // 平均值线的颜色
}

type ChartType = 'line' | 'bar' | 'area' | 'scatter';

interface MetricStyle {
  color: string;
  thickness: number;
  backgroundZones: BackgroundZone[];
  chartType: ChartType;
  visible: boolean;
  chartGroup?: string; // 用于将多个指标组合到同一张图表
  chartHeight?: number; // 图表高度（像素）
}

interface Props {
  result: AnalysisResult;
  chartType?: 'line' | 'bar'; // 保留用于兼容，但不再使用
  lineStyles?: Record<string, LineStyle>;
  backgroundZones?: BackgroundZone[];
  queryName?: string;
  onStylesChange?: (metricStyles: Record<string, MetricStyle>) => void;
  canSaveStyles?: boolean;
  onSaveStyles?: () => void;
  savedMetricStyles?: Record<string, MetricStyle>;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export default function NormalChart({ result, chartType, lineStyles, backgroundZones = [], queryName, onStylesChange, canSaveStyles, onSaveStyles, savedMetricStyles }: Props) {
  const { data, config } = result;
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 获取所有数值列（排除时间戳）
  const numericColumns = Object.keys(data[0] || {}).filter(
    key => key !== 'timestamp' && typeof data[0][key] === 'number'
  );

  // 每个指标的样式配置状态
  const [metricStyles, setMetricStyles] = useState<Record<string, MetricStyle>>(() => {
    const styles: Record<string, MetricStyle> = {};
    numericColumns.forEach((col, index) => {
      // 优先使用保存的样式，否则使用默认样式
      if (savedMetricStyles?.[col]) {
        styles[col] = savedMetricStyles[col];
      } else {
        styles[col] = {
          color: lineStyles?.[col]?.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          thickness: lineStyles?.[col]?.thickness || 2,
          backgroundZones: [],
          chartType: 'line',
          visible: true,
          chartGroup: col, // 默认每个指标独立成图
          chartHeight: 500, // 默认高度
        };
      }
    });
    return styles;
  });

  // 显示设置面板的指标
  const [showSettingsFor, setShowSettingsFor] = useState<string | null>(null);
  
  // 本地输入状态，避免受控组件问题
  const [localChartGroup, setLocalChartGroup] = useState<Record<string, string>>({});

  // 当保存的样式更新时，重新加载样式
  useEffect(() => {
    if (savedMetricStyles) {
      setMetricStyles(prevStyles => {
        const updatedStyles: Record<string, MetricStyle> = { ...prevStyles };
        Object.keys(savedMetricStyles).forEach(col => {
          updatedStyles[col] = savedMetricStyles[col];
        });
        return updatedStyles;
      });
    }
  }, [savedMetricStyles]);

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

  // 更新指标样式
  const updateMetricStyle = (column: string, updates: Partial<MetricStyle>) => {
    const newStyles = {
      ...metricStyles,
      [column]: { ...metricStyles[column], ...updates }
    };
    setMetricStyles(newStyles);
    if (onStylesChange) {
      onStylesChange(newStyles);
    }
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

  // 格式化时间戳用于 X 轴
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (config.timeDimension === 'minute') {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (config.timeDimension === 'hour') {
      return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit' });
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
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
    
    // 定义异常值边界（上下界都过滤，系数为5）
    const lowerBound = q1 - 50 * iqr;
    const upperBound = q3 + 50 * iqr;
    
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

  // 准备图表数据
  let chartData: Array<Record<string, any>> = data.map(row => ({
    ...row,
    displayTime: formatTimestamp(row.timestamp as string),
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

  // 计算每个区域每个指标的平均值
  const calculateZoneAverage = (column: string, zone: BackgroundZone): number | null => {
    const zoneData = chartData.slice(zone.start, zone.end + 1);
    const values = zoneData
      .map(row => row[column])
      .filter(val => typeof val === 'number' && !isNaN(val) && val !== null);
    
    if (values.length === 0) return null;
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
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
  const chartGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    numericColumns.forEach(col => {
      const style = metricStyles[col];
      if (style?.visible !== false) {
        const groupName = style?.chartGroup || col;
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(col);
      }
    });
    return groups;
  }, [numericColumns, metricStyles]);

  return (
    <div className="space-y-4">
      {/* Save Button */}
      {canSaveStyles && onSaveStyles && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveStyles}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3" />
            {isSaving ? '保存中...' : '保存所有样式'}
          </button>
        </div>
      )}
      <div className="space-y-8">
      {Object.entries(chartGroups).map(([groupName, columns]) => {
        // 获取该组的第一个指标的背景区域（组内共享）
        const groupBackgroundZones = metricStyles[columns[0]]?.backgroundZones || [];
        const isMultiMetric = columns.length > 1;
        
        return (
        <div key={groupName} className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{groupName}</h3>
              {isMultiMetric && (
                <div className="text-xs text-gray-500 mt-1">
                  包含指标: {columns.join(', ')}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {columns.map(col => (
                <button
                  key={col}
                  onClick={() => setShowSettingsFor(showSettingsFor === col ? null : col)}
                  className={`px-2 py-1 text-xs rounded flex items-center ${
                    showSettingsFor === col
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={`配置 ${col}`}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  {isMultiMetric ? col : '样式'}
                </button>
              ))}
              <button
                onClick={() => exportChartToPNG(groupName)}
                className="px-2 py-1 text-xs rounded flex items-center bg-green-600 text-white hover:bg-green-700"
              >
                <Download className="w-3 h-3 mr-1" />
                保存PNG
              </button>
            </div>
          </div>

          {/* Style Settings Panels */}
          {columns.map(column => {
            const currentStyle = metricStyles[column];
            return showSettingsFor === column && (
            <div key={column} className="bg-gray-50 border rounded p-3 mb-3">
              <div className="space-y-3">
                {/* Visibility and Chart Type */}
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">基础设置</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`visible-${column}`}
                        checked={currentStyle.visible}
                        onChange={(e) => updateMetricStyle(column, { visible: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor={`visible-${column}`} className="text-xs text-gray-700 cursor-pointer">
                        显示此指标
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">图表类型:</span>
                      <select
                        value={currentStyle.chartType}
                        onChange={(e) => updateMetricStyle(column, { chartType: e.target.value as ChartType })}
                        className="px-2 py-1 text-xs border rounded bg-white flex-1"
                      >
                        <option value="line">折线图</option>
                        <option value="bar">柱状图</option>
                        <option value="area">面积图</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Chart Group */}
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">图表分组 (当前: {currentStyle.chartGroup || column})</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">组名:</span>
                      <input
                        type="text"
                        value={localChartGroup[column] ?? (currentStyle.chartGroup || '')}
                        onChange={(e) => {
                          setLocalChartGroup(prev => ({
                            ...prev,
                            [column]: e.target.value
                          }));
                        }}
                        onBlur={(e) => {
                          updateMetricStyle(column, { chartGroup: e.target.value || column });
                          setLocalChartGroup(prev => {
                            const newState = { ...prev };
                            delete newState[column];
                            return newState;
                          });
                        }}
                        onFocus={(e) => {
                          setLocalChartGroup(prev => ({
                            ...prev,
                            [column]: currentStyle.chartGroup || ''
                          }));
                        }}
                        className="px-2 py-1 text-xs border rounded bg-white flex-1"
                        placeholder={`留空使用默认值: ${column}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">高度:</span>
                      <input
                        type="number"
                        value={currentStyle.chartHeight || 500}
                        onChange={(e) => updateMetricStyle(column, { chartHeight: Number(e.target.value) })}
                        className="px-2 py-1 text-xs border rounded bg-white w-20"
                        placeholder="500"
                        min={200}
                        max={1200}
                        step={50}
                      />
                      <span className="text-[10px] text-gray-500">px</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    提示：将多个指标设置为相同的组名，它们会合并显示在一张图表中
                  </div>
                </div>

                {/* Line Style */}
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">样式设置</div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">颜色:</span>
                      <input
                        type="color"
                        value={currentStyle.color}
                        onChange={(e) => updateMetricStyle(column, { color: e.target.value })}
                        className="w-10 h-7 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">粗细:</span>
                      <select
                        value={currentStyle.thickness}
                        onChange={(e) => updateMetricStyle(column, { thickness: Number(e.target.value) })}
                        className="px-2 py-1 text-xs border rounded bg-white"
                      >
                        <option value="1">细</option>
                        <option value="2">中</option>
                        <option value="3">粗</option>
                        <option value="4">很粗</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Background Zones */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-medium text-gray-700">背景区域</div>
                    <button
                      onClick={() => addZone(column)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3" />
                      添加区域
                    </button>
                  </div>
                  {currentStyle.backgroundZones.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-500">
                      暂无背景区域
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentStyle.backgroundZones.map((zone) => (
                        <div key={zone.id} className="bg-white border rounded p-2">
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={zone.label}
                              onChange={(e) => updateZone(column, zone.id, { label: e.target.value })}
                              className="px-2 py-1 text-xs border rounded flex-1"
                              placeholder="区域名称"
                            />
                            <input
                              type="number"
                              value={zone.start}
                              onChange={(e) => updateZone(column, zone.id, { start: Number(e.target.value) })}
                              className="px-2 py-1 text-xs border rounded w-20"
                              placeholder="起始"
                              min={0}
                              max={zone.end}
                            />
                            <input
                              type="number"
                              value={zone.end}
                              onChange={(e) => updateZone(column, zone.id, { end: Number(e.target.value) })}
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
                                onChange={(e) => updateZone(column, zone.id, { color: e.target.value })}
                                className="w-8 h-6 rounded cursor-pointer"
                              />
                            </div>
                            <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap" title="显示区域平均值线">
                              <input
                                type="checkbox"
                                checked={zone.showAverage || false}
                                onChange={(e) => updateZone(column, zone.id, { showAverage: e.target.checked })}
                                className="w-3 h-3 rounded"
                              />
                              <span className="text-[10px] text-gray-600">平均线</span>
                            </label>
                            {zone.showAverage && (
                              <input
                                type="color"
                                value={zone.averageLineColor || '#ff0000'}
                                onChange={(e) => updateZone(column, zone.id, { averageLineColor: e.target.value })}
                                className="w-8 h-6 rounded cursor-pointer"
                                title="平均线颜色"
                              />
                            )}
                            <button
                              onClick={() => removeZone(column, zone.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                              title="删除区域"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
          })}
          <div ref={(el) => { chartRefs.current[groupName] = el; }} className="pt-4">
            <ResponsiveContainer width="100%" height={metricStyles[columns[0]]?.chartHeight || 500}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="displayTime"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => 
                    typeof value === 'number' ? value.toFixed(4) : value
                  }
                  labelFormatter={(label) => `时间: ${label}`}
                />
                <Legend />
                {/* Background Zones */}
                {groupBackgroundZones.map((zone) => (
                  <ReferenceArea
                    key={zone.id}
                    x1={chartData[zone.start]?.displayTime}
                    x2={chartData[zone.end]?.displayTime}
                    fill={zone.color}
                    fillOpacity={0.3}
                    label={{ value: zone.label, position: 'top', fontSize: 10 }}
                  />
                ))}
                {/* Zone Average Lines - for each metric in group */}
                {columns.map(col => {
                  const style = metricStyles[col]||[];
                  return style.backgroundZones.map((zone) => {
                    if (!zone.showAverage) return null;
                    const avg = calculateZoneAverage(col, zone);
                    if (avg === null) return null;
                    
                    return (
                      <ReferenceLine
                        key={`${col}-${zone.id}-avg`}
                        y={avg}
                        stroke={zone.averageLineColor || zone.color}
                        strokeDasharray="5 5"
                        strokeWidth={3}
                        label={{
                          value: `${col} ${zone.label}: ${avg.toFixed(2)}`,
                          position: 'top',
                          fontSize: 12,
                          fill: zone.averageLineColor || zone.color,
                          fontWeight: 'bold',
                          style: { zIndex: 1000 },
                        }}
                        segment={[
                          { x: chartData[zone.start]?.displayTime, y: avg },
                          { x: chartData[zone.end]?.displayTime, y: avg }
                        ]}
                      />
                    );
                  });
                })}
                {/* Render each metric based on its chart type */}
                {columns.map(col => {
                  const style = metricStyles[col];
                  if (style.chartType === 'line') {
                    return (
                      <Line
                        key={col}
                        type="monotone"
                        dataKey={col}
                        stroke={style.color}
                        name={col}
                        dot={false}
                        strokeWidth={style.thickness}
                      />
                    );
                  } else if (style.chartType === 'bar') {
                    return (
                      <Bar
                        key={col}
                        dataKey={col}
                        fill={style.color}
                        name={col}
                      />
                    );
                  } else if (style.chartType === 'area') {
                    return (
                      <Area
                        key={col}
                        type="monotone"
                        dataKey={col}
                        fill={style.color}
                        stroke={style.color}
                        name={col}
                        fillOpacity={0.3}
                      />
                    );
                  } else if (style.chartType === 'scatter') {
                    return (
                      <Scatter
                        key={col}
                        dataKey={col}
                        fill={style.color}
                        name={col}
                      />
                    );
                  }
                  return null;
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
      })}
      </div>
    </div>
  );
}
