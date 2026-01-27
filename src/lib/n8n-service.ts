/**
 * n8n 服务调用模块
 * 用于向 n8n 工作流提交数据分析请求
 */

// n8n 配置
const N8N_CONFIG = {
  baseUrl: 'https://n8n.waters-ai.work',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTVlNzNmYS0zNWE2LTRiMjItYWM1Yi0yMTU3ZWM0N2UyMjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4MTQyNjIxfQ.srEtupJd_zxll1FJBAk96Bvssi9x08TGco0ipADanLY',
  webhookPath: '/webhook/98a0d653-f1c8-4733-aa1b-2546d562363b'
};

export interface N8nAnalysisRequest {
  data: any[];
  prompt: string;
  metadata: {
    queryName: string;
    timeRange: {
      start: string;
      end: string;
    };
    comparisonType?: string;
    config?: any;
    indicators?: string[];
  };
}

export interface N8nAnalysisResponse {
  success: boolean;
  result?: {
    summary?: string;
    findings?: string[];
    insights?: string[];
    anomalies?: string[];
    recommendations?: string[];
    risks?: string[];
    metrics?: Record<string, any>;
  };
  error?: string;
  executionId?: string;
}

/**
 * 提交数据到 n8n 进行 AI 分析
 * 通过本地 API 代理，避免 CORS 问题
 */
export async function submitToN8n(request: N8nAnalysisRequest): Promise<N8nAnalysisResponse> {
  // 使用本地 API 代理
  const apiUrl = '/api/n8n-analysis';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(120000), // 120秒超时
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      ...data,
    };

  } catch (error) {
    console.error('n8n 分析错误:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return {
          success: false,
          error: '分析超时，请稍后重试或简化分析需求',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: '未知错误',
    };
  }
}

/**
 * 检查 n8n 服务是否可用
 */
export async function checkN8nHealth(): Promise<boolean> {
  const healthUrl = `${N8N_CONFIG.baseUrl}/healthz`;
  
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
