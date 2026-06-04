'use client';

import type { SubPage } from '@/store';
import type { Order } from '@/types';
import { useOrderStore, useAppStore } from '@/store';
import { Package, MapPin, Clock, FileText } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待调度', color: '#FAAD14' },
  dispatching: { label: '调度中', color: '#1677FF' },
  in_transit: { label: '配送中', color: '#1677FF' },
  arrived: { label: '已到达', color: '#1677FF' },
  completed: { label: '已完成', color: '#52C41A' },
  cancelled: { label: '已取消', color: '#FF4D4F' },
  loading: { label: '装货中', color: '#1677FF' },
  unloaded: { label: '已卸货', color: '#52C41A' },
  selling: { label: '贩卖中', color: '#1677FF' },
  paused: { label: '已暂停', color: '#FAAD14' },
  patrolling: { label: '巡检中', color: '#1677FF' },
};

const SERVICE_TYPE_MAP: Record<string, string> = {
  logistics: '物流配送',
  vending: '巡游贩卖',
  security: '安防巡检',
};

export function OrderDetailPage({ page }: { page: SubPage }) {
  const { orders } = useOrderStore();
  const { pushPage } = useAppStore();
  const pageData = (page as { key: string; data?: { orderId?: string } }).data;
  const orderId = pageData?.orderId ?? '';
  const order = orders.find((o: Order) => o.id === orderId);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F5F6FA]">
        <p className="text-[14px] text-[#999999]">订单不存在</p>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#999999' };

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-20">
        {/* 订单状态 */}
        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] text-[#666666]">订单状态</span>
            <span className="text-[13px] font-medium" style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </span>
          </div>
          <div className="text-[11px] text-[#999999]">订单号：{order.id}</div>
        </div>

        {/* 服务信息 */}
        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <p className="text-[13px] font-medium text-[#1A1A1A] mb-3">服务信息</p>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[12px]">
              <Package className="w-4 h-4 text-[#1677FF]" />
              <span className="text-[#666666]">服务类型</span>
              <span className="ml-auto text-[#1A1A1A]">{SERVICE_TYPE_MAP[order.serviceType] || order.serviceType}</span>
            </div>
            {order.vehicleName && (
              <div className="flex items-center gap-2 text-[12px]">
                <Package className="w-4 h-4 text-[#1677FF]" />
                <span className="text-[#666666]">车辆</span>
                <span className="ml-auto text-[#1A1A1A]">{order.vehicleName}</span>
              </div>
            )}
            {order.destination && (
              <div className="flex items-center gap-2 text-[12px]">
                <MapPin className="w-4 h-4 text-[#1677FF]" />
                <span className="text-[#666666]">目的地</span>
                <span className="ml-auto text-[#1A1A1A]">{order.destination.address}</span>
              </div>
            )}
            {order.estimatedTime && (
              <div className="flex items-center gap-2 text-[12px]">
                <Clock className="w-4 h-4 text-[#1677FF]" />
                <span className="text-[#666666]">预计时间</span>
                <span className="ml-auto text-[#1A1A1A]">{order.estimatedTime}分钟</span>
              </div>
            )}
          </div>
        </div>

        {/* 费用信息 */}
        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <p className="text-[13px] font-medium text-[#1A1A1A] mb-3">费用信息</p>
          <div className="flex justify-between text-[12px]">
            <span className="text-[#666666]">订单金额</span>
            <span className="text-[#1A1A1A] font-medium">¥{((order.estimatedCost ?? 0) / 100).toFixed(2)}</span>
          </div>
          {order.actualCost !== undefined && order.actualCost > 0 && (
            <div className="flex justify-between text-[12px] mt-2">
              <span className="text-[#666666]">实际费用</span>
              <span className="text-[#FF4D4F] font-medium">¥{(order.actualCost / 100).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* 开票 */}
        {(order.status === 'completed') && (
          <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
            <button
              onClick={() => pushPage({ key: 'invoice', data: { orderId: order.id } })}
              className="flex items-center gap-2 w-full text-left"
            >
              <FileText className="w-4 h-4 text-[#1677FF]" />
              <span className="text-[13px] text-[#1A1A1A]">申请开票</span>
              <span className="ml-auto text-[#CCCCCC]">&gt;</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
