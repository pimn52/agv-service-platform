'use client';

import { useState } from 'react';
import { useOrderStore, useAppStore } from '@/store';
import type { SubPage } from '@/store';
import type { ServiceType } from '@/types';
import { CheckCircle, CreditCard, Building2, Wallet, Receipt, ChevronRight, Shield } from 'lucide-react';

type PaymentMethod = 'balance' | 'wechat' | 'alipay' | 'invoice';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { key: 'balance', label: '账户余额', icon: Wallet },
  { key: 'wechat', label: '微信支付', icon: CreditCard },
  { key: 'alipay', label: '支付宝', icon: CreditCard },
  { key: 'invoice', label: '对公转账', icon: Building2 },
];

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  logistics: '物流配送',
  vending: '巡游贩卖',
  security: '安防巡检',
};

export function CostConfirmPage({ page }: { page: SubPage }) {
  const { costBreakdown, createOrder, resetDeliveryForm, resetCruiseForm, deliveryForm, cruiseForm } = useOrderStore();
  const { pushPage } = useAppStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('balance');
  const [paying, setPaying] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  void page;

  const cost = costBreakdown;

  // 从 page data 推断服务类型
  const pageData = page.key === 'cost-confirm' ? (page.data ?? {}) : {};
  const serviceType: ServiceType = (pageData.serviceType as ServiceType) ?? 'logistics';

  // 生成订单摘要项
  const orderSummaryItems: { label: string; value: string }[] = [
    { label: '服务类型', value: SERVICE_TYPE_LABELS[serviceType] },
  ];

  if (serviceType === 'logistics') {
    const sender = deliveryForm?.senderAddress ?? '--';
    const receiver = deliveryForm?.receiverAddress ?? '--';
    orderSummaryItems.push(
      { label: '发货地', value: sender },
      { label: '收货地', value: receiver },
      { label: '用车类型', value: deliveryForm?.deliveryMode === 'full_load' ? '整车配送' : '零担配送' },
    );
  } else if (serviceType === 'vending') {
    orderSummaryItems.push(
      { label: '取车地点', value: cruiseForm?.pickupLocation ?? '--' },
      { label: '租赁时长', value: cruiseForm?.duration ? `${cruiseForm.duration}小时` : '--' },
    );
  } else {
    orderSummaryItems.push(
      { label: '取车地点', value: cruiseForm?.pickupLocation ?? '--' },
      { label: '车辆数量', value: cruiseForm?.vehicleCount ? `${cruiseForm.vehicleCount}台` : '1台' },
    );
  }

  const handleConfirmPay = () => {
    if (!agreedTerms) return;
    setPaying(true);
    setTimeout(() => {
      const newOrderId = `ORD${Date.now()}`;
      createOrder({
        serviceType,
        actualCost: cost?.totalAmount ?? 0,
      });
      resetDeliveryForm();
      resetCruiseForm();
      setPaying(false);
      pushPage({ key: 'payment-result', data: { success: true, orderId: newOrderId } });
    }, 1500);
  };

  if (!cost) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F5F6FA]">
        <p className="text-[14px] text-[#999999]">暂无费用信息</p>
        <button
          onClick={() => useAppStore.getState().popPage()}
          className="mt-3 text-[13px] text-[#1677FF]"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      {/* 页面头部 */}
      <div className="bg-white px-4 py-3 flex items-center justify-center border-b border-[#EEEEEE]">
        <span className="text-[15px] font-medium text-[#1A1A1A]">费用确认</span>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        {/* 订单摘要 */}
        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <p className="text-[13px] font-medium text-[#1A1A1A] mb-3">订单摘要</p>
          <div className="space-y-2 text-[12px]">
            {orderSummaryItems.map((item) => (
              <div key={item.label} className="flex justify-between">
                <span className="text-[#999999]">{item.label}</span>
                <span className="text-[#1A1A1A] max-w-[60%] text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 费用明细 */}
        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <p className="text-[13px] font-medium text-[#1A1A1A] mb-3">费用明细</p>
          <div className="space-y-2">
            {cost.baseFee > 0 && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">基础运费</span>
                <span className="text-[#1A1A1A]">¥{cost.baseFee.toFixed(2)}</span>
              </div>
            )}
            {((cost.mileageFee ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">里程费</span>
                <span className="text-[#1A1A1A]">¥{(cost.mileageFee ?? 0).toFixed(2)}</span>
              </div>
            )}
            {cost.distanceFee > 0 && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">距离附加费</span>
                <span className="text-[#1A1A1A]">¥{cost.distanceFee.toFixed(2)}</span>
              </div>
            )}
            {((cost.durationFee ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">时长费</span>
                <span className="text-[#1A1A1A]">¥{(cost.durationFee ?? 0).toFixed(2)}</span>
              </div>
            )}
            {((cost.serviceFee ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">平台服务费</span>
                <span className="text-[#1A1A1A]">¥{(cost.serviceFee ?? 0).toFixed(2)}</span>
              </div>
            )}
            {((cost.packageFee ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">设备套餐费</span>
                <span className="text-[#1A1A1A]">¥{(cost.packageFee ?? 0).toFixed(2)}</span>
              </div>
            )}
            {cost.insuranceFee > 0 && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">保险费</span>
                <span className="text-[#1A1A1A]">¥{cost.insuranceFee.toFixed(2)}</span>
              </div>
            )}
            {((cost.discount ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">优惠</span>
                <span className="text-[#52C41A]">-¥{(cost.discount ?? 0).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-[#EEEEEE] pt-2 mt-2 flex justify-between">
              <span className="text-[13px] font-medium text-[#1A1A1A]">合计</span>
              <span className="text-[16px] font-bold text-[#FF4D4F]">¥{cost.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 支付方式 */}
        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <p className="text-[13px] font-medium text-[#1A1A1A] mb-3">支付方式</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.key}
                  onClick={() => setPaymentMethod(method.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors
                    ${paymentMethod === method.key
                      ? 'border-[#1677FF] bg-[#E6F0FF]'
                      : 'border-[#EEEEEE] bg-white hover:bg-[#F5F6FA]'}
                  `}
                >
                  <Icon className="w-5 h-5 text-[#1677FF]" />
                  <span className="flex-1 text-left text-[13px] text-[#1A1A1A]">{method.label}</span>
                  {paymentMethod === method.key && (
                    <CheckCircle className="w-4 h-4 text-[#1677FF]" />
                  )}
                  <ChevronRight className="w-4 h-4 text-[#CCCCCC]" />
                </button>
              );
            })}
          </div>

          {paymentMethod === 'invoice' && (
            <div className="mt-3 p-3 bg-[#FFF7E6] rounded-lg">
              <div className="flex items-start gap-2">
                <Receipt className="w-4 h-4 text-[#FAAD14] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#999999]">
                  对公转账将在订单完成后开具增值税发票，请确保企业信息已完善
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 服务协议 */}
        <div className="mx-4 mt-3 flex items-start gap-2">
          <button
            onClick={() => setAgreedTerms(!agreedTerms)}
            className="mt-0.5 shrink-0"
          >
            {agreedTerms ? (
              <CheckCircle className="w-4 h-4 text-[#1677FF]" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-[#CCCCCC]" />
            )}
          </button>
          <p className="text-[11px] text-[#999999] leading-relaxed">
            我已阅读并同意
            <span className="text-[#1677FF]">《城市无人车服务平台服务协议》</span>
            和
            <span className="text-[#1677FF]">《隐私政策》</span>
          </p>
        </div>

        {/* 安全保障提示 */}
        <div className="mx-4 mt-3 mb-4 flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-[#52C41A]" />
          <span className="text-[10px] text-[#999999]">平台担保交易，资金安全保障</span>
        </div>
      </div>

      {/* 底部支付栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] text-[#666666]">应付金额</span>
          <span className="text-[18px] font-bold text-[#FF4D4F]">¥{cost.totalAmount.toFixed(2)}</span>
        </div>
        <button
          onClick={handleConfirmPay}
          disabled={paying || !agreedTerms}
          className="w-full py-3 bg-[#1677FF] text-white rounded-lg text-[14px] font-medium hover:bg-[#0958D9] transition-colors disabled:bg-[#CCCCCC] disabled:cursor-not-allowed"
        >
          {paying ? '支付中...' : '确认支付'}
        </button>
        {!agreedTerms && !paying && (
          <p className="text-center text-[11px] text-[#FF4D4F] mt-2">请先勾选服务协议</p>
        )}
      </div>
    </div>
  );
}
