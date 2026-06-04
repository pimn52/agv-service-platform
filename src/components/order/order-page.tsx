'use client';

import { useState } from 'react';
import { useAppStore, useOrderStore } from '@/store';
import type { Order, ServiceType } from '@/types';
import { SERVICES } from '@/constants/services';
import { STATUS_LABELS } from '@/constants/status-labels';
import { Truck, ShoppingCart, Shield, ChevronRight, FileText, MapPin, Trash2 } from 'lucide-react';

const SERVICE_ICONS: Record<ServiceType, typeof Truck> = {
  logistics: Truck,
  vending: ShoppingCart,
  security: Shield,
};

type FilterKey = 'all' | 'active' | 'completed';

export function OrderPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const { orders, setOrderFilter, getOrdersByFilter, setActiveOrderId } = useOrderStore();
  const { pushPage, setTrackingOrderId, setActiveTab } = useAppStore();

  const filteredOrders = getOrdersByFilter();

  const handleOrderClick = (order: Order) => {
    if (order.status !== 'completed' && order.status !== 'cancelled') {
      setTrackingOrderId(order.id);
      setActiveOrderId(order.id);
      setActiveTab('tracking');
    } else {
      pushPage({ key: 'order-detail', data: { orderId: order.id } });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* 标题栏 */}
      <div className="flex items-center justify-center h-[44px] bg-white border-b border-[var(--border)] flex-shrink-0">
        <h1 className="text-[16px] font-semibold text-[#1A1A1A]">我的订单</h1>
      </div>

      {/* 筛选Tab */}
      <div className="flex bg-white border-b border-[var(--border)] flex-shrink-0">
        {([
          { key: 'all' as FilterKey, label: '全部' },
          { key: 'active' as FilterKey, label: '进行中' },
          { key: 'completed' as FilterKey, label: '已完成' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setOrderFilter(key); }}
            className={`flex-1 py-2.5 text-[13px] transition-colors relative ${
              filter === key ? 'text-[#1677FF] font-medium' : 'text-[#666]'
            }`}
          >
            {label}
            {filter === key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#1677FF] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 订单列表 */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-3 space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText size="40" strokeWidth={1.2} className="text-[#DDD] mb-3" />
            <p className="text-[14px] text-[#999]">暂无订单</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderListItem key={order.id} order={order} onClick={() => handleOrderClick(order)} />
          ))
        )}
      </div>
    </div>
  );
}

function OrderListItem({ order, onClick }: { order: Order; onClick: () => void }) {
  const config = SERVICES[order.serviceType];
  const statusConfig = STATUS_LABELS[order.status];
  const Icon = SERVICE_ICONS[order.serviceType];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="w-full bg-white rounded-xl p-3.5 shadow-sm text-left active:bg-[#FAFAFA] transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: config.bgColor }}
          >
            <Icon size="13" style={{ color: config.color }} />
          </div>
          <span className="text-[12px] text-[#999]">{config.label}</span>
          <span className="text-[12px] text-[#CCC]">#{order.id.slice(-8)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ color: statusConfig.color, backgroundColor: `${statusConfig.color}15` }}
          >
            {statusConfig.label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`确认删除订单 #${order.id.slice(-8)}？此操作不可撤销。`)) {
                useOrderStore.getState().deleteOrder(order.id);
              }
            }}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#CCC] hover:text-[#FF4D4F] hover:bg-[#FFF2F0] active:bg-[#FFE5E5] transition-colors"
            title="删除订单"
          >
            <Trash2 size="13" />
          </button>
        </div>
      </div>

      <div className="text-[13px] text-[#1A1A1A] mb-1">
        {order.serviceType === 'logistics' && (
          <span>{typeof order.senderAddress === 'string' ? order.senderAddress : order.senderAddress?.address?.split(' ')[0]} → {typeof order.receiverAddress === 'string' ? order.receiverAddress : order.receiverAddress?.address?.split(' ')[0]}</span>
        )}
        {order.serviceType === 'vending' && (
          <span>巡游贩卖 · {order.pickupLocation}</span>
        )}
        {order.serviceType === 'security' && (
          <span>安防巡检 · {order.pickupLocation}</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 text-[11px] text-[#999]">
          <span>{order.vehicleName}</span>
          <span>¥{((order.actualCost ?? order.estimatedCost ?? order.amount ?? 0) / 100).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-[#1677FF]">
          {order.status === 'completed' ? '查看详情' : '查看追踪'}
          <ChevronRight size="14" />
        </div>
      </div>
    </div>
  );
}
