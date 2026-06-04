import { NextResponse } from 'next/server';

/**
 * GET /api/orders/[id] - 获取订单详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // TODO: 从数据库查询订单详情
  return NextResponse.json({
    success: true,
    data: { id },
    message: 'API endpoint ready - awaiting backend integration',
  });
}

/**
 * PUT /api/orders/[id] - 更新订单
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // TODO: 更新订单状态
  return NextResponse.json({
    success: true,
    data: { id },
    message: 'API endpoint ready - awaiting backend integration',
  });
}
