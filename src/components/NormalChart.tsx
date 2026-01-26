'use client';

import { useRef } from 'react';
import { AnalysisResult } from '@/types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Download } from 'lucide-react';

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
}

interface Props {
  result: AnalysisResult;
  chartType: 'line' | 'bar';
  lineStyles?: Record<string, LineStyle>;
  backgroundZones?: BackgroundZone[];
  queryName?: string;
}

export default function NormalChart({ result, chartType, lineStyles, backgroundZones = [], queryName }: Props) {
  const { data, config } = result;
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 获取所有数值列（排除时间戳）
  const numericColumns = Object.keys(data[0] || {}).filter(
    key => key !== 'timestamp' && typeof data[0][key] === 'number'
  );

  // 默认颜色方案
  const defaultColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  ];

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
  let chartData = data.map(row => ({
    ...row,
    displayTime: formatTimestamp(row.timestamp as string),
  }));
  
  // 对每个数值列移除异常值
  numericColumns.forEach(column => {
    chartData = removeOutliers(chartData, column);
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

  return (
    <div className="space-y-8">
      {numericColumns.map((column, index) => (
        <div key={column} className="border rounded-lg p-4">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => exportChartToPNG(column)}
              className="px-2 py-1 text-xs rounded flex items-center bg-green-600 text-white hover:bg-green-700"
            >
              <Download className="w-3 h-3 mr-1" />
              保存PNG
            </button>
          </div>
          <div ref={(el) => { chartRefs.current[column] = el; }}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{column}</h3>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="displayTime"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
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
                {backgroundZones.map((zone) => (
                  <ReferenceArea
                    key={zone.id}
                    x1={chartData[zone.start]?.displayTime}
                    x2={chartData[zone.end]?.displayTime}
                    fill={zone.color}
                    fillOpacity={0.3}
                    label={{ value: zone.label, position: 'top', fontSize: 10 }}
                  />
                ))}
                {/* Zone Average Lines */}
                {backgroundZones.map((zone) => {
                  if (!zone.showAverage) return null;
                  const avg = calculateZoneAverage(column, zone);
                  if (avg === null) return null;
                  
                  return (
                    <ReferenceLine
                      key={`${zone.id}-avg`}
                      y={avg}
                      stroke={zone.color}
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        value: `${zone.label} 平均: ${avg.toFixed(2)}`,
                        position: 'insideTopRight',
                        fontSize: 11,
                        fill: '#000000',
                        fontWeight: 'bold',
                      }}
                      segment={[
                        { x: chartData[zone.start]?.displayTime, y: avg },
                        { x: chartData[zone.end]?.displayTime, y: avg }
                      ]}
                    />
                  );
                })}
                  <Line
                    type="monotone"
                    dataKey={column}
                    stroke={lineStyles?.[column]?.color || defaultColors[index % defaultColors.length]}
                    name={column}
                    dot={false}
                    strokeWidth={lineStyles?.[column]?.thickness || 2}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="displayTime"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                  {backgroundZones.map((zone) => (
                    <ReferenceArea
                      key={zone.id}
                      x1={chartData[zone.start]?.displayTime}
                      x2={chartData[zone.end]?.displayTime}
                      fill={zone.color}
                      fillOpacity={0.3}
                      label={{ value: zone.label, position: 'top', fontSize: 10 }}
                    />
                  ))}
                  {/* Zone Average Lines */}
                  {backgroundZones.map((zone) => {
                    if (!zone.showAverage) return null;
                    const avg = calculateZoneAverage(column, zone);
                    if (avg === null) return null;
                    
                    return (
                      <ReferenceLine
                        key={`${zone.id}-avg`}
                        y={avg}
                        stroke={zone.color}
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `${zone.label} 平均: ${avg.toFixed(2)}`,
                          position: 'insideTopRight',
                          fontSize: 11,
                          fill: '#000000',
                          fontWeight: 'bold',
                        }}
                        segment={[
                          { x: chartData[zone.start]?.displayTime, y: avg },
                          { x: chartData[zone.end]?.displayTime, y: avg }
                        ]}
                      />
                    );
                  })}
                  <Bar
                    dataKey={column}
                    fill={lineStyles?.[column]?.color || defaultColors[index % defaultColors.length]}
                    name={column}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
