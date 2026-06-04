'use client';

import { useState } from 'react';
import { useOrderStore, useAppStore, useAuthStore } from '@/store';
import type { SubPage } from '@/store';
import type { ServiceType } from '@/types';
import { CheckCircle, CreditCard, Building2, Wallet, Receipt, ChevronRight, Shield } from 'lucide-react';
import { computePeriodInfo, getDisplayTotal, getPaymentLabel } from '@/components/shared/period-utils';
import { computeRebate, type WaybillRebate } from '@/lib/rebate';
import { computeLTLCarGroups } from '@/lib/ltl-car-groups';

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
  const { costBreakdown, createOrderSupabase, resetDeliveryForm, resetCruiseForm, deliveryForm, cruiseForm } = useOrderStore();
  const { pushPage } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('balance');
  const [paying, setPaying] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [autoPayAgreed, setAutoPayAgreed] = useState(false);
  const [error, setError] = useState('');

  void page;

  const cost = costBreakdown;

  // 从 page data 推断服务类型
  const pageData = page.key === 'cost-confirm' ? (page.data ?? {}) : {};
  const serviceType: ServiceType = (pageData.serviceType as ServiceType) ?? 'logistics';

  // 判断是否需要自动扣款协议
  const formData = serviceType === 'logistics' ? deliveryForm : cruiseForm;
  const needAutoPayAgreement = formData?.periodEnabled && formData?.paymentMode === 'auto';

  // 周期费用计算（与下单页同一套逻辑）
  const periodInfo = formData?.periodEnabled ? computePeriodInfo(true, {
    periodFreq: (formData.periodFreq as '每天' | '每工作日' | '自定义') || '每天',
    periodCustomDays: formData.periodCustomDays ?? 2,
    periodDuration: (formData.periodDuration as '一周' | '一月' | '长期' | '自定义') || '一周',
    periodEnd: formData.periodEnd || '',
    paymentMode: (formData.paymentMode as 'full' | 'auto') || 'full',
    autoPayAgreed: false,
  }, cost?.totalAmount ?? 0) : null;
  const displayTotal = getDisplayTotal(periodInfo, (formData?.paymentMode as 'full' | 'auto') || 'full', cost?.totalAmount ?? 0);
  const displayLabel = getPaymentLabel(periodInfo, (formData?.paymentMode as 'full' | 'auto') || 'full', 1);

  // 生成订单摘要项
  const orderSummaryItems: { label: string; value: string }[] = [
    { label: '服务类型', value: SERVICE_TYPE_LABELS[serviceType] },
  ];

  if (serviceType === 'logistics') {
    const isFTL = deliveryForm?.deliveryMode === 'full_load';
    orderSummaryItems.push(
      { label: '用车类型', value: isFTL ? '整车配送' : '散件直送' },
    );
    if (isFTL) {
      // 读 ftlWaybills（不再从 stops 取，stops 已废弃）
      const wbs = deliveryForm?.ftlWaybills ?? [];
      orderSummaryItems.push({ label: '车辆数', value: `${wbs.length} 辆` });
      wbs.forEach((wb, i) => {
        const pu = wb.stops.find((s) => s.type === 'pickup');
        const de = wb.stops.find((s) => s.type === 'delivery');
        const model = wb.vehicleModelName || wb.vehicleModelId || '--';
        orderSummaryItems.push({
          label: `运单 ${i + 1}`,
          value: `${model} · ${pu?.address?.slice(0, 8) || '--'} → ${de?.address?.slice(0, 8) || '--'}`,
        });
      });
    } else {
      // LTL：运单摘要（展示全部运单，对标 FTL）
      const wbs = deliveryForm?.ltlWaybills ?? [];
      const carGroups = computeLTLCarGroups(wbs);
      const carCount = carGroups.length;
      orderSummaryItems.push({ label: '运单数', value: `${wbs.length} 张运单拼 ${carCount} 车` });
      wbs.forEach((wb, i) => {
        orderSummaryItems.push({
          label: wbs.length > 1 ? `运单 ${i + 1}` : '投件→取件',
          value: `${(wb.pickupAddress || '--').slice(0, 6)} → ${(wb.deliveryAddress || '--').slice(0, 6)}`,
        });
      });
    }
  } else if (serviceType === 'vending') {
    const locCount = cruiseForm?.locations?.length ?? 0;
    orderSummaryItems.push(
      { label: '取车地点', value: cruiseForm?.pickupLocation ?? '--' },
      { label: '租赁时长', value: cruiseForm?.duration ? `${cruiseForm.duration}小时` : '--' },
    );
    if (locCount > 1) {
      orderSummaryItems.push({ label: '服务区域', value: `${locCount} 个地点` });
    }
  } else {
    const locCount = cruiseForm?.locations?.length ?? 0;
    orderSummaryItems.push(
      { label: '取车地点', value: cruiseForm?.pickupLocation ?? '--' },
      { label: '车辆数量', value: cruiseForm?.vehicleCount ? `${cruiseForm.vehicleCount}台` : '1台' },
    );
    if (locCount > 1) {
      orderSummaryItems.push({ label: '巡检区域', value: `${locCount} 个地点` });
    }
  }

  const handleConfirmPay = async () => {
    if (!agreedTerms) return;
    if (needAutoPayAgreement && !autoPayAgreed) return;
    setError('');

    if (!user) {
      setError('登录状态已过期，请重新登录后再试');
      return;
    }
    setPaying(true);

    // 构建订单数据
    const orderData: Partial<import('@/types').Order> = {
      serviceType,
      paymentMethod: paymentMethod as import('@/types').PaymentMethod,
      estimatedCost: displayTotal,
      amount: displayTotal,
    };

    if (serviceType === 'logistics') {
      const isFTL = deliveryForm?.deliveryMode === 'full_load';
      orderData.deliveryMode = deliveryForm?.deliveryMode;
      // 防御校验：运单数据必须存在，防止表单重置导致空运单订单
      if (isFTL) {
        const ftlWbs = deliveryForm?.ftlWaybills ?? [];
        if (ftlWbs.length === 0) {
          setError('配送数据异常，请返回重新填写');
          setPaying(false);
          return;
        }
      } else {
        const ltlWbs = deliveryForm?.ltlWaybills ?? [];
        if (ltlWbs.length === 0) {
          setError('配送数据异常，请返回重新填写');
          setPaying(false);
          return;
        }
      }
      if (isFTL) {
        // ── 整车配送：数据存在 ftlWaybills 里，stops 不再使用 ──
        const wbs = deliveryForm?.ftlWaybills ?? [];
        orderData.ftlWaybills = wbs;
        orderData.stops = [];
        orderData.ltlWaybills = [];
        // 主展示车用第一个运单的车型信息（多车详情在 ftlWaybills 里）
        if (wbs.length > 0) {
          orderData.vehicleModel = wbs[0].vehicleModelName || wbs[0].vehicleModelId;
          const firstPu = wbs[0].stops.find((s) => s.type === 'pickup');
          const lastDe = wbs[wbs.length - 1].stops.find((s) => s.type === 'delivery');
          if (firstPu) {
            orderData.origin = { lat: 39.9, lng: 116.4, address: firstPu.address };
            orderData.senderName = firstPu.contactName;
            orderData.senderPhone = firstPu.contactPhone;
            orderData.senderAddress = firstPu.address;
          }
          if (lastDe) {
            orderData.destination = { lat: 39.95, lng: 116.45, address: lastDe.address };
            orderData.receiverName = lastDe.contactName;
            orderData.receiverPhone = lastDe.contactPhone;
            orderData.receiverAddress = lastDe.address;
          }
        }
      } else {
        // LTL：运单模式
        const wbs = deliveryForm?.ltlWaybills ?? [];
        orderData.ltlWaybills = wbs;
        orderData.stops = [];
        orderData.vehicleModel = 'Z2 小型配送车';
        if (wbs.length > 0) {
          orderData.origin = { lat: 39.9, lng: 116.4, address: wbs[0].pickupAddress || '' };
          orderData.destination = { lat: 39.95, lng: 116.45, address: wbs[wbs.length - 1].deliveryAddress || '' };
          orderData.senderName = wbs[0].pickupContactName;
          orderData.senderPhone = wbs[0].pickupContactPhone;
          orderData.senderAddress = wbs[0].pickupAddress;
          orderData.receiverName = wbs[wbs.length - 1].deliveryContactName;
          orderData.receiverPhone = wbs[wbs.length - 1].deliveryContactPhone;
          orderData.receiverAddress = wbs[wbs.length - 1].deliveryAddress;
        }
      }
      orderData.cargoType = (deliveryForm?.cargoType || 'other') as import('@/types').CargoType;
      orderData.specialRequirements = deliveryForm?.specialRequirements as import('@/types').SpecialRequirement[] | undefined;
      orderData.deliveryTime = deliveryForm?.deliveryTime;
    }

    const newOrder = await createOrderSupabase(user.id, orderData);

    setPaying(false);

    if (newOrder) {
      pushPage({ key: 'payment-result', data: { success: true, orderId: newOrder.id, vehicleName: newOrder.vehicleModel } });
    } else {
      // 失败时 reset，不让脏数据残留
      resetDeliveryForm();
      resetCruiseForm();
      pushPage({ key: 'payment-result', data: { success: false } });
    }
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
                <span className="text-[#1A1A1A]">¥{(cost.baseFee / 100).toFixed(2)}</span>
              </div>
            )}
            {cost.distanceFee > 0 && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">里程费</span>
                <span className="text-[#1A1A1A]">¥{(cost.distanceFee / 100).toFixed(2)}</span>
              </div>
            )}
            {((cost.durationFee ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">时长费</span>
                <span className="text-[#1A1A1A]">¥{((cost.durationFee ?? 0) / 100).toFixed(2)}</span>
              </div>
            )}
            {((cost.serviceFee ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">平台服务费</span>
                <span className="text-[#1A1A1A]">¥{((cost.serviceFee ?? 0) / 100).toFixed(2)}</span>
              </div>
            )}
            {((cost.packageFee ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">设备套餐费</span>
                <span className="text-[#1A1A1A]">¥{((cost.packageFee ?? 0) / 100).toFixed(2)}</span>
              </div>
            )}
            {cost.insuranceFee > 0 && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">保险费</span>
                <span className="text-[#1A1A1A]">¥{(cost.insuranceFee / 100).toFixed(2)}</span>
              </div>
            )}
            {((cost.nightDiscount ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">🌙 夜间 8折</span>
                <span className="text-[#52C41A]">-¥{((cost.nightDiscount ?? 0) / 100).toFixed(2)}</span>
              </div>
            )}
            {((cost.discount ?? 0) > 0) && (
              <div className="flex justify-between text-[12px]">
                <span className="text-[#666666]">{cost.discountLabel || '优惠'}</span>
                <span className="text-[#52C41A]">-¥{((cost.discount ?? 0) / 100).toFixed(2)}</span>
              </div>
            )}
          </div>
          {periodInfo && (
            <p className="text-[10px] text-[#999999] mt-1">
              周期：{formData?.periodFreq === '自定义' ? `每${formData?.periodCustomDays ?? 2}天` : formData?.periodFreq ?? '每天'} · {formData?.periodDuration ?? '一周'}
              {formData?.periodDuration === '自定义' && formData?.periodEnd ? ` · 至${parseInt(formData.periodEnd.slice(5, 7))}月${parseInt(formData.periodEnd.slice(8, 10))}日` : ''}
              {formData?.paymentMode === 'auto' ? ' · 自动扣款' : ' · 一次付清'}
            </p>
          )}
          {deliveryForm?.deliveryMode === 'ltl' && (() => {
            const wbs = deliveryForm?.ltlWaybills ?? [];
            const rb = computeRebate({ ltlWaybills: wbs, serviceType: 'logistics', deliveryMode: 'ltl' } as import('@/types').Order);
            if (!rb || rb.fullCarCount === 0) return null;
            // 按车分组展示独占一车减免明细
            const fullCarGroups = new Map<number, WaybillRebate[]>();
            for (const wb of rb.waybills) {
              if (wb.type === 'full_car_discount') {
                if (!fullCarGroups.has(wb.carIndex)) fullCarGroups.set(wb.carIndex, []);
                fullCarGroups.get(wb.carIndex)!.push(wb);
              }
            }
            return (
              <div className="mt-2 space-y-1 border-t border-[#F0F0F0] pt-2">
                <p className="text-[11px] text-[#666666] font-medium">独占一车减免明细</p>
                {Array.from(fullCarGroups.entries()).map(([carIdx, wbsForCar]) => {
                  const carDiscount = wbsForCar.reduce((sum, w) => sum + w.amount, 0);
                  const firstWb = wbsForCar[0];
                  return (
                    <p key={carIdx} className="text-[10px] text-[#999999]">
                      第{carIdx}车：{wbsForCar.length}单独占 {firstWb?.compartmentCount ?? '?'} 格口（车型 {firstWb?.modelId ?? '?'}），减免 ¥{carDiscount.toFixed(2)}
                    </p>
                  );
                })}
              </div>
            );
          })()}
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

        {/* 自动扣款协议 */}
        {needAutoPayAgreement && (
          <div className="mx-4 mt-2 flex items-start gap-2">
            <button
              onClick={() => setAutoPayAgreed(!autoPayAgreed)}
              className="mt-0.5 shrink-0"
            >
              {autoPayAgreed ? (
                <CheckCircle className="w-4 h-4 text-[#1677FF]" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-[#CCCCCC]" />
              )}
            </button>
            <p className="text-[11px] text-[#999999] leading-relaxed">
              我已阅读并同意
              <span className="text-[#1677FF]">《自动扣款授权协议》</span>
            </p>
          </div>
        )}

        {/* 安全保障提示 */}
        <div className="mx-4 mt-3 mb-4 flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-[#52C41A]" />
          <span className="text-[10px] text-[#999999]">平台担保交易，资金安全保障</span>
        </div>
      </div>

      {/* 底部支付栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE] px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-[12px] text-[#666666]">{displayLabel}</span>
              <span className="text-[20px] font-bold text-[#FF4D4F]">¥{(displayTotal / 100).toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleConfirmPay}
            disabled={paying || !agreedTerms || (needAutoPayAgreement && !autoPayAgreed)}
            className="shrink-0 px-8 py-2.5 bg-[#1677FF] text-white rounded-lg text-[14px] font-medium hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors disabled:bg-[#CCCCCC] disabled:cursor-not-allowed"
          >
            {paying ? '支付中...' : '确认支付'}
          </button>
        </div>
        {((!agreedTerms) || (needAutoPayAgreement && !autoPayAgreed)) && !paying && !error && (
          <p className="text-[11px] text-[#FF4D4F] text-center mt-1.5">请先勾选所需协议</p>
        )}
        {error && (
          <p className="text-[11px] text-[#FF4D4F] text-center mt-1.5">{error}</p>
        )}
      </div>
    </div>
  );
}
