# 泵房数据分析系统

基于 Next.js 和 InfluxDB 的泵房数据分析和可视化系统。

## 功能特性

### 1. 分析配置管理
- ✅ 创建、编辑、删除分析配置
- ✅ 定义基础指标（从 InfluxDB 查询）
- ✅ 定义扩展指标（通过运算规则计算）
- ✅ 支持多种时间维度（分钟、小时、日）

### 2. 数据查询分析
- ✅ 从 InfluxDB 查询时序数据
- ✅ 自动计算扩展指标
- ✅ 支持时间范围选择
- ✅ 支持按月份、按日对比分析

### 3. 数据可视化
- ✅ 表格展示（支持导出 CSV）
- ✅ 图表展示（折线图、柱状图）
- ✅ 对比模式可视化
- ✅ 响应式设计

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **图表**: Recharts
- **数据源**: InfluxDB 2.x
- **数据库**: MySQL 8.0
- **部署**: Node.js 18+

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

首先确保 MySQL 数据库 `data_analysis` 已创建，然后运行：

```bash
# 启动开发服务器
npm run dev

# 访问初始化接口
curl -X POST http://localhost:3000/api/init
```

这将自动创建 `analysis_configs` 表。

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 生产构建

```bash
npm run build
npm start
```

## 使用指南

### 创建分析配置

1. 进入"分析配置管理"标签
2. 点击"新建配置"
3. 填写配置信息：
   - **配置名称**: 给分析配置起一个名字
   - **描述**: 可选，描述这个配置的用途
   - **时间维度**: 选择数据聚合的时间粒度
   - **基础指标**: 添加需要从 InfluxDB 查询的指标
     - 指标名称: 显示名称
     - 指标 ID: InfluxDB 中的 indicator_id
   - **扩展指标**: 添加通过计算得到的指标
     - 指标名称: 显示名称
     - 计算公式: 使用基础指标 ID 编写公式

### 扩展指标公式示例

```javascript
// 简单加法
i1 + i2

// 百分比计算
(i1 - i2) / i3 * 100

// 复杂公式
(i1 + i2) / 2 - i3 * 0.5
```

支持的运算符：`+`, `-`, `*`, `/`, `(`, `)`

### 查询数据

1. 进入"数据查询分析"标签
2. 选择分析配置
3. 设置时间范围
4. 选择对比方式（可选）：
   - **不对比**: 显示所有数据在一起
   - **按月对比**: 按月份分组，在同一图表中对比
   - **按日对比**: 按日期分组，在同一图表中对比
5. 点击"开始查询"
6. 在表格和图表之间切换查看结果
7. 导出 CSV 数据（表格模式）

## 数据库配置

### MySQL 配置

在 `src/lib/db.ts` 中配置：

```typescript
const TARGET_DB_CONFIG = {
  host: 'gz-cdb-e3z4b5ql.sql.tencentcdb.com',
  port: 63453,
  user: 'root',
  password: 'zsj12345678',
  database: 'data_analysis',
  charset: 'utf8mb4',
};
```

### InfluxDB 配置

在 `src/lib/influxdb.ts` 中配置：

```typescript
const INFLUX_CONFIG = {
  url: 'http://43.139.93.159:8086',
  token: 'your-token',
  org: 'watersAI',
  bucket: 'metricsData',
};
```

## API 接口

### 分析配置管理

- `GET /api/analysis` - 获取所有配置
- `GET /api/analysis?id={id}` - 获取单个配置
- `POST /api/analysis` - 创建配置
- `PUT /api/analysis` - 更新配置
- `DELETE /api/analysis?id={id}` - 删除配置

### 数据查询

- `POST /api/query` - 查询数据

请求体：
```json
{
  "analysisId": 1,
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-31T23:59:59Z",
  "comparisonType": "month"
}
```

### 数据库初始化

- `POST /api/init` - 初始化数据库表

## 项目结构

```
data_anlysis/
├── src/
│   ├── app/
│   │   ├── api/              # API 路由
│   │   │   ├── analysis/     # 分析配置 CRUD
│   │   │   ├── query/        # 数据查询
│   │   │   └── init/         # 数据库初始化
│   │   ├── layout.tsx        # 根布局
│   │   ├── page.tsx          # 主页面
│   │   └── globals.css       # 全局样式
│   ├── components/           # React 组件
│   │   ├── AnalysisConfigManager.tsx  # 配置管理
│   │   ├── DataQueryPanel.tsx         # 查询面板
│   │   ├── DataTable.tsx              # 数据表格
│   │   └── DataChart.tsx              # 数据图表
│   ├── lib/                  # 工具库
│   │   ├── db.ts            # MySQL 连接
│   │   ├── influxdb.ts      # InfluxDB 连接
│   │   └── calculator.ts    # 扩展指标计算
│   └── types/               # TypeScript 类型定义
│       └── index.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 注意事项

1. **时间格式**: 所有时间使用 ISO 8601 格式（UTC）
2. **指标 ID**: 扩展指标公式中使用的指标 ID 必须是基础指标的 indicator_id
3. **数据量**: 大量数据查询可能需要较长时间，建议合理设置时间范围
4. **对比模式**: 对比模式下，数据会按选定的维度分组显示

## 故障排查

### 数据库连接失败
- 检查 MySQL 配置是否正确
- 确认数据库已创建
- 检查网络连接和防火墙设置

### InfluxDB 查询失败
- 检查 InfluxDB 配置是否正确
- 确认 token 有读取权限
- 检查 indicator_id 是否存在

### 扩展指标计算错误
- 检查公式语法是否正确
- 确认使用的指标 ID 存在于基础指标中
- 查看浏览器控制台的错误信息

## 开发计划

- [ ] 支持更多聚合函数（max, min, sum, avg）
- [ ] 支持数据导出为 Excel
- [ ] 支持自定义图表配置
- [ ] 支持数据缓存优化
- [ ] 支持用户权限管理

## 许可证

MIT
