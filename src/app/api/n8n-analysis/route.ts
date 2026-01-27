import { NextRequest, NextResponse } from 'next/server';

const N8N_CONFIG = {
  baseUrl: 'https://n8n.waters-ai.work',
  webhookPath: '/webhook/98a0d653-f1c8-4733-aa1b-2546d562363b'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const webhookUrl = `${N8N_CONFIG.baseUrl}${N8N_CONFIG.webhookPath}`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000), // 120秒超时
    });

    if (!response.ok) {
      throw new Error(`n8n 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // n8n 返回的可能是数组格式：[{ output: "..." }]
    let result;
    if (Array.isArray(data) && data.length > 0) {
      // 取第一个元素
      const firstItem = data[0];
      
      // 如果有 output 字段（AI Agent 节点），需要解析 JSON 字符串
      if (firstItem.output && typeof firstItem.output === 'string') {
        try {
          result = JSON.parse(firstItem.output);
        } catch (e) {
          // 如果解析失败，直接使用原始数据
          result = firstItem;
        }
      } else {
        result = firstItem;
      }
    } else if (typeof data === 'object' && data !== null) {
      // 如果是对象格式，直接使用
      result = data;
    } else {
      throw new Error('n8n 返回数据格式不正确');
    }
    
    // n8n Code 节点返回的格式：{ success: true, result: {...} }
    // 需要提取内层的 result
    if (result.success && result.result) {
      result = result.result;
    }
    
    // 确保返回格式符合前端期望
    return NextResponse.json({
      success: true,
      result: result,
    });

  } catch (error) {
    console.error('n8n 分析错误:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return NextResponse.json({
          success: false,
          error: '分析超时，请稍后重试或简化分析需求',
        }, { status: 504 });
      }
      
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: '未知错误',
    }, { status: 500 });
  }
}
