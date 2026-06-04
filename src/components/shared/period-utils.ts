export type PeriodFreq = '每天' | '每工作日' | '自定义';
export type PeriodDuration = '一周' | '一月' | '长期' | '自定义';
export type PaymentMode = 'full' | 'auto';

export interface PeriodState {
  periodFreq: PeriodFreq;
  periodCustomDays: number;
  periodDuration: PeriodDuration;
  periodEnd: string;
  paymentMode: PaymentMode;
  autoPayAgreed: boolean;
}

export interface PeriodCostInfo {
  deliveryCount: number;
  periodTotal: number;
  isLongTerm: boolean;
}

export function computePeriodInfo(
  periodEnabled: boolean,
  state: PeriodState,
  singleDeliveryTotal: number,
): PeriodCostInfo | null {
  if (!periodEnabled || singleDeliveryTotal <= 0) return null;

  const getDays = (): number => {
    switch (state.periodDuration) {
      case '一周': return 7;
      case '一月': return 30;
      case '长期': return 0;
      case '自定义': {
        if (!state.periodEnd) return 0;
        const end = new Date(state.periodEnd + 'T00:00:00');
        const now = new Date(); now.setHours(0, 0, 0, 0);
        return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86400000));
      }
    }
  };

  const getFreqDays = (): number => {
    switch (state.periodFreq) {
      case '每天': return 1;
      case '每工作日': return 1;
      case '自定义': return state.periodCustomDays;
    }
  };

  const totalDays = getDays();
  const freqDays = getFreqDays();

  if (totalDays === 0) {
    const monthlyCount = state.periodFreq === '每工作日' ? 22 : Math.floor(30 / freqDays);
    return { deliveryCount: monthlyCount, periodTotal: singleDeliveryTotal * monthlyCount, isLongTerm: true };
  }

  const deliveryCount = Math.max(1, Math.ceil(totalDays / freqDays));
  return { deliveryCount, periodTotal: singleDeliveryTotal * deliveryCount, isLongTerm: false };
}

export function getPaymentLabel(
  periodInfo: PeriodCostInfo | null,
  paymentMode: PaymentMode,
  orderCount: number,
): string {
  if (!periodInfo) return orderCount > 1 ? `${orderCount}单合计` : '合计';
  if (paymentMode === 'auto') return '本次应付';
  return periodInfo.isLongTerm ? '月费约' : `${periodInfo.deliveryCount}次合计`;
}

export function getDisplayTotal(
  periodInfo: PeriodCostInfo | null,
  paymentMode: PaymentMode,
  singleTotal: number,
): number {
  if (periodInfo && paymentMode === 'full') return periodInfo.periodTotal;
  return singleTotal;
}
