// 时间维度
export type TimeDimension = 'minute' | 'hour' | 'day';

// 对比维度
export type ComparisonType = 'none' | 'month' | 'day';

// 运算符类型
export type OperatorType = '+' | '-' | '*' | '/' | 'avg' | 'sum' | 'max' | 'min';

// 聚合方式
export type AggregationType = 'avg' | 'max' | 'min';

// 基础指标
export interface BaseIndicator {
  id: string;
  name: string;
  indicator_id: string; // InfluxDB 中的指标 ID
  aggregation?: AggregationType; // 聚合方式：avg(均值), max(最大值), min(最小值)，默认为均值
  visible?: boolean; // 是否在图表和导出中显示，默认为 true
}

// 扩展指标（通过运算规则生成）
export interface ExtendedIndicator {
  id: string;
  name: string;
  formula: string; // 运算公式，例如: "i1 + i2", "i1 / i2 * 100"
  baseIndicators: string[]; // 依赖的基础指标 ID 列表
}

// 分析配置
export interface AnalysisConfig {
  id?: number;
  name: string;
  description?: string;
  baseIndicators: BaseIndicator[];
  extendedIndicators: ExtendedIndicator[];
  timeDimension: TimeDimension;
  createdAt?: Date;
  updatedAt?: Date;
}

// 查询参数
export interface QueryParams {
  analysisId: number;
  startTime: string; // ISO 8601 格式
  endTime: string;
  comparisonType: ComparisonType;
  selectedMonths?: string[]; // 选中的月份列表，格式: YYYY-MM
}

// InfluxDB 数据点
export interface DataPoint {
  time: string;
  value: number;
  indicator_id: string;
}

// 分析结果数据行
export interface AnalysisDataRow {
  timestamp: string;
  [key: string]: number | string; // 动态字段：指标名称 -> 值
}

// 分析结果
export interface AnalysisResult {
  config: AnalysisConfig;
  data: AnalysisDataRow[];
  comparisonType: ComparisonType;
  timeRange: {
    start: string;
    end: string;
  };
}

// API 响应
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
