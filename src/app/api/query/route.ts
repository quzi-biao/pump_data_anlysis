import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { queryIndicatorData } from '@/lib/influxdb';
import { processAnalysisData, groupByMonth, groupByDay } from '@/lib/calculator';
import { AnalysisConfig, QueryParams, AnalysisResult, ApiResponse, DataPoint } from '@/types';

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
    
    await Promise.all(
      config.baseIndicators.map(async (indicator) => {
        const data = await queryIndicatorData(
          indicator.indicator_id,
          params.startTime,
          params.endTime,
          config.timeDimension,
          indicator.aggregation || 'avg'
        );
        // 使用指标名称作为键存储数据
        dataMapByName.set(indicator.name, data);
        
        // 记录可见的指标
        if (indicator.visible !== false) {
          visibleIndicators.add(indicator.name);
        }
      })
    );

    // 处理数据并计算扩展指标
    let processedData = processAnalysisData(
      dataMapByName,
      config.extendedIndicators,
      visibleIndicators
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
