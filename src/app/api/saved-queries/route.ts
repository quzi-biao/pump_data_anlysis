import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ComparisonType } from '@/types';

interface SavedQuery {
  id?: number;
  name: string;
  config_id: number;
  query_params: {
    startTime: string;
    endTime: string;
    comparisonType: ComparisonType;
    selectedMonths?: string[];
  };
  chart_styles?: any;
  created_at?: string;
}

// GET - 获取所有保存的查询
export async function GET() {
  try {
    const queries = await query<SavedQuery[]>(
      'SELECT * FROM saved_queries ORDER BY created_at DESC'
    );
    
    return NextResponse.json({
      success: true,
      data: queries,
    });
  } catch (error) {
    console.error('Error fetching saved queries:', error);
    return NextResponse.json(
      { success: false, error: '获取查询失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新的保存查询
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, configId, queryParams, chartStyles } = body;

    if (!name || !configId || !queryParams) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const result = await query<any>(
      `INSERT INTO saved_queries (name, config_id, query_params, chart_styles) 
       VALUES (?, ?, ?, ?)`,
      [name, configId, JSON.stringify(queryParams), chartStyles ? JSON.stringify(chartStyles) : null]
    );

    return NextResponse.json({
      success: true,
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error('Error creating saved query:', error);
    return NextResponse.json(
      { success: false, error: '保存查询失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新保存的查询的图表样式
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, chartStyles } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少查询ID' },
        { status: 400 }
      );
    }

    await query(
      'UPDATE saved_queries SET chart_styles = ? WHERE id = ?',
      [chartStyles ? JSON.stringify(chartStyles) : null, id]
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating saved query styles:', error);
    return NextResponse.json(
      { success: false, error: '更新样式失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除保存的查询
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少查询ID' },
        { status: 400 }
      );
    }

    await query('DELETE FROM saved_queries WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting saved query:', error);
    return NextResponse.json(
      { success: false, error: '删除查询失败' },
      { status: 500 }
    );
  }
}
