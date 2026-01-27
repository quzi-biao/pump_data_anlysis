import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 保存 AI 分析报告到查询记录
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const queryId = parseInt(params.id);
    if (isNaN(queryId)) {
      return NextResponse.json({ error: '无效的查询 ID' }, { status: 400 });
    }

    const body = await request.json();
    const { analysis } = body;

    if (!analysis) {
      return NextResponse.json({ error: '缺少分析数据' }, { status: 400 });
    }

    // 先检查表结构，如果字段不存在则添加
    try {
      await query(`
        ALTER TABLE saved_queries 
        ADD COLUMN IF NOT EXISTS latest_ai_analysis JSON DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS ai_analysis_updated_at TIMESTAMP NULL DEFAULT NULL
      `);
    } catch (e) {
      // 字段可能已存在，忽略错误
      console.log('字段可能已存在:', e);
    }

    // 更新查询记录的 AI 分析报告
    await query(
      `UPDATE saved_queries 
       SET latest_ai_analysis = ?, 
           ai_analysis_updated_at = NOW() 
       WHERE id = ?`,
      [JSON.stringify(analysis), queryId]
    );

    return NextResponse.json({
      success: true,
      message: '分析报告已保存',
    });
  } catch (error) {
    console.error('保存分析报告错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}

// 获取查询的 AI 分析报告
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const queryId = parseInt(params.id);
    if (isNaN(queryId)) {
      return NextResponse.json({ error: '无效的查询 ID' }, { status: 400 });
    }

    const result = await query<any[]>(
      `SELECT latest_ai_analysis, ai_analysis_updated_at 
       FROM saved_queries 
       WHERE id = ?`,
      [queryId]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: '查询不存在' }, { status: 404 });
    }

    const { latest_ai_analysis, ai_analysis_updated_at } = result[0];

    if (!latest_ai_analysis) {
      return NextResponse.json({
        success: true,
        analysis: null,
      });
    }

    return NextResponse.json({
      success: true,
      analysis: typeof latest_ai_analysis === 'string' 
        ? JSON.parse(latest_ai_analysis) 
        : latest_ai_analysis,
      updatedAt: ai_analysis_updated_at,
    });
  } catch (error) {
    console.error('获取分析报告错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}
