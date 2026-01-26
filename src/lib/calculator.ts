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
  const originalExpression = expression;
  
  try {
    // 替换公式中的指标名称为实际值
    // 按名称长度降序排序，避免短名称被优先替换导致长名称匹配失败
    const sortedEntries = Array.from(values.entries()).sort((a, b) => b[0].length - a[0].length);
    
    let hasAnyValue = false;
    sortedEntries.forEach(([indicatorName, value]) => {
      // 移除指标名称中的空格
      const cleanName = indicatorName.replace(/\s/g, '');
      // 转义特殊字符，确保名称中的特殊字符被正确处理
      const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 使用全局替换，由于已按长度排序，长名称会先被替换，避免部分匹配问题
      const regex = new RegExp(escapedName, 'g');
      if (regex.test(expression)) {
        expression = expression.replace(regex, `(${value})`);
        hasAnyValue = true;
      }
    });

    // 检查是否还有未替换的指标名称（包含中文字符）
    if (/[\u4e00-\u9fa5]/.test(expression)) {
      // 如果没有任何指标被替换，说明所有引用的指标都不存在
      if (!hasAnyValue) {
        return null;
      }
      // 如果有部分指标被替换，将未替换的指标名（缺失的指标）替换为 0
      // 这样可以处理部分指标为 null 的情况（如求和时某些项为 null）
      expression = expression.replace(/[\u4e00-\u9fa5]+/g, '0');
    }

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
function evaluateExpression(expression: string): number | null {
  // 移除所有空格
  expression = expression.replace(/\s/g, '');
  
  // 验证表达式只包含数字、运算符和括号
  if (!/^[\d+\-*/.()]+$/.test(expression)) {
    throw new Error('Invalid expression');
  }

  // 使用 Function 构造器安全计算
  const func = new Function('return ' + expression);
  const result = func();
  
  // 如果结果不是有限数字（如 Infinity、NaN），返回 null
  if (typeof result !== 'number' || !isFinite(result)) {
    return null;
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

  // 记录每个指标的时间戳范围
  console.log('=== Merging data points ===');
  dataMap.forEach((dataPoints, indicatorName) => {
    if (dataPoints.length > 0) {
      const firstTime = new Date(dataPoints[0].time).toISOString();
      const lastTime = new Date(dataPoints[dataPoints.length - 1].time).toISOString();
      console.log(`${indicatorName}: ${dataPoints.length} points, from ${firstTime} to ${lastTime}`);
    }
    
    dataPoints.forEach((point) => {
      const timestamp = new Date(point.time).toISOString();
      
      if (!timeSeriesMap.has(timestamp)) {
        timeSeriesMap.set(timestamp, new Map());
      }
      
      // 使用指标名称作为键
      timeSeriesMap.get(timestamp)!.set(indicatorName, point.value);
    });
  });

  console.log(`Total unique timestamps: ${timeSeriesMap.size}`);
  
  // 显示前3个时间戳及其包含的指标
  let count = 0;
  for (const [timestamp, indicators] of timeSeriesMap.entries()) {
    if (count < 3) {
      console.log(`Timestamp ${timestamp}: ${Array.from(indicators.keys()).join(', ')}`);
      count++;
    } else {
      break;
    }
  }

  return timeSeriesMap;
}

/**
 * 检测扩展指标的依赖关系
 * 返回指标名称到其依赖的指标名称列表的映射
 */
function detectExtendedIndicatorDependencies(
  extendedIndicators: ExtendedIndicator[],
  baseIndicatorNames: Set<string>
): Map<string, Set<string>> {
  const dependencies = new Map<string, Set<string>>();
  const extendedIndicatorNames = new Set(extendedIndicators.map(ind => ind.name));
  
  extendedIndicators.forEach(indicator => {
    const deps = new Set<string>();
    
    // 移除公式中的空格
    const formula = indicator.formula.replace(/\s/g, '');
    
    // 检查公式中使用了哪些指标（基础指标或其他扩展指标）
    // 按名称长度降序排序，避免短名称被优先匹配
    const allIndicatorNames = [...baseIndicatorNames, ...extendedIndicatorNames];
    const sortedNames = allIndicatorNames.sort((a, b) => b.length - a.length);
    
    sortedNames.forEach(name => {
      if (name !== indicator.name) {
        const cleanName = name.replace(/\s/g, '');
        const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedName);
        
        if (regex.test(formula)) {
          // 只记录对其他扩展指标的依赖
          if (extendedIndicatorNames.has(name)) {
            deps.add(name);
          }
        }
      }
    });
    
    dependencies.set(indicator.name, deps);
  });
  
  return dependencies;
}

/**
 * 拓扑排序：根据依赖关系对扩展指标排序
 * 返回排序后的扩展指标数组，确保被依赖的指标先计算
 */
function topologicalSortExtendedIndicators(
  extendedIndicators: ExtendedIndicator[],
  dependencies: Map<string, Set<string>>
): ExtendedIndicator[] {
  const sorted: ExtendedIndicator[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const indicatorMap = new Map(extendedIndicators.map(ind => [ind.name, ind]));
  
  function visit(name: string): boolean {
    if (visited.has(name)) return true;
    if (visiting.has(name)) {
      // 检测到循环依赖
      console.error(`Circular dependency detected involving indicator: ${name}`);
      return false;
    }
    
    visiting.add(name);
    
    const deps = dependencies.get(name) || new Set();
    for (const dep of deps) {
      if (!visit(dep)) {
        return false;
      }
    }
    
    visiting.delete(name);
    visited.add(name);
    
    const indicator = indicatorMap.get(name);
    if (indicator) {
      sorted.push(indicator);
    }
    
    return true;
  }
  
  // 访问所有扩展指标
  for (const indicator of extendedIndicators) {
    if (!visited.has(indicator.name)) {
      if (!visit(indicator.name)) {
        // 如果有循环依赖，返回原始顺序
        console.error('Circular dependency detected, using original order');
        return extendedIndicators;
      }
    }
  }
  
  return sorted;
}

/**
 * 处理分析数据，计算所有扩展指标
 */
export function processAnalysisData(
  baseDataMap: Map<string, DataPoint[]>,
  extendedIndicators: ExtendedIndicator[],
  visibleIndicators?: Set<string>,
  extendedDataMap?: Map<string, DataPoint[]>
): AnalysisDataRow[] {
  // 收集所有时间戳（从所有指标中）
  const allTimestamps = new Set<string>();
  
  // 从基础指标收集时间戳
  baseDataMap.forEach((dataPoints) => {
    dataPoints.forEach((point) => {
      allTimestamps.add(new Date(point.time).toISOString());
    });
  });
  
  // 从扩展指标的导入数据收集时间戳
  if (extendedDataMap && extendedDataMap.size > 0) {
    extendedDataMap.forEach((dataPoints) => {
      dataPoints.forEach((point) => {
        allTimestamps.add(new Date(point.time).toISOString());
      });
    });
  }
  
  console.log(`Total unique timestamps across all indicators: ${allTimestamps.size}`);
  
  // 为每个时间戳创建完整的数据映射
  const timeSeriesMap = new Map<string, Map<string, number>>();
  
  // 初始化所有时间戳
  allTimestamps.forEach(timestamp => {
    timeSeriesMap.set(timestamp, new Map());
  });
  
  // 填充基础指标数据，缺失的时间点填充 0
  baseDataMap.forEach((dataPoints, indicatorName) => {
    const dataByTime = new Map<string, number>();
    dataPoints.forEach((point) => {
      dataByTime.set(new Date(point.time).toISOString(), point.value);
    });
    
    // 为所有时间戳设置值（有数据用实际值，无数据用 0）
    allTimestamps.forEach(timestamp => {
      const value = dataByTime.get(timestamp) ?? 0;
      timeSeriesMap.get(timestamp)!.set(indicatorName, value);
    });
  });
  
  // 填充扩展指标的导入数据
  if (extendedDataMap && extendedDataMap.size > 0) {
    extendedDataMap.forEach((dataPoints, indicatorName) => {
      const dataByTime = new Map<string, number>();
      dataPoints.forEach((point) => {
        dataByTime.set(new Date(point.time).toISOString(), point.value);
      });
      
      // 为所有时间戳设置导入数据标记
      allTimestamps.forEach(timestamp => {
        const value = dataByTime.get(timestamp);
        if (value !== undefined) {
          timeSeriesMap.get(timestamp)!.set(`__imported_${indicatorName}`, value);
        }
      });
    });
  }
  
  // 检测扩展指标之间的依赖关系并排序
  const baseIndicatorNames = new Set(baseDataMap.keys());
  const dependencies = detectExtendedIndicatorDependencies(extendedIndicators, baseIndicatorNames);
  const sortedExtendedIndicators = topologicalSortExtendedIndicators(extendedIndicators, dependencies);
  
  console.log('Extended indicators calculation order:', sortedExtendedIndicators.map(ind => ind.name));
  console.log('Dependencies:', Array.from(dependencies.entries()).map(([name, deps]) => ({ name, deps: Array.from(deps) })));
  
  const rows: AnalysisDataRow[] = [];

  // 遍历每个时间点
  timeSeriesMap.forEach((indicatorValues, timestamp) => {
    const row: AnalysisDataRow = {
      timestamp,
    };

    // 只添加可见的基础指标到结果行
    indicatorValues.forEach((value, name) => {
      // 跳过导入数据的临时标记
      if (!name.startsWith('__imported_')) {
        if (!visibleIndicators || visibleIndicators.has(name)) {
          row[name] = value;
        }
      }
    });

    // 按依赖顺序计算扩展指标
    const extendedResults: Record<string, number | null> = {};
    
    // 只在第一行数据时输出可用指标
    if (rows.length === 0) {
      console.log('Available indicators for calculation:', Array.from(indicatorValues.keys()));
    }
    
    sortedExtendedIndicators.forEach((extIndicator) => {
      // 使用名称映射进行计算
      const calculatedValue = calculateExtendedIndicator(
        extIndicator.formula,
        indicatorValues
      );
      
      // 检查是否有导入数据
      const importedValue = indicatorValues.get(`__imported_${extIndicator.name}`);
      
      // 合并计算值和导入值：优先使用导入值
      let finalValue: number | null = null;
      if (importedValue !== undefined) {
        finalValue = importedValue;
      } else if (calculatedValue !== null) {
        finalValue = calculatedValue;
      }
      
      extendedResults[extIndicator.name] = finalValue;
      
      if (finalValue !== null) {
        // 将计算结果添加到 indicatorValues 中，供后续扩展指标使用
        indicatorValues.set(extIndicator.name, finalValue);
        
        // 只有当扩展指标设置为可见时，才添加到结果行中
        if (extIndicator.visible !== false) {
          row[extIndicator.name] = finalValue;
        }
      }
    });
    
    // 只在第一行数据时输出扩展指标计算结果
    if (rows.length === 0) {
      console.log('Extended indicators calculation results (first row):', extendedResults);
    }

    rows.push(row);
  });

  // 按时间戳排序
  rows.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  console.log(`Total rows generated: ${rows.length}`);
  if (rows.length > 0) {
    console.log('First row columns:', Object.keys(rows[0]));
    console.log('First row sample:', rows[0]);
  }

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
