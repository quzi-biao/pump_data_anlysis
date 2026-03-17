import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { AnalysisConfig, ApiResponse } from '@/types';

// GET - 获取所有分析配置或单个配置
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      // 获取单个配置
      const results = await query<any[]>(
        'SELECT * FROM analysis_configs WHERE id = ?',
        [id]
      );

      if (results.length === 0) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'Analysis config not found',
        }, { status: 404 });
      }

      const config = parseAnalysisConfig(results[0]);
      return NextResponse.json<ApiResponse<AnalysisConfig>>({
        success: true,
        data: config,
      });
    } else {
      // 获取所有配置
      const results = await query<any[]>(
        'SELECT * FROM analysis_configs ORDER BY created_at DESC'
      );

      const configs = results.map(parseAnalysisConfig);
      return NextResponse.json<ApiResponse<AnalysisConfig[]>>({
        success: true,
        data: configs,
      });
    }
  } catch (error) {
    console.error('Error fetching analysis configs:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to fetch analysis configs',
    }, { status: 500 });
  }
}

// POST - 创建新的分析配置
export async function POST(request: NextRequest) {
  try {
    const body: AnalysisConfig = await request.json();

    const result = await query<any>(
      `INSERT INTO analysis_configs 
       (name, description, base_indicators, extended_indicators, time_dimension, data_source) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.name,
        body.description || null,
        JSON.stringify(body.baseIndicators),
        JSON.stringify(body.extendedIndicators),
        body.timeDimension,
        body.dataSource || null,
      ]
    );

    const newConfig: AnalysisConfig = {
      id: result.insertId,
      ...body,
    };

    return NextResponse.json<ApiResponse<AnalysisConfig>>({
      success: true,
      data: newConfig,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating analysis config:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to create analysis config',
    }, { status: 500 });
  }
}

// PUT - 更新分析配置
export async function PUT(request: NextRequest) {
  try {
    const body: AnalysisConfig = await request.json();

    if (!body.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Analysis config ID is required',
      }, { status: 400 });
    }

    await query(
      `UPDATE analysis_configs 
       SET name = ?, description = ?, base_indicators = ?, 
           extended_indicators = ?, time_dimension = ?, data_source = ?
       WHERE id = ?`,
      [
        body.name,
        body.description || null,
        JSON.stringify(body.baseIndicators),
        JSON.stringify(body.extendedIndicators),
        body.timeDimension,
        body.dataSource || null,
        body.id,
      ]
    );

    return NextResponse.json<ApiResponse<AnalysisConfig>>({
      success: true,
      data: body,
    });
  } catch (error) {
    console.error('Error updating analysis config:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to update analysis config',
    }, { status: 500 });
  }
}

// DELETE - 删除分析配置
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Analysis config ID is required',
      }, { status: 400 });
    }

    await query('DELETE FROM analysis_configs WHERE id = ?', [id]);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting analysis config:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to delete analysis config',
    }, { status: 500 });
  }
}

// 辅助函数：解析数据库记录为 AnalysisConfig
function parseAnalysisConfig(row: any): AnalysisConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    baseIndicators: typeof row.base_indicators === 'string' 
      ? JSON.parse(row.base_indicators) 
      : row.base_indicators,
    extendedIndicators: typeof row.extended_indicators === 'string'
      ? JSON.parse(row.extended_indicators)
      : row.extended_indicators,
    timeDimension: row.time_dimension,
    dataSource: row.data_source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
