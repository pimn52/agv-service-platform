'use client';

import { useState, useEffect } from 'react';
import { useAppStore, useOrderStore, useUserStore, useAuthStore } from '@/store';
import type { SubPage } from '@/store';
import { computeRebate, type RebateResult } from '@/lib/rebate';
import { DEMO_DISPATCH_FTL_MS, DEMO_DISPATCH_LTL_MS } from '@/components/home/use-demo-timers';
import { CheckCircle, Loader2, Truck, Coins } from 'lucide-react';

type PaymentResultData = { success?: boolean; orderId?: string; vehicleName?: string };

export function PaymentResultPage({ page }: { page: SubPage }) {
  const { pushPage, setActiveTab, clearPages, addNotification } = useAppStore();
  const updateBalance = useUserStore((s) => s.updateBalance);
  const [dispatching, setDispatching] = useState(true);
  const [dispatched, setDispatched] = useState(false);
  const [rebateAmount, setRebateAmount] = useState(0);
  const [rebateType, setRebateType] = useState<'full_car_discount' | 'carpool_rebate' | null>(null);

  const pageData = (page as { key: string; data?: PaymentResultData }).data;
  const success = pageData?.success ?? true;
  const orderId = pageData?.orderId ?? '';
  const demoMode = useAuthStore((s) => s.demoMode);

  useEffect(() => {
    if (!success) return;
    const timer1 = setTimeout(() => {
      setDispatching(false);
      setDispatched(true);
      // 订单状态从 pending 推进到 dispatched，触发 demo 定时器
      useOrderStore.getState().updateOrderStatus(orderId, 'dispatched');
    }, 2000);
    return () => clearTimeout(timer1);
  }, [success, orderId]);

  // 返利触发：支付成功后，从 store 中的真实订单数据计算返利
  // 注意：不能依赖 deliveryForm（组件重挂载时可能已被重置或状态丢失），
  // 应从已持久化到 orders 数组的订单对象中读取 ltlWaybills。
  useEffect(() => {
    if (!dispatched || !orderId) return;
    const order = useOrderStore.getState().getOrderById(orderId);
    if (!order || order.deliveryMode !== 'ltl') return;
    const rb: RebateResult | null = computeRebate(order);
    if (!rb || rb.carpoolRebateTotal <= 0) return;
    // full_car_discount 已在下单时通过费用明细减免，支付后无需再展示
    // carpool_rebate：下单后返利，推送到余额
    updateBalance(rb.carpoolRebateTotal * 100); // store 余额单位是分
    setRebateAmount(rb.carpoolRebateTotal);
    setRebateType('carpool_rebate');
    // 推送返利通知
    const timer2 = setTimeout(() => {
      addNotification({
        id: `rebate-${orderId}`,
        type: 'general',
        orderId,
        serviceType: 'logistics',
        title: '拼车返利',
        message: `您的${rb.partialWbCount}张运单已拼车成功，已返还 ¥${rb.carpoolRebateTotal} 至余额`,
        read: false,
        dismissed: false,
        postponed: false,
        createdAt: new Date().toISOString(),
      });
    }, 1500);
    return () => clearTimeout(timer2);
  }, [dispatched, orderId, addNotification, updateBalance]);

  const handleViewOrder = () => {
    useOrderStore.getState().setActiveOrderId(orderId);
    useOrderStore.getState().resetDeliveryForm();
    useOrderStore.getState().resetCruiseForm();
    useAppStore.getState().setDynamicsTab('logistics');
    setActiveTab('tracking');
    clearPages();
  };

  const handleBackHome = () => {
    useOrderStore.getState().resetDeliveryForm();
    useOrderStore.getState().resetCruiseForm();
    // 返回首页时定位到新建订单对应的 Tab 和卡片
    useAppStore.getState().setDynamicsTab('logistics');
    if (orderId) {
      useOrderStore.getState().setActiveOrderId(orderId);
    }
    setActiveTab('home');
    clearPages();
  };

  if (!success) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F5F6FA] px-8">
        <div className="w-16 h-16 rounded-full bg-[#FFF1F0] flex items-center justify-center mb-4">
          <span className="text-2xl">✕</span>
        </div>
        <p className="text-[16px] font-medium text-[#1A1A1A] mb-1">支付失败</p>
        <p className="text-[13px] text-[#999999] mb-6">请重新尝试支付</p>
        <button
          onClick={() => useAppStore.getState().popPage()}
          className="w-full py-3 bg-[#1677FF] text-white rounded-lg text-[14px] font-medium"
        >
          重新支付
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#F5F6FA] px-8">
      {/* 支付成功 */}
      <div className="w-16 h-16 rounded-full bg-[#F6FFED] flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-[#52C41A]" />
      </div>
      <p className="text-[16px] font-medium text-[#1A1A1A] mb-1">支付成功</p>
      <p className="text-[13px] text-[#999999] mb-6">订单号：{orderId}</p>

      {/* 调度状态 */}
      {dispatching && (
        <div className="flex items-center gap-2 text-[13px] text-[#1677FF] mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>正在为您调度车辆...</span>
        </div>
      )}

      {dispatched && (
        <div className="w-full bg-white rounded-xl p-4 shadow-sm mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E6F0FF] flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#1677FF]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1A1A1A]">车辆调度成功</p>
              <p className="text-[11px] text-[#999999]">无人车正在前往发货地</p>
            </div>
          </div>
        </div>
      )}

      {dispatched && demoMode && (() => {
        const order = useOrderStore.getState().getOrderById(orderId)
        const isFTL = order?.deliveryMode === 'full_load'
        const delaySec = (isFTL ? DEMO_DISPATCH_FTL_MS : DEMO_DISPATCH_LTL_MS) / 1000
        return (
          <div className="w-full bg-[#FFFBE6] rounded-xl p-3 shadow-sm mb-6 border border-[#FAAD14]/20">
            <p className="text-[11px] text-[#666] leading-relaxed">
              您的订单已进入演示流转，系统将在 <span className="text-[#1677FF] font-medium">{delaySec} 秒</span> 后模拟车辆到达。
              生产环境中，车辆到达时间由 GPS 实时计算。
            </p>
          </div>
        )
      })()}

      {rebateAmount > 0 && rebateType === 'carpool_rebate' && (
        <div className="w-full bg-[#F6FFED] rounded-xl p-4 shadow-sm mb-6 border border-[#B7EB8F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#52C41A]/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#52C41A]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#52C41A]">拼车返利已到账</p>
              <p className="text-[11px] text-[#999999]">已返还 <span className="text-[#52C41A] font-medium">¥{rebateAmount}</span> 至您的账户余额</p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="w-full space-y-2">
        <button
          onClick={handleViewOrder}
          className="w-full py-3 bg-[#1677FF] text-white rounded-lg text-[14px] font-medium hover:bg-[#0958D9] transition-colors"
        >
          查看订单详情
        </button>
        <button
          onClick={handleBackHome}
          className="w-full py-3 bg-white text-[#666666] rounded-lg text-[14px] border border-[#EEEEEE] hover:bg-[#F5F6FA] transition-colors"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
