'use client';

import { MiniCalendar } from './mini-calendar';
import type { PeriodFreq, PeriodDuration, PaymentMode } from './period-utils';

interface PeriodSectionProps {
  // 频率
  periodFreq: PeriodFreq;
  onPeriodFreqChange: (f: PeriodFreq) => void;
  periodCustomDays: number;
  onPeriodCustomDaysChange: (d: number) => void;
  // 期限
  periodDuration: PeriodDuration;
  onPeriodDurationChange: (d: PeriodDuration) => void;
  periodEnd: string;
  onPeriodEndChange: (d: string) => void;
  // 支付
  paymentMode: PaymentMode;
  onPaymentModeChange: (m: PaymentMode) => void;
}

export function PeriodSection({
  periodFreq, onPeriodFreqChange,
  periodCustomDays, onPeriodCustomDaysChange,
  periodDuration, onPeriodDurationChange,
  periodEnd, onPeriodEndChange,
  paymentMode, onPaymentModeChange,
}: PeriodSectionProps) {
  const isLongTerm = periodDuration === '长期';

  return (
    <div className="space-y-2">
      {/* 频率 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[#999999] shrink-0">频率</span>
        {(['每天', '每工作日', '自定义'] as const).map((f) => (
          <button key={f} onClick={() => onPeriodFreqChange(f)} className={`px-1.5 py-0.5 rounded-full text-[11px] transition-colors ${periodFreq === f ? 'bg-[#1677FF] text-white' : 'bg-[#F5F6FA] text-[#666666]'}`}>{f}</button>
        ))}
        {periodFreq === '自定义' && (
          <span className="inline-flex items-center gap-0.5 bg-[#F5F6FA] rounded px-1">
            <span className="text-[11px] text-[#999999]">每</span>
            <input
              type="text"
              inputMode="numeric"
              value={periodCustomDays}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) onPeriodCustomDaysChange(Math.min(30, v)); else if (e.target.value === '') onPeriodCustomDaysChange(1); }}
              className="w-5 text-center bg-transparent text-[11px] text-[#1A1A1A] outline-none"
            />
            <span className="text-[11px] text-[#999999]">天</span>
          </span>
        )}
      </div>

      {/* 期限 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[#999999] shrink-0">期限</span>
        {(['一周', '一月', '长期', '自定义'] as const).map((d) => (
          <button key={d} onClick={() => { onPeriodDurationChange(d); if (d === '长期') onPaymentModeChange('auto'); }} className={`px-1.5 py-0.5 rounded-full text-[11px] transition-colors ${periodDuration === d ? 'bg-[#1677FF] text-white' : 'bg-[#F5F6FA] text-[#666666]'}`}>{d}</button>
        ))}
        {periodDuration === '自定义' && (
          <MiniCalendar
            value={periodEnd}
            onChange={onPeriodEndChange}
            minDate={new Date().toISOString().slice(0, 10)}
          />
        )}
      </div>

      {/* 支付方式 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#999999] shrink-0">支付</span>
        <div className="flex bg-[#F0F1F5] rounded-lg p-0.5">
          <button
            onClick={() => { if (!isLongTerm) onPaymentModeChange('full'); }}
            disabled={isLongTerm}
            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${paymentMode === 'full' ? 'bg-white text-[#1A1A1A] shadow-sm' : isLongTerm ? 'text-[#CCCCCC] cursor-not-allowed' : 'text-[#999999] hover:text-[#666666]'}`}
          >一次付清</button>
          <button onClick={() => onPaymentModeChange('auto')} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${paymentMode === 'auto' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#999999] hover:text-[#666666]'}`}>每次自动扣款</button>
        </div>
      </div>
    </div>
  );
}
