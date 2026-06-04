'use client';

import { useState } from 'react';
import { useUserStore } from '@/store';
import type { SubPage } from '@/store';

const RECHARGE_OPTIONS = [
  { amount: 10000, label: '100元', bonus: 0 },
  { amount: 50000, label: '500元', bonus: 500 },
  { amount: 100000, label: '1,000元', bonus: 2000 },
  { amount: 500000, label: '5,000元', bonus: 15000 },
];

export function RechargePage({ page }: { page: SubPage }) {
  const { user, updateBalance } = useUserStore();
  const [selectedAmount, setSelectedAmount] = useState(10000);
  const [recharging, setRecharging] = useState(false);

  const handleRecharge = () => {
    setRecharging(true);
    setTimeout(() => {
      updateBalance(selectedAmount + (RECHARGE_OPTIONS.find((o) => o.amount === selectedAmount)?.bonus ?? 0));
      setRecharging(false);
    }, 1000);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* 当前余额 */}
      <div className="bg-gradient-to-r from-[#1677FF] to-[#4096FF] rounded-xl p-5 text-white">
        <div className="text-[12px] opacity-80">当前余额</div>
        <div className="text-[28px] font-semibold mt-1">¥{user ? user.balance / 100 : '0.00'}</div>
      </div>

      {/* 充值金额选择 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-[14px] font-medium text-[#1A1A1A] mb-3">选择充值金额</h3>
        <div className="grid grid-cols-2 gap-3">
          {RECHARGE_OPTIONS.map((option) => (
            <button
              key={option.amount}
              onClick={() => setSelectedAmount(option.amount)}
              className={`relative p-4 rounded-xl border-2 transition-colors ${
                selectedAmount === option.amount
                  ? 'border-[#1677FF] bg-[#E6F0FF]'
                  : 'border-[var(--border)] bg-white'
              }`}
            >
              <div className={`text-[18px] font-semibold ${selectedAmount === option.amount ? 'text-[#1677FF]' : 'text-[#1A1A1A]'}`}>
                {option.label}
              </div>
              {option.bonus > 0 && (
                <div className="text-[11px] text-[#FF4D4F] mt-1">赠送 ¥{option.bonus / 100}</div>
              )}
              {selectedAmount === option.amount && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-[#1677FF] rounded-full flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleRecharge}
        disabled={recharging}
        className="w-full py-3 bg-[#1677FF] text-white text-[15px] font-medium rounded-xl active:bg-[#0958D9] disabled:opacity-60 transition-colors"
      >
        {recharging ? '充值中...' : '立即充值'}
      </button>
    </div>
  );
}
