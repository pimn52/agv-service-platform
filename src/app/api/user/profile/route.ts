import { NextResponse } from 'next/server';

/**
 * GET /api/user/profile - 获取用户信息
 */
export async function GET() {
  // TODO: 从数据库查询用户信息
  return NextResponse.json({
    success: true,
    data: null,
    message: 'API endpoint ready - awaiting backend integration',
  });
}

/**
 * PUT /api/user/profile - 更新用户信息
 */
export async function PUT(request: Request) {
  // TODO: 更新用户信息
  return NextResponse.json({
    success: true,
    data: null,
    message: 'API endpoint ready - awaiting backend integration',
  });
}
