import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';
import { ApiResponse } from '@/types';

export async function POST() {
  try {
    await initDatabase();
    return NextResponse.json<ApiResponse<null>>({
      success: true,
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to initialize database',
    }, { status: 500 });
  }
}
