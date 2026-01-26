export type ChartType = 'line' | 'bar' | 'area' | 'scatter';

export interface BackgroundZone {
  id: string;
  start: number;
  end: number;
  color: string;
  label: string;
  showAverage?: boolean;
  averageLineColor?: string;
}

export interface LineStyle {
  color: string;
  thickness: number;
}

export interface MonthMetricStyle {
  color: string;
  thickness: number;
  chartType: ChartType;
  visible: boolean;
}

export interface NormalMetricStyle {
  color: string;
  thickness: number;
  backgroundZones: BackgroundZone[];
  chartType: ChartType;
  visible: boolean;
  chartGroup?: string;
  chartHeight?: number;
}

export interface ComparisonMetricStyle {
  monthStyles: Record<string, MonthMetricStyle>;
  backgroundZones: BackgroundZone[];
  chartHeight?: number;
  chartGroup?: string;
}
