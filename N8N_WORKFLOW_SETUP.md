# n8n AI 数据分析工作流配置指南

本文档说明如何在 n8n 中配置 AI 数据分析工作流，用于对泵站查询结果进行智能分析。

## 工作流概览

```
Webhook 接收数据 → AI 模型分析 → 返回分析报告
```

**核心目标**：接收查询结果数据，调用 AI 大模型进行语义理解和智能解读，返回结构化的分析报告。

**注意**：基础的统计分析（均值、异常检测、相关性等）已在前端系统完成，n8n 只负责调用 AI 模型进行深度语义分析。

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

## 第二步：AI 模型分析节点

添加 **OpenAI** 节点（或其他 LLM，如通义千问、Claude 等）：

### 配置
- **Resource**: `Chat`
- **Model**: `gpt-4o` 或 `gpt-4-turbo`（推荐 gpt-4o，速度更快）
- **Temperature**: `0.3`
- **Max Tokens**: `2000`

### System Message

```
你是一个专业的泵站数据分析专家，擅长从时序数据中发现问题、识别模式、提供洞察。

你的任务是：
1. 分析用户提供的泵站监测数据
2. 识别数据中的趋势、异常和模式
3. 发现指标之间的关联关系
4. 提供专业的运维建议和风险预警
5. 用清晰、专业但易懂的语言表达分析结果

输出格式（必须是纯 JSON，不要有任何其他文字）：
{
  "summary": "整体分析摘要（2-3句话，概括主要发现）",
  "findings": [
    "关键发现1：具体描述数据特征或问题",
    "关键发现2：..."
  ],
  "insights": [
    "洞察1：深层次的数据解读和规律发现",
    "洞察2：..."
  ],
  "anomalies": [
    "异常1：描述异常情况、时间点及可能原因",
    "异常2：..."
  ],
  "recommendations": [
    "建议1：具体可执行的优化建议",
    "建议2：..."
  ],
  "risks": [
    "风险1：潜在的运维风险和预警",
    "风险2：..."
  ]
}

要求：
- 基于实际数据进行分析，不要泛泛而谈
- 使用专业术语，但保持易懂
- 每个发现都要有数据支撑（具体数值、时间点等）
- 建议要具体可行，不要空洞
- **只输出 JSON 格式，不要有任何其他说明文字或 markdown 标记**
```

### User Message（使用表达式）

**重要**：在 n8n OpenAI 节点的 User Message 中，需要使用 **Expression** 模式，并使用以下表达式：

```javascript
请分析以下泵站监测数据：

【查询信息】
- 查询名称：{{ $json.body.metadata.queryName }}
- 时间范围：{{ $json.body.metadata.timeRange.start }} 至 {{ $json.body.metadata.timeRange.end }}
- 数据点数：{{ $json.body.data.length }}
- 监测指标：{{ $json.body.metadata.indicators ? $json.body.metadata.indicators.join('、') : '未指定' }}

【数据样本】（前10条和后10条）
前10条：
{{ JSON.stringify($json.body.data.slice(0, 10), null, 2) }}

后10条：
{{ JSON.stringify($json.body.data.slice(-10), null, 2) }}

【用户分析目标】
{{ $json.body.prompt }}

请基于以上数据进行深度分析，输出 JSON 格式的分析报告。注意：只输出 JSON，不要有其他文字。
```

**注意事项**：
1. 在 OpenAI 节点的 User Message 字段中，点击右侧的 **表达式图标**（fx）切换到表达式模式
2. Webhook 接收的数据在 `$json.body` 中，不是直接在 `$json` 中
3. 如果使用 `$input.first().json`，则直接访问 `$input.first().json.data`、`$input.first().json.metadata` 等

---

## 第三步：格式化返回结果

添加 **Code** 节点，解析和格式化 AI 的分析结果：

```javascript
// 解析 AI 分析结果
// OpenAI 节点的输出在 $input.first().json 中
const inputData = $input.first().json;

// 尝试多种可能的路径获取 AI 响应内容
let llmResponse;

// 处理 AI Agent 节点返回的格式：{ output: "..." }
if (inputData.output) {
  llmResponse = inputData.output;
}
// 处理标准 OpenAI 节点格式
else if (inputData.message && inputData.message.content) {
  llmResponse = inputData.message.content;
} else if (inputData.content) {
  llmResponse = inputData.content;
} else if (inputData.text) {
  llmResponse = inputData.text;
} else if (typeof inputData === 'string') {
  llmResponse = inputData;
} else {
  // 如果都不是，尝试直接解析整个输入
  llmResponse = JSON.stringify(inputData);
}

let analysisResult;
try {
  // 尝试提取 JSON（处理可能的 markdown 包裹）
  let jsonText = llmResponse;
  
  // 移除可能的 markdown 代码块标记
  const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }
  
  // 尝试直接匹配 JSON 对象
  const directMatch = jsonText.match(/\{[\s\S]*\}/);
  if (directMatch) {
    jsonText = directMatch[0];
  }
  
  // 解析 JSON
  analysisResult = JSON.parse(jsonText);
  
  // 确保所有必需字段存在
  analysisResult = {
    summary: analysisResult.summary || '分析完成',
    findings: analysisResult.findings || [],
    insights: analysisResult.insights || [],
    anomalies: analysisResult.anomalies || [],
    recommendations: analysisResult.recommendations || [],
    risks: analysisResult.risks || []
  };
  
  return {
    json: {
      success: true,
      executionId: $workflow.id + '_' + Date.now(),
      result: analysisResult
    }
  };
  
} catch (error) {
  // 解析失败时的降级处理
  return {
    json: {
      success: false,
      error: 'AI 响应解析失败: ' + error.message,
      rawResponse: llmResponse ? llmResponse.substring(0, 500) : 'No response',
      debugInfo: {
        inputKeys: Object.keys(inputData),
        inputSample: JSON.stringify(inputData).substring(0, 200)
      }
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

1. **Webhook** - 接收查询结果数据和用户提示词
2. **AI 模型分析** (OpenAI/Claude/通义千问) - AI 进行数据洞察和专业分析
3. **格式化返回** (Code) - 解析和格式化最终报告

**总共 3 个节点**，简洁高效。

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
