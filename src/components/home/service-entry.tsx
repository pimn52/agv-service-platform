'use client';

import { useAppStore } from '@/store';
import { Send, Truck } from 'lucide-react';

/**
 * 首页下单入口栏
 * 两个卡片：配送下单（纸飞机图标）、巡游租车（无人车图标）
 * 卡片内部左右布局：图标在左，文字在右
 */

/** 无驾驶舱无人车 SVG 图标 */
function UnmannedVehicleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 车体 */}
      <rect x="8" y="16" width="32" height="16" rx="4" fill="#E6F0FF" stroke="#1677FF" strokeWidth="1.5" />
      {/* 顶部传感器 */}
      <rect x="18" y="12" width="12" height="5" rx="2.5" fill="#1677FF" />
      <circle cx="24" cy="14.5" r="1.5" fill="white" />
      {/* 前灯 */}
      <rect x="36" y="20" width="4" height="3" rx="1" fill="#1677FF" />
      {/* 货厢门 */}
      <line x1="20" y1="19" x2="20" y2="29" stroke="#1677FF" strokeWidth="1" opacity="0.5" />
      <line x1="28" y1="19" x2="28" y2="29" stroke="#1677FF" strokeWidth="1" opacity="0.5" />
      {/* 轮子 */}
      <circle cx="15" cy="34" r="4" fill="#333333" />
      <circle cx="15" cy="34" r="2" fill="#666666" />
      <circle cx="33" cy="34" r="4" fill="#333333" />
      <circle cx="33" cy="34" r="2" fill="#666666" />
    </svg>
  );
}

export function ServiceEntry() {
  const { pushPage } = useAppStore();

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 配送下单卡片 */}
      <button
        onClick={() => pushPage({ key: 'delivery-order' })}
        className="flex items-center gap-2.5 bg-white rounded-xl p-3 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
      >
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#E6F0FF] shrink-0">
          <Send className="w-5 h-5 text-[#1677FF]" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-[14px] text-[#1A1A1A] leading-tight">配送下单</p>
          <p className="text-[11px] text-[#999999] mt-0.5">整车/零担</p>
        </div>
      </button>

      {/* 巡游租车卡片 */}
      <button
        onClick={() => pushPage({ key: 'cruise-order' })}
        className="flex items-center gap-2.5 bg-white rounded-xl p-3 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
      >
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#E6F0FF] shrink-0">
          <UnmannedVehicleIcon className="w-6 h-6" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-[14px] text-[#1A1A1A] leading-tight">巡游租车</p>
          <p className="text-[11px] text-[#999999] mt-0.5">贩卖/安防</p>
        </div>
      </button>
    </div>
  );
}
