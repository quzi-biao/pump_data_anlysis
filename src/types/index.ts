// 时间维度
export type TimeDimension = 'minute' | 'hour' | 'day' | 'month';

// 数据源（用于日/月维度时选择从哪个粒度的数据聚合）
export type DataSource = 'minute' | 'hour' | 'day';

// 对比维度
export type ComparisonType = 'none' | 'month' | 'day';

// 运算符类型
export type OperatorType = '+' | '-' | '*' | '/' | 'avg' | 'sum' | 'max' | 'min';

// 聚合方式
export type AggregationType = 'avg' | 'max' | 'min' | 'sum' | 'weighted_avg';

// 基础指标
export interface BaseIndicator {
  id: string;
  name: string;
  indicator_id: string; // InfluxDB 中的指标 ID
  aggregation?: AggregationType; // 聚合方式：avg(均值), max(最大值), min(最小值), sum(求和), weighted_avg(加权平均)，默认为均值
  weightField?: string; // 加权字段，仅当 aggregation 为 weighted_avg 时使用
  visible?: boolean; // 是否在图表和导出中显示，默认为 true
  label?: string; // 关联的导入数据标签，如果存在则从 MySQL 导入表查询数据
}

// 扩展指标（通过运算规则生成）
export interface ExtendedIndicator {
  id: string;
  name: string;
  formula: string; // 运算公式，例如: "i1 + i2", "i1 / i2 * 100"
  baseIndicators: string[]; // 依赖的基础指标 ID 列表
  label?: string; // 关联的导入数据标签，如果存在则从 MySQL 查询并与计算结果合并
  visible?: boolean; // 是否在结果中显示，默认为 true
}

// 分析配置
export interface AnalysisConfig {
  id?: number;
  name: string;
  description?: string;
  baseIndicators: BaseIndicator[];
  extendedIndicators?: ExtendedIndicator[];
  timeDimension: TimeDimension; // 时间维度：minute/hour/day/month
  dataSource?: DataSource; // 数据源：从哪个粒度的数据聚合（仅对 day/month 维度有效）
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

// 数据导入相关类型

// 导入数据类型（决定导入到哪个表）
// 注意：月度数据不需要单独导入，而是从日数据按月聚合得到
export type ImportDataType = 'minute' | 'hour' | 'day';

// 数据格式（行数据/列数据）
export type DataFormat = 'row' | 'column';

// 数据标签映射
export interface LabelMapping {
  original: string; // 原始标签
  mapped: string;   // 映射后的标签
}

// 导入配置
export interface ImportConfig {
  id?: number;
  name: string;
  description?: string;
  dataType: ImportDataType; // 数据类型：minute/hour/day
  startRow: number; // 数据起始行（从1开始）
  startColumn: number; // 数据起始列（从1开始）
  dataFormat: DataFormat; // 数据格式：row(日期在第一列) 或 column(日期在第一行)
  dateFormat?: string; // 日期格式，默认支持 YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD 加上可选的 HH:mm
  defaultYear?: number; // 默认年份，当日期格式中没有年份时使用（如 MM-DD HH:mm）
  labelMappings: LabelMapping[]; // 标签映射表
  createdAt?: Date;
  updatedAt?: Date;
}

// 导入结果
export interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  failed: number;
  errors?: string[];
}
