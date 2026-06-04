'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import type { SubPage } from '@/store';
import { CheckCircle, Loader2, Truck } from 'lucide-react';

type PaymentResultData = { success?: boolean; orderId?: string; vehicleName?: string };

export function PaymentResultPage({ page }: { page: SubPage }) {
  const { pushPage, setActiveTab, clearPages } = useAppStore();
  const [dispatching, setDispatching] = useState(true);
  const [dispatched, setDispatched] = useState(false);

  const pageData = (page as { key: string; data?: PaymentResultData }).data;
  const success = pageData?.success ?? true;
  const orderId = pageData?.orderId ?? '';

  useEffect(() => {
    if (!success) return;
    const timer1 = setTimeout(() => {
      setDispatching(false);
      setDispatched(true);
    }, 2000);
    return () => clearTimeout(timer1);
  }, [success]);

  const handleViewOrder = () => {
    setActiveTab('tracking');
    clearPages();
  };

  const handleBackHome = () => {
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
        <div className="w-full bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E6F0FF] flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#1677FF]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1A1A1A]">车辆调度成功</p>
              <p className="text-[11px] text-[#999999]">无人车正在前往取货点</p>
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
