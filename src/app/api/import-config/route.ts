import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ImportConfig } from '@/types';

export async function GET() {
  try {
    const configs = await query<any[]>(
      `SELECT 
        id, 
        name, 
        description, 
        data_type as dataType,
        start_row as startRow,
        start_column as startColumn,
        data_format as dataFormat,
        date_format as dateFormat,
        label_mappings as labelMappings,
        created_at as createdAt,
        updated_at as updatedAt
      FROM import_configs 
      ORDER BY created_at DESC`
    );

    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    console.error('Failed to fetch import configs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch import configs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const config: ImportConfig = await request.json();

    const result = await query<any>(
      `INSERT INTO import_configs 
        (name, description, data_type, start_row, start_column, data_format, date_format, label_mappings) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        config.name,
        config.description || null,
        config.dataType,
        config.startRow,
        config.startColumn,
        config.dataFormat,
        config.dateFormat || null,
        JSON.stringify(config.labelMappings),
      ]
    );

    return NextResponse.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('Failed to create import config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create import config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const config: ImportConfig = await request.json();

    if (!config.id) {
      return NextResponse.json(
        { success: false, error: 'Config ID is required' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE import_configs 
      SET name = ?, description = ?, data_type = ?, start_row = ?, start_column = ?, 
          data_format = ?, date_format = ?, label_mappings = ?
      WHERE id = ?`,
      [
        config.name,
        config.description || null,
        config.dataType,
        config.startRow,
        config.startColumn,
        config.dataFormat,
        config.dateFormat || null,
        JSON.stringify(config.labelMappings),
        config.id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update import config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update import config' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Config ID is required' },
        { status: 400 }
      );
    }

    await query('DELETE FROM import_configs WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete import config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete import config' },
      { status: 500 }
    );
  }
}
