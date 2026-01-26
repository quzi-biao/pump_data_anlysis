'use client';

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
} from 'recharts';

interface LineStyle {
  color: string;
  thickness: number;
}

interface GroupStyle {
  color: string;
}

interface Props {
  result: AnalysisResult;
  chartType: 'line' | 'bar';
  lineStyles?: Record<string, LineStyle>;
  groupStyles?: Record<string, Record<string, GroupStyle>>;
}

export default function ComparisonChart({ result, chartType, lineStyles, groupStyles }: Props) {
  const { data, config } = result;

  // 获取所有数值列（排除时间戳和对比组）
  const numericColumns = Object.keys(data[0] || {}).filter(
    key => key !== 'timestamp' && key !== 'comparisonGroup' && typeof data[0][key] === 'number'
  );

  // 默认颜色方案
  const defaultColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  ];

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

  // 获取对比组
  const comparisonGroups = Array.from(new Set(data.map(row => (row as any).comparisonGroup)));

  // 准备图表数据
  let chartData = data.map(row => ({
    ...row,
    displayTime: formatTimestamp(row.timestamp as string),
    dayOfMonth: new Date(row.timestamp as string).getDate(), // 添加月份中的日期
  }));

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

  return (
    <div className="space-y-8">
      {numericColumns.map((column, index) => (
        <div key={column} className="border rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{column}</h3>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'line' ? (
              <LineChart data={chartData}>
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
                {comparisonGroups.map((group, groupIndex) => {
                  // 如果是按月对比且时间维度是天，使用重组后的数据键
                  const dataKey = (result.comparisonType === 'month' && config.timeDimension === 'day')
                    ? `${column}_${group}`
                    : column;
                  
                  // 获取该组的颜色（优先使用 groupStyles，否则使用默认颜色）
                  const groupColor = groupStyles?.[column]?.[group as string]?.color || defaultColors[groupIndex % defaultColors.length];
                  const strokeWidth = lineStyles?.[column]?.thickness || 2;
                  
                  // 按月对比时不使用 data 属性，让所有线条共享 LineChart 的数据
                  if (result.comparisonType === 'month' && config.timeDimension === 'day') {
                    return (
                      <Line
                        key={group}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={groupColor}
                        name={`${group}`}
                        dot={false}
                        strokeWidth={strokeWidth}
                        connectNulls={true}
                      />
                    );
                  } else {
                    // 其他对比模式使用独立的数据
                    const lineData = chartData.filter(row => (row as any).comparisonGroup === group);
                    return (
                      <Line
                        key={group}
                        data={lineData}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={groupColor}
                        name={`${group}`}
                        dot={false}
                        strokeWidth={strokeWidth}
                        connectNulls={true}
                      />
                    );
                  }
                })}
              </LineChart>
            ) : (
              <BarChart data={chartData}>
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
                {comparisonGroups.map((group, groupIndex) => {
                  // 如果是按月对比且时间维度是天，使用重组后的数据键
                  const dataKey = (result.comparisonType === 'month' && config.timeDimension === 'day')
                    ? `${column}_${group}`
                    : column;
                  
                  // 获取该组的颜色（优先使用 groupStyles，否则使用默认颜色）
                  const groupColor = groupStyles?.[column]?.[group as string]?.color || defaultColors[groupIndex % defaultColors.length];
                  
                  return (
                    <Bar
                      key={group}
                      dataKey={dataKey}
                      fill={groupColor}
                      name={`${group}`}
                    />
                  );
                })}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
