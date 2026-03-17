import { InfluxDB } from '@influxdata/influxdb-client';
import { DataPoint, TimeDimension } from '@/types';

const INFLUX_CONFIG = {
  url: 'http://43.139.93.159:8086',
  token: 'oPeLbhvS-3OymtJj9z_XmQa7DyvHJHkbh_l-NFYUYYhXBSFHuIElzHy4ULWizikeGLKAiu7D57rhoGEp2cVOZA==',
  org: 'watersAI',
  bucket: 'metricsData',
};

let influxDB: InfluxDB | null = null;

export function getInfluxDB(): InfluxDB {
  if (!influxDB) {
    influxDB = new InfluxDB({
      url: INFLUX_CONFIG.url,
      token: INFLUX_CONFIG.token,
    });
  }
  return influxDB;
}

function getAggregationWindow(timeDimension: TimeDimension): string {
  switch (timeDimension) {
    case 'minute':
      return '1m';
    case 'hour':
      return '1h';
    case 'day':
      return '1d';
    case 'month':
      return '30d'; // InfluxDB 使用 30 天作为月度聚合窗口
    default:
      return '1m';
  }
}

export async function queryIndicatorData(
  indicatorId: string,
  startTime: string,
  endTime: string,
  timeDimension: TimeDimension = 'minute',
  aggregationType: string = 'avg'
): Promise<DataPoint[]> {
  const queryApi = getInfluxDB().getQueryApi(INFLUX_CONFIG.org);

  // 根据聚合类型使用对应的 InfluxDB 聚合函数
  let aggregateFn: string;
  switch (aggregationType) {
    case 'avg':
      aggregateFn = 'mean';
      break;
    case 'max':
      aggregateFn = 'max';
      break;
    case 'min':
      aggregateFn = 'min';
      break;
    case 'sum':
      aggregateFn = 'sum';
      break;
    case 'weighted_avg':
      // InfluxDB 不直接支持加权平均，使用均值
      // 加权平均主要用于 MySQL 导入数据
      aggregateFn = 'mean';
      break;
    default:
      aggregateFn = 'mean';
  }
  
  let query: string;
  
  // 月度聚合：使用 aggregateWindow 并设置 offset 对齐到月初
  if (timeDimension === 'month') {
    query = `
      from(bucket: "${INFLUX_CONFIG.bucket}")
      |> range(start: ${startTime}, stop: ${endTime})
      |> filter(fn: (r) => 
          r["_measurement"] == "plcData" and
          r["_field"] == "value" and
          r["indicator_id"] == "${indicatorId}")
      |> aggregateWindow(every: 1mo, fn: ${aggregateFn}, createEmpty: false, timeSrc: "_start")
    `;
  } else {
    const aggregationWindow = getAggregationWindow(timeDimension);
    query = `
      from(bucket: "${INFLUX_CONFIG.bucket}")
      |> range(start: ${startTime}, stop: ${endTime})
      |> filter(fn: (r) => 
          r["_measurement"] == "plcData" and
          r["_field"] == "value" and
          r["indicator_id"] == "${indicatorId}")
      |> aggregateWindow(every: ${aggregationWindow}, fn: ${aggregateFn}, createEmpty: false, offset: 0s)
    `;
  }

  const dataPoints: DataPoint[] = [];

  return new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        dataPoints.push({
          time: o._time,
          value: parseFloat(o._value),
          indicator_id: indicatorId,
        });
      },
      error(error) {
        console.error('InfluxDB query error:', error);
        reject(error);
      },
      complete() {
        resolve(dataPoints);
      },
    });
  });
}

export async function queryPressureData(
  sn: string,
  startTime: string,
  endTime: string,
  timeDimension: TimeDimension = 'minute',
  aggregationType: string = 'avg'
): Promise<DataPoint[]> {
  const queryApi = getInfluxDB().getQueryApi(INFLUX_CONFIG.org);

  let aggregateFn: string;
  switch (aggregationType) {
    case 'avg':
      aggregateFn = 'mean';
      break;
    case 'max':
      aggregateFn = 'max';
      break;
    case 'min':
      aggregateFn = 'min';
      break;
    case 'sum':
      aggregateFn = 'sum';
      break;
    case 'weighted_avg':
      // InfluxDB 不直接支持加权平均，使用均值
      aggregateFn = 'mean';
      break;
    default:
      aggregateFn = 'mean';
  }
  
  let query: string;
  
  // 月度聚合：使用 aggregateWindow 并设置 timeSrc 对齐到窗口开始
  if (timeDimension === 'month') {
    query = `
      from(bucket: "pressData")
      |> range(start: ${startTime}, stop: ${endTime})
      |> filter(fn: (r) => 
          r["_measurement"] == "pressureData" and
          r["_field"] == "press" and
          r["sn"] == "${sn}")
      |> aggregateWindow(every: 1mo, fn: ${aggregateFn}, createEmpty: false, timeSrc: "_start")
    `;
  } else {
    const aggregationWindow = getAggregationWindow(timeDimension);
    query = `
      from(bucket: "pressData")
      |> range(start: ${startTime}, stop: ${endTime})
      |> filter(fn: (r) => 
          r["_measurement"] == "pressureData" and
          r["_field"] == "press" and
          r["sn"] == "${sn}")
      |> aggregateWindow(every: ${aggregationWindow}, fn: ${aggregateFn}, createEmpty: false, offset: 0s)
    `;
  }

  console.log('Pressure query for SN:', sn);
  console.log('Query:', query);

  const dataPoints: DataPoint[] = [];

  return new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        dataPoints.push({
          time: o._time,
          value: parseFloat(o._value),
          indicator_id: `P:${sn}`,
        });
      },
      error(error) {
        console.error('InfluxDB pressure query error for SN:', sn, error);
        reject(error);
      },
      complete() {
        // 按时间排序
        dataPoints.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        
        console.log(`Pressure query complete for SN ${sn}: ${dataPoints.length} points`);
        if (dataPoints.length > 0) {
          console.log('First 3 pressure data points:', dataPoints.slice(0, 3).map(p => ({ time: new Date(p.time).toISOString(), value: p.value })));
          console.log('Last 3 pressure data points:', dataPoints.slice(-3).map(p => ({ time: new Date(p.time).toISOString(), value: p.value })));
        }
        resolve(dataPoints);
      },
    });
  });
}

export async function queryMultipleIndicators(
  indicatorIds: string[],
  startTime: string,
  endTime: string,
  timeDimension: TimeDimension = 'minute',
  indicatorAggregations?: Map<string, string>
): Promise<Map<string, DataPoint[]>> {
  const results = new Map<string, DataPoint[]>();

  await Promise.all(
    indicatorIds.map(async (indicatorId) => {
      const aggregationType = indicatorAggregations?.get(indicatorId) || 'avg';
      
      const data = await queryIndicatorData(
        indicatorId,
        startTime,
        endTime,
        timeDimension,
        aggregationType
      );
      results.set(indicatorId, data);
    })
  );

  return results;
}
