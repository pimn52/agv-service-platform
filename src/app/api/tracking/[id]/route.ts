import { NextResponse } from 'next/server';

/**
 * GET /api/tracking/[id] - 获取追踪信息
 * 后续对接实时位置推送（WebSocket/SSE）
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // TODO: 从实时位置服务获取追踪信息
  return NextResponse.json({
    success: true,
    data: { orderId: id },
    message: 'API endpoint ready - awaiting real-time tracking integration',
  });
}
