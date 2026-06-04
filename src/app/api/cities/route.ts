import { NextResponse } from 'next/server';

/**
 * GET /api/cities - 获取支持的城市列表
 */
export async function GET() {
  // TODO: 从数据库/配置查询支持的城市
  return NextResponse.json({
    success: true,
    data: [],
    message: 'API endpoint ready - awaiting backend integration',
  });
}
