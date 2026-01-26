'use client';

import { useState, useMemo, useEffect } from 'react';
import { AnalysisResult } from '@/types';
import ComparisonChart from './ComparisonChart';
import NormalChart from './NormalChart';
import { 
  NormalMetricStyle, 
  ComparisonMetricStyle, 
  LineStyle,
  BackgroundZone 
} from '@/types/chart';
import { Settings } from 'lucide-react';

interface Props {
  result: AnalysisResult;
  chartStyles?: any;
  onChartStylesChange?: (styles: any) => void;
  canSaveStyles?: boolean;
  onSaveStyles?: () => void;
  queryName?: string;
}

interface GroupStyle {
  color: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

export default function DataChart({ result, chartStyles, onChartStylesChange, canSaveStyles, onSaveStyles, queryName }: Props) {
  const { data } = result;

  // 检查是否有对比组
  const hasComparisonGroup = 'comparisonGroup' in (data[0] || {});

  // 获取所有数值列（排除时间戳和对比组）
  const numericColumns = Object.keys(data[0]).filter(
    key => key !== 'timestamp' && key !== 'comparisonGroup' && typeof data[0][key] === 'number'
  );

  // 获取对比组列表
  const comparisonGroups = hasComparisonGroup 
    ? Array.from(new Set(data.map(row => (row as any).comparisonGroup)))
    : [];

  // 计算横轴范围（基于数据索引）
  const xAxisRange = useMemo(() => {
    return {
      min: 0,
      max: data.length - 1
    };
  }, [data.length]);

  // 初始化线条样式（用于非对比模式）
  const [lineStyles, setLineStyles] = useState<Record<string, LineStyle>>(() => {
    const styles: Record<string, LineStyle> = {};
    numericColumns.forEach((col, index) => {
      styles[col] = {
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        thickness: 2
      };
    });
    return styles;
  });

  // 初始化对比组样式（用于对比模式）
  const [groupStyles, setGroupStyles] = useState<Record<string, Record<string, GroupStyle>>>(() => {
    const styles: Record<string, Record<string, GroupStyle>> = {};
    numericColumns.forEach((col) => {
      styles[col] = {};
      comparisonGroups.forEach((group, index) => {
        styles[col][group as string] = {
          color: DEFAULT_COLORS[index % DEFAULT_COLORS.length]
        };
      });
    });
    return styles;
  });

  // 背景区域配置
  const [backgroundZones, setBackgroundZones] = useState<BackgroundZone[]>([]);

  // 应用保存的图表样式
  useEffect(() => {
    if (chartStyles) {
      // 处理新的 metricStyles 格式（每个指标独立的样式）
      if (chartStyles.metricStyles) {
        const newLineStyles: Record<string, LineStyle> = {};
        Object.keys(chartStyles.metricStyles).forEach(col => {
          const metricStyle = chartStyles.metricStyles[col];
          newLineStyles[col] = {
            color: metricStyle.color,
            thickness: metricStyle.thickness
          };
        });
        setLineStyles(newLineStyles);
      } else if (chartStyles.lineStyles) {
        // 兼容旧格式
        setLineStyles(chartStyles.lineStyles);
      }
      
      if (chartStyles.groupStyles) setGroupStyles(chartStyles.groupStyles);
      if (chartStyles.backgroundZones) setBackgroundZones(chartStyles.backgroundZones);
    } else {
      // 重置为默认样式
      const defaultLineStyles: Record<string, LineStyle> = {};
      numericColumns.forEach((col, index) => {
        defaultLineStyles[col] = {
          color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          thickness: 2
        };
      });
      setLineStyles(defaultLineStyles);

      const defaultGroupStyles: Record<string, Record<string, GroupStyle>> = {};
      numericColumns.forEach((col) => {
        defaultGroupStyles[col] = {};
        comparisonGroups.forEach((group, index) => {
          defaultGroupStyles[col][group as string] = {
            color: DEFAULT_COLORS[index % DEFAULT_COLORS.length]
          };
        });
      });
      setGroupStyles(defaultGroupStyles);

      setBackgroundZones([]);
    }
  }, [chartStyles, numericColumns, comparisonGroups]);

  // 处理来自 NormalChart 的 metricStyles 更新
  const handleNormalMetricStylesChange = (metricStyles: Record<string, NormalMetricStyle>) => {
    if (onChartStylesChange) {
      onChartStylesChange({
        metricStyles,
      });
    }
  };

  // 处理来自 ComparisonChart 的 metricStyles 更新
  const handleComparisonMetricStylesChange = (metricStyles: Record<string, ComparisonMetricStyle>) => {
    if (onChartStylesChange) {
      onChartStylesChange({
        metricStyles,
      });
    }
  };

  const updateLineStyle = (column: string, updates: Partial<LineStyle>) => {
    const newStyles = {
      ...lineStyles,
      [column]: { ...lineStyles[column], ...updates }
    };
    setLineStyles(newStyles);
    
    // 通知父组件样式已更改
    if (onChartStylesChange) {
      onChartStylesChange({
        lineStyles: newStyles,
        groupStyles,
        backgroundZones,
      });
    }
  };

  const updateGroupStyle = (column: string, group: string, color: string) => {
    const newStyles = {
      ...groupStyles,
      [column]: {
        ...groupStyles[column],
        [group]: { color }
      }
    };
    setGroupStyles(newStyles);
    
    // 通知父组件样式已更改
    if (onChartStylesChange) {
      onChartStylesChange({
        lineStyles,
        groupStyles: newStyles,
        backgroundZones,
      });
    }
  };

  const updateBackgroundZones = (zones: BackgroundZone[]) => {
    setBackgroundZones(zones);
    
    // 通知父组件样式已更改
    if (onChartStylesChange) {
      onChartStylesChange({
        lineStyles,
        groupStyles,
        backgroundZones: zones,
      });
    }
  };


  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无数据
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Charts */}
      {hasComparisonGroup ? (
        <ComparisonChart 
          result={result} 
          chartType={'line'} 
          lineStyles={lineStyles} 
          backgroundZones={backgroundZones}
          queryName={queryName}
          onStylesChange={handleComparisonMetricStylesChange}
          canSaveStyles={canSaveStyles}
          onSaveStyles={onSaveStyles}
          savedMetricStyles={chartStyles?.metricStyles}
        />
      ) : (
        <NormalChart 
          result={result} 
          lineStyles={lineStyles}
          backgroundZones={backgroundZones}
          queryName={queryName}
          onStylesChange={handleNormalMetricStylesChange}
          canSaveStyles={canSaveStyles}
          onSaveStyles={onSaveStyles}
          savedMetricStyles={chartStyles?.metricStyles}
        />
      )}
    </div>
  );
}
