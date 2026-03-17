import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { queryIndicatorData, queryPressureData } from '@/lib/influxdb';
import { processAnalysisData, groupByMonth, groupByDay } from '@/lib/calculator';
import { AnalysisConfig, QueryParams, AnalysisResult, ApiResponse, DataPoint, TimeDimension, AggregationType } from '@/types';

// 合并两个数据源的数据点，按时间戳对齐
function mergeDataPoints(influxData: DataPoint[], importedData: DataPoint[], indicatorId: string): DataPoint[] {
  // 创建时间到数据点的映射
  const dataMap = new Map<string, { influx?: number; imported?: number }>();
  
  // 添加 InfluxDB 数据
  influxData.forEach(point => {
    dataMap.set(point.time, { influx: point.value });
  });
  
  // 添加导入数据
  importedData.forEach(point => {
    const existing = dataMap.get(point.time);
    if (existing) {
      existing.imported = point.value;
    } else {
      dataMap.set(point.time, { imported: point.value });
    }
  });
  
  // 合并数据：优先使用导入数据，如果没有则使用 InfluxDB 数据
  const mergedData: DataPoint[] = [];
  dataMap.forEach((values, time) => {
    // 如果两个数据源都有值，优先使用导入数据
    const value = values.imported !== undefined ? values.imported : values.influx;
    if (value !== undefined) {
      mergedData.push({ time, value, indicator_id: indicatorId });
    }
  });
  
  // 按时间排序
  mergedData.sort((a, b) => a.time.localeCompare(b.time));
  
  return mergedData;
}

// 从 MySQL 导入表查询数据
async function queryImportedData(
  label: string,
  startTime: string,
  endTime: string,
  timeDimension: TimeDimension,
  aggregation: AggregationType,
  indicatorId: string,
  dataSource?: string,
  weightField?: string
): Promise<DataPoint[]> {
  // 根据 dataSource 或 timeDimension 选择对应的表
  // 如果指定了 dataSource，优先使用 dataSource
  // 否则智能选择：按优先级尝试多个表，使用第一个有数据的表
  let tableName: string;
  let tablesToTry: string[] = [];
  
  if (dataSource) {
    // 用户明确指定了数据源
    tableName = dataSource === 'day' 
      ? 'data_daily_import'
      : dataSource === 'hour'
      ? 'data_hour_import'
      : 'data_import';
    tablesToTry = [tableName];
  } else {
    // 未指定数据源，根据时间维度智能选择
    // 按从细到粗的顺序尝试：分钟 -> 小时 -> 日
    if (timeDimension === 'month' || timeDimension === 'day') {
      tablesToTry = ['data_daily_import', 'data_hour_import', 'data_import'];
    } else if (timeDimension === 'hour') {
      tablesToTry = ['data_hour_import', 'data_import'];
    } else {
      tablesToTry = ['data_import'];
    }
    tableName = tablesToTry[0]; // 默认使用第一个
  }

  // 构建聚合查询
  let aggFunc: string;
  let selectExpression: string;
  
  if (aggregation === 'weighted_avg' && weightField) {
    // 加权平均：计算 (值字段 * 加权字段) 的平均值
    // 需要从两个不同的 label1 查询数据并计算
    aggFunc = 'AVG';
    selectExpression = `${aggFunc}(t1.value * t2.value)`;
  } else if (aggregation === 'sum') {
    aggFunc = 'SUM';
    selectExpression = `${aggFunc}(value)`;
  } else if (aggregation === 'max') {
    aggFunc = 'MAX';
    selectExpression = `${aggFunc}(value)`;
  } else if (aggregation === 'min') {
    aggFunc = 'MIN';
    selectExpression = `${aggFunc}(value)`;
  } else {
    aggFunc = 'AVG';
    selectExpression = `${aggFunc}(value)`;
  }
  
  // 根据时间维度确定时间格式和分组
  let timeFormat: string;
  let groupBy: string;
  
  if (timeDimension === 'month') {
    // 月度：从日数据按月聚合
    timeFormat = '%Y-%m-01';
    groupBy = 'DATE_FORMAT(timestamp, "%Y-%m")';
  } else if (timeDimension === 'day') {
    timeFormat = '%Y-%m-%d';
    groupBy = 'DATE(timestamp)';
  } else if (timeDimension === 'hour') {
    timeFormat = '%Y-%m-%d %H:00:00';
    groupBy = 'DATE_FORMAT(timestamp, "%Y-%m-%d %H:00:00")';
  } else {
    timeFormat = '%Y-%m-%d %H:%i:00';
    groupBy = 'DATE_FORMAT(timestamp, "%Y-%m-%d %H:%i:00")';
  }

  // 尝试从多个表查询数据
  let results: any[] = [];
  let actualTableUsed = tableName;
  
  for (const tryTable of tablesToTry) {
    let sql: string;
    let params: any[];
    
    if (aggregation === 'weighted_avg' && weightField) {
      // 加权平均：需要 JOIN 两个表
      sql = `
        SELECT 
          DATE_FORMAT(t1.timestamp, '${timeFormat}') as time,
          ${selectExpression} as value
        FROM ${tryTable} t1
        INNER JOIN ${tryTable} t2 
          ON t1.timestamp = t2.timestamp
        WHERE t1.label1 = ?
          AND t2.label1 = ?
          AND t1.timestamp >= ?
          AND t1.timestamp <= ?
        GROUP BY ${groupBy.replace('timestamp', 't1.timestamp')}
        ORDER BY t1.timestamp ASC
      `;
      params = [label, weightField, startTime, endTime];
    } else {
      // 普通聚合查询
      sql = `
        SELECT 
          DATE_FORMAT(timestamp, '${timeFormat}') as time,
          ${selectExpression} as value
        FROM ${tryTable}
        WHERE label1 = ?
          AND timestamp >= ?
          AND timestamp <= ?
        GROUP BY ${groupBy}
        ORDER BY timestamp ASC
      `;
      params = [label, startTime, endTime];
    }

    console.log(`\n=== Querying imported data ===`);
    console.log(`Label: "${label}"`);
    console.log(`Table: ${tryTable}`);
    console.log(`Time range: ${startTime} to ${endTime}`);
    console.log(`Aggregation: ${aggregation} (${aggFunc})`);
    if (aggregation === 'weighted_avg' && weightField) {
      console.log(`Weight field: ${weightField}`);
    }
    
    try {
      results = await query<any[]>(sql, params);
      
      console.log(`Query result: ${results.length} points`);
      
      if (results.length > 0) {
        actualTableUsed = tryTable;
        console.log(`✓ Data found in table: ${tryTable}`);
        console.log('First 3 points:', results.slice(0, 3));
        console.log('Last 3 points:', results.slice(-3));
        break; // 找到数据就停止尝试
      } else {
        console.log(`✗ No data in ${tryTable}, trying next table...`);
      }
    } catch (error) {
      console.error(`Error querying ${tryTable}:`, error);
      // 继续尝试下一个表
    }
  }
  
  if (results.length === 0) {
    console.log(`⚠ No data found in any table for label: ${label}`);
  }

  // 将时间格式转换为 ISO 格式以匹配 InfluxDB 数据
  return results.map(row => {
    // MySQL 返回的时间格式如 '2025-11-01' 或 '2025-11-01 12:00:00'
    // 需要转换为 ISO 格式 '2025-11-01T00:00:00.000Z'
    const timeStr = row.time;
    let isoTime: string;
    
    if (timeStr.includes(' ')) {
      // 格式：'2025-11-01 12:00:00'
      isoTime = new Date(timeStr.replace(' ', 'T') + 'Z').toISOString();
    } else {
      // 格式：'2025-11-01'
      isoTime = new Date(timeStr + 'T00:00:00.000Z').toISOString();
    }
    
    return {
      time: isoTime,
      value: row.value,
      indicator_id: indicatorId,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const params: QueryParams = await request.json();

    // 获取分析配置
    const configResults = await query<any[]>(
      'SELECT * FROM analysis_configs WHERE id = ?',
      [params.analysisId]
    );

    if (configResults.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Analysis config not found',
      }, { status: 404 });
    }

    const config: AnalysisConfig = {
      id: configResults[0].id,
      name: configResults[0].name,
      description: configResults[0].description,
      baseIndicators: typeof configResults[0].base_indicators === 'string'
        ? JSON.parse(configResults[0].base_indicators)
        : configResults[0].base_indicators,
      extendedIndicators: typeof configResults[0].extended_indicators === 'string'
        ? JSON.parse(configResults[0].extended_indicators)
        : configResults[0].extended_indicators,
      timeDimension: configResults[0].time_dimension,
    };

    // 为每个基础指标查询数据，使用名称作为键
    const dataMapByName = new Map<string, DataPoint[]>();
    const visibleIndicators = new Set<string>();
    
    console.log('Total base indicators configured:', config.baseIndicators.length);
    console.log('Base indicators:', config.baseIndicators.map(ind => ({ name: ind.name, visible: ind.visible })));
    
    await Promise.all(
      config.baseIndicators.map(async (indicator) => {
        let data: DataPoint[];
        
        // 检查指标 ID 是否以 "P:" 开头（压力计数据）
        if (indicator.indicator_id.startsWith('P:')) {
          // 提取压力计的 SN（P: 后面的部分）
          const sn = indicator.indicator_id.substring(2);
          
          // 从 pressData bucket 查询压力计数据
          data = await queryPressureData(
            sn,
            params.startTime,
            params.endTime,
            config.timeDimension,
            indicator.aggregation || 'avg'
          );
          
          console.log(`Pressure sensor "${sn}": ${data.length} data points`);
        }
        // 如果指标有关联标签
        else if (indicator.label) {
          console.log(`\n=== Indicator "${indicator.name}" has label: "${indicator.label}" ===`);
          
          // 检查是否有有效的 indicator_id
          const hasValidIndicatorId = indicator.indicator_id && indicator.indicator_id.trim() !== '';
          
          if (hasValidIndicatorId) {
            // 同时从 InfluxDB 和 MySQL 导入表查询数据，然后合并
            const [influxData, importedData] = await Promise.all([
              queryIndicatorData(
                indicator.indicator_id,
                params.startTime,
                params.endTime,
                config.timeDimension,
                indicator.aggregation || 'avg'
              ),
              queryImportedData(
                indicator.label,
                params.startTime,
                params.endTime,
                config.timeDimension,
                indicator.aggregation || 'avg',
                indicator.indicator_id,
                config.dataSource,
                indicator.weightField
              )
            ]);
            
            console.log(`InfluxDB data: ${influxData.length} points`);
            console.log(`MySQL imported data: ${importedData.length} points`);
            
            // 合并两个数据源的数据
            data = mergeDataPoints(influxData, importedData, indicator.indicator_id);
            
            console.log(`Merged data: ${data.length} points`);
          } else {
            // 只有 label 没有 indicator_id，只从 MySQL 查询
            console.log(`No indicator_id, querying only from MySQL`);
            data = await queryImportedData(
              indicator.label,
              params.startTime,
              params.endTime,
              config.timeDimension,
              indicator.aggregation || 'avg',
              indicator.name, // 使用指标名称作为 ID
              config.dataSource,
              indicator.weightField
            );
            console.log(`MySQL imported data: ${data.length} points`);
          }
        } else {
          // 否则只从 InfluxDB 查询数据
          data = await queryIndicatorData(
            indicator.indicator_id,
            params.startTime,
            params.endTime,
            config.timeDimension,
            indicator.aggregation || 'avg'
          );
        }
        
        // 使用指标名称作为键存储数据
        dataMapByName.set(indicator.name, data);
        
        console.log(`Indicator "${indicator.name}": ${data.length} data points, visible: ${indicator.visible !== false}`);
        
        // 记录可见的指标
        if (indicator.visible !== false) {
          visibleIndicators.add(indicator.name);
        }
      })
    );
    
    console.log('Visible indicators:', Array.from(visibleIndicators));
    console.log('Total extended indicators:', config.extendedIndicators?.length ?? 0);
    console.log('Extended indicators formulas:', config.extendedIndicators?.map(ind => ({ name: ind.name, formula: ind.formula })) ?? []);

    // 查询扩展指标的导入数据（如果有关联标签）
    const extendedDataMap = new Map<string, DataPoint[]>();
    await Promise.all(
      (config.extendedIndicators ?? []).map(async (indicator) => {
        if (indicator.label) {
          const data = await queryImportedData(
            indicator.label,
            params.startTime,
            params.endTime,
            config.timeDimension,
            'avg', // 扩展指标使用均值聚合
            indicator.id,
            config.dataSource,
            undefined // 扩展指标不使用加权平均
          );
          extendedDataMap.set(indicator.name, data);
        }
      })
    );

    // 处理数据并计算扩展指标
    let processedData = processAnalysisData(
      dataMapByName,
      config.extendedIndicators || [],
      visibleIndicators,
      extendedDataMap
    );

    // 根据对比类型处理数据
    if (params.comparisonType === 'month') {
      const groupedByMonth = groupByMonth(processedData);
      
      // 为每个月的数据添加月份标识
      const comparisonData: any[] = [];
      groupedByMonth.forEach((monthData, monthKey) => {
        // 如果指定了selectedMonths，只包含选中的月份
        if (params.selectedMonths && params.selectedMonths.length > 0) {
          // 检查当前月份是否在选中列表中
          const isSelected = params.selectedMonths.some(selectedMonth => {
            return monthKey.startsWith(selectedMonth);
          });
          if (!isSelected) return;
        }
        
        monthData.forEach(row => {
          comparisonData.push({
            ...row,
            comparisonGroup: monthKey,
          });
        });
      });
      processedData = comparisonData;
    } else if (params.comparisonType === 'day') {
      const groupedByDay = groupByDay(processedData);
      
      // 为每天的数据添加日期标识
      const comparisonData: any[] = [];
      groupedByDay.forEach((dayData, dayKey) => {
        dayData.forEach(row => {
          comparisonData.push({
            ...row,
            comparisonGroup: dayKey,
          });
        });
      });
      processedData = comparisonData;
    }

    const result: AnalysisResult = {
      config,
      data: processedData,
      comparisonType: params.comparisonType,
      timeRange: {
        start: params.startTime,
        end: params.endTime,
      },
    };

    return NextResponse.json<ApiResponse<AnalysisResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error querying data:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query data',
    }, { status: 500 });
  }
}
