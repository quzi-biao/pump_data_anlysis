import { DataPoint, ExtendedIndicator, AnalysisDataRow, AggregationType } from '@/types';

/**
 * 对一组数值进行聚合计算
 * @param values 数值数组
 * @param aggregationType 聚合类型
 */
export function aggregateValues(values: number[], aggregationType: AggregationType): number | null {
  if (values.length === 0) return null;

  switch (aggregationType) {
    case 'avg':
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    default:
      return values.reduce((sum, val) => sum + val, 0) / values.length; // 默认返回均值
  }
}

/**
 * 计算扩展指标
 * @param formula 公式字符串，例如: "温度 + 湿度", "(温度 - 湿度) / 压力 * 100"
 * @param values 指标值映射，key 为指标名称，value 为数值
 */
export function calculateExtendedIndicator(
  formula: string,
  values: Map<string, number>
): number | null {
  // 移除公式中的所有空格
  let expression = formula.replace(/\s/g, '');
  
  try {
    // 替换公式中的指标名称为实际值
    // 按名称长度降序排序，避免短名称被优先替换导致长名称匹配失败
    const sortedEntries = Array.from(values.entries()).sort((a, b) => b[0].length - a[0].length);
    
    sortedEntries.forEach(([indicatorName, value]) => {
      // 移除指标名称中的空格
      const cleanName = indicatorName.replace(/\s/g, '');
      // 转义特殊字符，确保名称中的特殊字符被正确处理
      const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 使用全局替换，由于已按长度排序，长名称会先被替换，避免部分匹配问题
      const regex = new RegExp(escapedName, 'g');
      expression = expression.replace(regex, `(${value})`);
    });

    console.log('Formula:', formula);
    console.log('After replacement:', expression);

    // 安全计算表达式
    const result = evaluateExpression(expression);
    return result;
  } catch (error) {
    console.error('Error calculating extended indicator:', error);
    console.error('Formula:', formula);
    console.error('Expression after replacement:', expression);
    return null;
  }
}

/**
 * 安全地计算数学表达式
 */
function evaluateExpression(expression: string): number {
  // 移除所有空格
  expression = expression.replace(/\s/g, '');
  
  // 验证表达式只包含数字、运算符和括号
  if (!/^[\d+\-*/.()]+$/.test(expression)) {
    throw new Error('Invalid expression');
  }

  // 使用 Function 构造器安全计算
  const func = new Function('return ' + expression);
  const result = func();
  
  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error('Invalid calculation result');
  }
  
  return result;
}

/**
 * 合并多个指标的数据点，按时间戳对齐
 */
export function mergeDataPoints(
  dataMap: Map<string, DataPoint[]>
): Map<string, Map<string, number>> {
  const timeSeriesMap = new Map<string, Map<string, number>>();

  dataMap.forEach((dataPoints, indicatorName) => {
    dataPoints.forEach((point) => {
      const timestamp = new Date(point.time).toISOString();
      
      if (!timeSeriesMap.has(timestamp)) {
        timeSeriesMap.set(timestamp, new Map());
      }
      
      // 使用指标名称作为键
      timeSeriesMap.get(timestamp)!.set(indicatorName, point.value);
    });
  });

  return timeSeriesMap;
}

/**
 * 处理分析数据，计算所有扩展指标
 */
export function processAnalysisData(
  baseDataMap: Map<string, DataPoint[]>,
  extendedIndicators: ExtendedIndicator[],
  visibleIndicators?: Set<string>
): AnalysisDataRow[] {
  // 合并基础指标数据
  const timeSeriesMap = mergeDataPoints(baseDataMap);
  
  const rows: AnalysisDataRow[] = [];

  // 遍历每个时间点
  timeSeriesMap.forEach((indicatorValues, timestamp) => {
    const row: AnalysisDataRow = {
      timestamp,
    };

    // 只添加可见的基础指标到结果行
    indicatorValues.forEach((value, name) => {
      if (!visibleIndicators || visibleIndicators.has(name)) {
        row[name] = value;
      }
    });

    // 计算扩展指标
    extendedIndicators.forEach((extIndicator) => {
      // 使用名称映射进行计算
      const calculatedValue = calculateExtendedIndicator(
        extIndicator.formula,
        indicatorValues
      );
      
      if (calculatedValue !== null) {
        row[extIndicator.name] = calculatedValue;
      }
    });

    rows.push(row);
  });

  // 按时间戳排序
  rows.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return rows;
}

/**
 * 按月份分组数据
 */
export function groupByMonth(data: AnalysisDataRow[]): Map<string, AnalysisDataRow[]> {
  const grouped = new Map<string, AnalysisDataRow[]>();

  data.forEach((row) => {
    const date = new Date(row.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    
    grouped.get(monthKey)!.push(row);
  });

  return grouped;
}

/**
 * 按日期分组数据
 */
export function groupByDay(data: AnalysisDataRow[]): Map<string, AnalysisDataRow[]> {
  const grouped = new Map<string, AnalysisDataRow[]>();

  data.forEach((row) => {
    const date = new Date(row.timestamp);
    const dayKey = date.toISOString().split('T')[0];
    
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    
    grouped.get(dayKey)!.push(row);
  });

  return grouped;
}

/**
 * 对基础指标数据应用聚合
 * @param dataMap 原始数据映射
 * @param baseIndicators 基础指标配置
 * @param timeDimension 时间维度，用于确定聚合粒度
 * @returns 聚合后的数据映射
 */
export function applyAggregation(
  dataMap: Map<string, DataPoint[]>,
  baseIndicators: Array<{ indicator_id: string; aggregation?: AggregationType }>,
  timeDimension: 'minute' | 'hour' | 'day' = 'minute'
): Map<string, DataPoint[]> {
  const aggregatedMap = new Map<string, DataPoint[]>();

  baseIndicators.forEach((indicator) => {
    const dataPoints = dataMap.get(indicator.indicator_id);
    if (!dataPoints || dataPoints.length === 0) {
      aggregatedMap.set(indicator.indicator_id, []);
      return;
    }

    const aggregationType = indicator.aggregation || 'none';

    if (aggregationType === 'none') {
      aggregatedMap.set(indicator.indicator_id, dataPoints);
    } else {
      // 按时间维度分组数据点
      const groupedByTime = groupDataPointsByTimeDimension(dataPoints, timeDimension);
      
      // 对每个时间组进行聚合
      const aggregatedPoints: DataPoint[] = [];
      groupedByTime.forEach((points, timeKey) => {
        const values = points.map(dp => dp.value);
        const aggregatedValue = aggregateValues(values, aggregationType);
        
        if (aggregatedValue !== null) {
          aggregatedPoints.push({
            time: points[points.length - 1].time,
            value: aggregatedValue,
            indicator_id: indicator.indicator_id,
          });
        }
      });
      
      aggregatedMap.set(indicator.indicator_id, aggregatedPoints);
    }
  });

  return aggregatedMap;
}

/**
 * 按时间维度分组数据点
 */
function groupDataPointsByTimeDimension(
  dataPoints: DataPoint[],
  timeDimension: 'minute' | 'hour' | 'day'
): Map<string, DataPoint[]> {
  const grouped = new Map<string, DataPoint[]>();

  dataPoints.forEach((point) => {
    const date = new Date(point.time);
    let timeKey: string;

    switch (timeDimension) {
      case 'day':
        timeKey = date.toISOString().split('T')[0];
        break;
      case 'hour':
        timeKey = `${date.toISOString().split('T')[0]} ${String(date.getUTCHours()).padStart(2, '0')}`;
        break;
      case 'minute':
      default:
        timeKey = `${date.toISOString().split('T')[0]} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
        break;
    }

    if (!grouped.has(timeKey)) {
      grouped.set(timeKey, []);
    }
    grouped.get(timeKey)!.push(point);
  });

  return grouped;
}
