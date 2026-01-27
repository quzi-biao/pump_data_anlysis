# n8n AI 数据分析工作流配置指南

本文档说明如何在 n8n 中配置 AI 数据分析工作流，用于对泵站查询结果进行智能分析。

## 工作流概览

```
Webhook 接收数据 → 数据统计分析 → LLM 深度分析 → 返回文本报告
```

**核心目标**：接收查询结果数据，进行统计分析和 AI 深度解读，返回纯文字分析报告。

---

## 第一步：创建 Webhook 节点

1. 在 n8n 中创建新工作流
2. 添加 **Webhook** 节点
3. 配置：
   - **HTTP Method**: `POST`
   - **Path**: `analysis`
   - **Response Mode**: `When Last Node Finishes`
   - **Response Data**: `Last Node`

### 接收的数据格式

```json
{
  "data": [
    {"timestamp": "2024-01-01 00:00:00", "flow": 100.5, "pressure": 2.3},
    {"timestamp": "2024-01-01 01:00:00", "flow": 105.2, "pressure": 2.4}
  ],
  "prompt": "用户的分析目标描述",
  "metadata": {
    "queryName": "流量压力监测",
    "timeRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "comparisonType": "normal",
    "config": {
      "timeDimension": "hour",
      "aggregation": "avg"
    },
    "indicators": ["flow", "pressure"]
  }
}
```

---

## 第二步：数据统计分析节点

添加 **Code** 节点（JavaScript），进行深度统计分析：

```javascript
// 数据统计分析
const inputData = $input.all()[0].json;
const data = inputData.data;
const metadata = inputData.metadata || {};

// 提取数值列
const columns = Object.keys(data[0] || {}).filter(col => 
  col !== 'timestamp' && col !== 'comparisonGroup'
);

const dataInfo = {
  totalRows: data.length,
  columns: columns,
  timeRange: metadata.timeRange,
  queryName: metadata.queryName,
  indicators: metadata.indicators || columns
};

// 详细统计分析
const statistics = {};
columns.forEach(col => {
  const values = data
    .map(row => row[col])
    .filter(v => typeof v === 'number' && !isNaN(v));
  
  if (values.length === 0) return;
  
  // 排序用于计算中位数和四分位数
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  // 标准差
  const variance = values.reduce((acc, val) => 
    acc + Math.pow(val - mean, 2), 0
  ) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // 中位数
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // 四分位数
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  
  // 变异系数
  const cv = (stdDev / mean) * 100;
  
  // 趋势分析
  let trend = 'stable';
  if (values.length > 1) {
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const change = ((avgSecond - avgFirst) / avgFirst) * 100;
    
    if (change > 5) trend = 'increasing';
    else if (change < -5) trend = 'decreasing';
  }
  
  statistics[col] = {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: mean,
    median: median,
    stdDev: stdDev,
    cv: cv,
    q1: q1,
    q3: q3,
    range: Math.max(...values) - Math.min(...values),
    trend: trend
  };
});

// 异常值检测（IQR方法）
const anomalies = {};
columns.forEach(col => {
  if (!statistics[col]) return;
  
  const { q1, q3 } = statistics[col];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const outliers = data
    .filter(row => {
      const val = row[col];
      return typeof val === 'number' && (val < lowerBound || val > upperBound);
    })
    .map(row => ({
      timestamp: row.timestamp,
      value: row[col],
      type: row[col] < lowerBound ? 'low' : 'high'
    }));
  
  if (outliers.length > 0) {
    anomalies[col] = {
      count: outliers.length,
      percentage: (outliers.length / data.length * 100).toFixed(2),
      samples: outliers.slice(0, 5) // 前5个异常点
    };
  }
});

// 相关性分析
const correlations = [];
if (columns.length > 1) {
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const col1 = columns[i];
      const col2 = columns[j];
      
      const pairs = data
        .map(row => [row[col1], row[col2]])
        .filter(([a, b]) => typeof a === 'number' && typeof b === 'number');
      
      if (pairs.length === 0) continue;
      
      // 计算皮尔逊相关系数
      const mean1 = pairs.reduce((sum, [a]) => sum + a, 0) / pairs.length;
      const mean2 = pairs.reduce((sum, [, b]) => sum + b, 0) / pairs.length;
      
      let numerator = 0;
      let denom1 = 0;
      let denom2 = 0;
      
      pairs.forEach(([a, b]) => {
        const diff1 = a - mean1;
        const diff2 = b - mean2;
        numerator += diff1 * diff2;
        denom1 += diff1 * diff1;
        denom2 += diff2 * diff2;
      });
      
      const correlation = numerator / Math.sqrt(denom1 * denom2);
      
      if (Math.abs(correlation) > 0.3) {
        correlations.push({
          indicator1: col1,
          indicator2: col2,
          coefficient: correlation.toFixed(3),
          strength: Math.abs(correlation) > 0.7 ? 'strong' : 'moderate'
        });
      }
    }
  }
}

return {
  json: {
    dataInfo,
    statistics,
    anomalies,
    correlations,
    userPrompt: inputData.prompt,
    sampleData: data.slice(0, 3)
  }
};
```

---

## 第三步：LLM 深度分析节点

添加 **OpenAI** 节点（或其他 LLM）：

### 配置
- **Resource**: `Chat`
- **Model**: `gpt-4` 或 `gpt-4-turbo`
- **Temperature**: `0.3`

### System Message

```
你是一个专业的泵站数据分析专家，擅长从数据中发现问题、识别模式、提供洞察。

你的任务是：
1. 深入分析提供的统计数据
2. 识别异常模式和潜在问题
3. 发现数据之间的关联关系
4. 提供专业的运维建议
5. 用清晰、专业的语言表达分析结果

输出格式（JSON）：
{
  "summary": "整体分析摘要（2-3句话）",
  "findings": [
    "关键发现1：具体描述数据特征或问题",
    "关键发现2：..."
  ],
  "insights": [
    "洞察1：深层次的数据解读",
    "洞察2：..."
  ],
  "anomalies": [
    "异常1：描述异常情况及可能原因",
    "异常2：..."
  ],
  "recommendations": [
    "建议1：具体可执行的优化建议",
    "建议2：..."
  ],
  "risks": [
    "风险1：潜在的运维风险",
    "风险2：..."
  ]
}

要求：
- 基于实际数据和统计结果进行分析
- 使用专业术语，但保持易懂
- 每个发现都要有数据支撑
- 建议要具体可行
- 只输出 JSON 格式，不要有其他说明文字
```

### User Message（使用表达式）

```javascript
`请分析以下泵站数据：

【查询信息】
- 查询名称：{{ $json.dataInfo.queryName }}
- 时间范围：{{ $json.dataInfo.timeRange?.start }} 至 {{ $json.dataInfo.timeRange?.end }}
- 数据点数：{{ $json.dataInfo.totalRows }}
- 监测指标：{{ $json.dataInfo.indicators.join('、') }}

【统计分析】
{{ JSON.stringify($json.statistics, null, 2) }}

{{ $json.anomalies && Object.keys($json.anomalies).length > 0 ? `【异常检测】
检测到异常值：
${JSON.stringify($json.anomalies, null, 2)}` : '' }}

{{ $json.correlations && $json.correlations.length > 0 ? `【相关性分析】
${JSON.stringify($json.correlations, null, 2)}` : '' }}

【样本数据】
{{ JSON.stringify($json.sampleData, null, 2) }}

【用户分析目标】
{{ $json.userPrompt }}

请基于以上数据进行深度分析，输出 JSON 格式的分析报告。
`
```

---

## 第四步：格式化分析报告

添加 **Code** 节点，解析和格式化 LLM 的分析结果：

```javascript
// 解析 LLM 分析结果
const llmResponse = $input.all()[0].json.message.content;
const statistics = $('数据统计分析').item.json.statistics;
const dataInfo = $('数据统计分析').item.json.dataInfo;

let analysisResult;
try {
  // 尝试提取 JSON
  const jsonMatch = llmResponse.match(/```json\n([\s\S]*?)\n```/) || 
                    llmResponse.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    analysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } else {
    // 如果没有 JSON 格式，创建基本结构
    analysisResult = {
      summary: llmResponse.substring(0, 200),
      findings: [],
      insights: [],
      recommendations: [],
      rawText: llmResponse
    };
  }
  
  // 添加统计数据摘要
  const metricsSummary = {};
  Object.keys(statistics).forEach(key => {
    const stat = statistics[key];
    metricsSummary[key] = {
      平均值: stat.mean.toFixed(2),
      最小值: stat.min.toFixed(2),
      最大值: stat.max.toFixed(2),
      标准差: stat.stdDev.toFixed(2),
      趋势: stat.trend
    };
  });
  
  return {
    json: {
      success: true,
      executionId: $workflow.id + '_' + Date.now(),
      result: {
        ...analysisResult,
        metrics: metricsSummary
      }
    }
  };
  
} catch (error) {
  return {
    json: {
      success: false,
      error: 'Failed to parse LLM response: ' + error.message,
      rawResponse: llmResponse
    }
  };
}
```

---

## 完成！

最后一个节点的输出会自动返回给前端。

### 返回格式示例

```json
{
  "success": true,
  "executionId": "workflow_123_1234567890",
  "result": {
    "summary": "过去7天流量数据整体稳定，平均流量为102.3 m³/h，但在1月15日出现明显波动。",
    "findings": [
      "流量数据呈现明显的日周期性，工作日流量比周末高约15%",
      "1月15日 14:00-16:00 出现异常高值，达到150 m³/h，超出正常范围30%"
    ],
    "insights": [
      "高峰时段集中在8:00-10:00和18:00-20:00，与居民用水习惯一致"
    ],
    "anomalies": [
      "1月15日异常高值可能由突发事件引起，建议检查当日是否有消防用水"
    ],
    "recommendations": [
      "建议在高峰时段前（7:30）提前启动备用泵，确保供水压力稳定"
    ],
    "risks": [
      "高峰时段压力波动较大，可能影响高层用户供水质量"
    ],
    "metrics": {
      "flow": {
        "平均值": "102.30",
        "最小值": "58.20",
        "最大值": "150.00",
        "标准差": "18.50",
        "趋势": "stable"
      }
    }
  }
}
```

---

## 工作流节点总结

1. **Webhook** - 接收查询结果数据
2. **数据统计分析** (Code) - 计算统计指标、异常检测、相关性分析
3. **LLM 深度分析** (OpenAI) - AI 进行数据洞察和专业分析
4. **格式化报告** (Code) - 解析和格式化最终报告

---

## n8n 配置

n8n 服务配置已硬编码在代码中：
- **Base URL**: `https://n8n.waters-ai.work`
- **Webhook Path**: `/webhook/analysis`
- **API Key**: 已配置

在 n8n 中配置 OpenAI 凭证：
1. 进入 n8n 设置
2. 添加 OpenAI API 凭证
3. 在 OpenAI 节点中选择该凭证

---

## 测试工作流

在 n8n 中测试工作流：

1. 点击 "Execute Workflow"
2. 使用测试数据：

```json
{
  "data": [
    {"timestamp": "2024-01-01 00:00:00", "flow": 100.5, "pressure": 2.3},
    {"timestamp": "2024-01-01 01:00:00", "flow": 105.2, "pressure": 2.4},
    {"timestamp": "2024-01-01 02:00:00", "flow": 98.7, "pressure": 2.2}
  ],
  "prompt": "分析流量和压力的关系，找出异常情况",
  "metadata": {
    "queryName": "测试查询",
    "timeRange": {
      "start": "2024-01-01",
      "end": "2024-01-01"
    },
    "indicators": ["flow", "pressure"]
  }
}
```

---

## 常见问题

### 1. n8n 服务连接失败
- 检查 n8n 是否正常运行
- 验证 webhook URL 配置是否正确
- 确保端口没有被防火墙阻止

### 2. LLM 响应超时
- 增加前端超时时间（默认120秒）
- 简化分析需求
- 检查 OpenAI API 配额

### 3. 解析 JSON 失败
- 检查 LLM 的 System Message 是否强调输出 JSON
- 降低 Temperature 参数（建议 0.2-0.3）
- 在格式化节点中添加更多容错逻辑

---

## 下一步

1. 在 n8n 中创建上述工作流
2. 配置 OpenAI API 凭证
3. 测试工作流
4. 在前端查询结果页面点击"AI解读"按钮
5. 输入分析目标，查看 AI 分析结果
