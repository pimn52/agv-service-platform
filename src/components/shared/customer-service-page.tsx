'use client';

import type { SubPage } from '@/store';
import { useOrderStore } from '@/store';
import { useMemo } from 'react';

/** 从 order store 获取异常订单，生成自动话术 */
function useExceptionMessage(): string | null {
  return useMemo(() => {
    const orders = useOrderStore.getState().orders;
    const exceptionOrders = orders.filter((o) => {
      if (['completed', 'cancelled'].includes(o.status)) return false;
      if (o.deliveryMode === 'full_load' && o.ftlWaybills?.length) {
        return o.ftlWaybills.some((wb) => wb.stops?.some((s) => (s.stopStatus || 'pending') === 'exception'));
      }
      if (o.deliveryMode === 'ltl' && o.ltlWaybills) {
        return o.ltlWaybills.some((w) => w.status === 'exception');
      }
      return false;
    });
    if (exceptionOrders.length === 0) return null;

    const order = exceptionOrders[0];
    const vehicle = order.vehicleModel ? `${order.vehicleModel} · ${order.vehiclePlate}` : (order.vehicleName || '--');
    const orderId = order.id;
    let stopAddr = '';
    let stopTime = '';
    if (order.ftlWaybills?.length) {
      const allStops = order.ftlWaybills.flatMap((wb) => wb.stops);
      const exStop = allStops.find((s) => (s.stopStatus || 'pending') === 'exception');
      stopAddr = exStop?.address?.slice(0, 15) || '';
      stopTime = exStop?.handoverRecords?.[exStop.handoverRecords.length - 1]?.timestamp || '';
    } else if (order.ltlWaybills) {
      const exWb = order.ltlWaybills.find((w) => w.status === 'exception');
      stopAddr = exWb?.deliveryAddress?.slice(0, 15) || exWb?.pickupAddress?.slice(0, 15) || '';
      stopTime = exWb?.handoverRecords?.[exWb.handoverRecords.length - 1]?.timestamp || '';
    }

    return [
      `检测到您有异常订单，已为您记录：`,
      ``,
      `订单编号：${orderId}`,
      `车辆：${vehicle}`,
      `异常类型：收货方拒绝签收`,
      stopAddr ? `异常站点：${stopAddr}` : '',
      stopTime ? `异常时间：${new Date(stopTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '',
      ``,
      `建议处理方式：`,
      `1. 联系收货方确认可接收时间，安排二次配送`,
      `2. 如需人工介入，请拨打 400-8820-1668（7×24h）`,
      `3. 在订单详情中可查看交接记录了解原因`,
      ``,
      `如需重新派送，请回复可接收时间段，我们将重新调度车辆。`,
    ].filter(Boolean).join('\n');
  }, []);
}

export function CustomerServicePage({ page }: { page: SubPage }) {
  const exceptionMsg = useExceptionMessage();

  return (
    <div className="flex flex-col h-full">
      {/* 聊天区域 */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%] shadow-sm">
            <p className="text-[13px] text-[#1A1A1A]">您好！我是城市无人车服务的AI客服，请问有什么可以帮您？</p>
          </div>
        </div>

        {/* 异常订单自动话术 */}
        {exceptionMsg && (
          <div className="flex justify-start">
            <div className="bg-[#FFFBE6] rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] shadow-sm border border-[#FFE58F]">
              <p className="text-[11px] text-[#1A1A1A] whitespace-pre-line leading-relaxed">{exceptionMsg}</p>
            </div>
          </div>
        )}

        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%] shadow-sm">
            <p className="text-[13px] text-[#1A1A1A]">您可以选择以下问题，或直接输入：</p>
            <div className="mt-2 space-y-1.5">
              {['如何下单配送？', '如何查看订单状态？', '自助取件怎么操作？', '如何申请开票？'].map((q) => (
                <button key={q} className="block w-full text-left text-[12px] text-[#1677FF] py-1 active:opacity-60">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-[var(--border)]">
        <input
          type="text"
          placeholder="输入您的问题..."
          className="flex-1 h-9 bg-[#F5F6FA] rounded-full px-4 text-[13px] outline-none"
        />
        <button className="px-4 h-9 bg-[#1677FF] text-white text-[13px] rounded-full active:bg-[#0958D9] transition-colors">
          发送
        </button>
      </div>
    </div>
  );
}
