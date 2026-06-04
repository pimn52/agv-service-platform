import { NextResponse } from 'next/server';

/**
 * GET /api/orders - 获取订单列表
 * 后续对接真实数据库
 */
export async function GET(request: Request) {
  // TODO: 从数据库查询订单列表
  return NextResponse.json({
    success: true,
    data: [],
    message: 'API endpoint ready - awaiting backend integration',
  });
}

/**
 * POST /api/orders - 创建订单
 */
export async function POST(request: Request) {
  // TODO: 写入数据库创建订单
  return NextResponse.json({
    success: true,
    data: null,
    message: 'API endpoint ready - awaiting backend integration',
  });
}
