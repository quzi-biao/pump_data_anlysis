import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ImportConfig, ImportResult } from '@/types';
import * as XLSX from 'xlsx';

function parseDate(dateStr: string, format?: string): Date | null {
  if (!dateStr) return null;
  
  // 将所有 Unicode 空白字符（包括韩文空格等）替换为普通空格，然后去除首尾空格
  const str = String(dateStr)
    .replace(/[\s\u3164\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    .trim()
    .replace(/\s+/g, ' '); // 将多个连续空格合并为一个
  
  const patterns = [
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/,
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/,
  ];
  
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);
      const hour = match[4] ? parseInt(match[4]) : 0;
      const minute = match[5] ? parseInt(match[5]) : 0;
      const second = match[6] ? parseInt(match[6]) : 0;
      
      return new Date(year, month, day, hour, minute, second);
    }
  }
  
  return null;
}

function getTableName(dataType: string): string {
  switch (dataType) {
    case 'day':
      return 'data_daily_import';
    case 'hour':
      return 'data_hour_import';
    case 'minute':
    default:
      return 'data_import';
  }
}

function formatDateForDB(date: Date, dataType: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  if (dataType === 'day') {
    return `${year}-${month}-${day}`;
  } else {
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const configStr = formData.get('config') as string;
    
    if (!file || !configStr) {
      return NextResponse.json(
        { success: false, error: 'File and config are required' },
        { status: 400 }
      );
    }

    const config: ImportConfig = JSON.parse(configStr);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rawData || rawData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data found in file' },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      success: true,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    const tableName = getTableName(config.dataType);
    const labelMapping = new Map(config.labelMappings.map(m => [m.original, m.mapped]));

    const dataRows: Array<{ timestamp: string; label1: string; label2: string | null; value: number }> = [];

    if (config.dataFormat === 'column') {
      const dateRow = rawData[config.startRow - 1];
      const labelColumn = config.startColumn - 1;
      
      for (let colIdx = config.startColumn; colIdx < dateRow.length; colIdx++) {
        const dateValue = dateRow[colIdx];
        const parsedDate = parseDate(dateValue, config.dateFormat);
        
        if (!parsedDate) {
          result.errors?.push(`Invalid date at column ${colIdx + 1}: ${dateValue}`);
          continue;
        }
        
        const timestamp = formatDateForDB(parsedDate, config.dataType);
        
        for (let rowIdx = config.startRow; rowIdx < rawData.length; rowIdx++) {
          const row = rawData[rowIdx];
          const originalLabel = String(row[labelColumn] || '').trim();
          
          if (!originalLabel) continue;
          
          const label1 = labelMapping.get(originalLabel) || originalLabel;
          const value = parseFloat(row[colIdx]);
          
          if (isNaN(value)) continue;
          
          dataRows.push({
            timestamp,
            label1,
            label2: null,
            value,
          });
        }
      }
    } else {
      const labelRow = rawData[config.startRow - 1];
      const dateColumn = config.startColumn - 1;
      
      for (let rowIdx = config.startRow; rowIdx < rawData.length; rowIdx++) {
        const row = rawData[rowIdx];
        const dateValue = row[dateColumn];
        const parsedDate = parseDate(dateValue, config.dateFormat);
        
        if (!parsedDate) {
          result.errors?.push(`Invalid date at row ${rowIdx + 1}: ${dateValue}`);
          continue;
        }
        
        const timestamp = formatDateForDB(parsedDate, config.dataType);
        
        for (let colIdx = config.startColumn; colIdx < row.length; colIdx++) {
          const originalLabel = String(labelRow[colIdx] || '').trim();
          
          if (!originalLabel) continue;
          
          const label1 = labelMapping.get(originalLabel) || originalLabel;
          const value = parseFloat(row[colIdx]);
          
          if (isNaN(value)) continue;
          
          dataRows.push({
            timestamp,
            label1,
            label2: null,
            value,
          });
        }
      }
    }

    for (const dataRow of dataRows) {
      try {
        await query(
          `INSERT INTO ${tableName} (timestamp, label1, label2, value) 
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
          [dataRow.timestamp, dataRow.label1, dataRow.label2, dataRow.value]
        );
        
        const affectedRows = await query<any>(
          `SELECT ROW_COUNT() as count`
        );
        
        if (affectedRows[0].count === 1) {
          result.inserted++;
        } else if (affectedRows[0].count === 2) {
          result.updated++;
        }
      } catch (error) {
        result.failed++;
        result.errors?.push(`Failed to insert/update: ${dataRow.timestamp} - ${dataRow.label1}`);
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to import data:', error);
    return NextResponse.json(
      { success: false, error: `Failed to import data: ${error}` },
      { status: 500 }
    );
  }
}
