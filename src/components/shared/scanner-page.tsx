'use client';

import type { SubPage } from '@/store';

export function ScannerPage({ page }: { page: SubPage }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* 模拟扫码界面 */}
      <div className="w-56 h-56 border-2 border-[#1677FF] rounded-xl relative mb-6">
        {/* 扫描线动画 */}
        <div className="absolute inset-x-2 top-2 bottom-2">
          <div className="w-full h-[2px] bg-[#1677FF] animate-bounce opacity-80" style={{ animationDuration: '2s' }} />
        </div>
        {/* 四角标记 */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] border-[#1677FF]" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] border-[#1677FF]" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] border-[#1677FF]" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] border-[#1677FF]" />
      </div>
      <p className="text-[14px] text-[#1A1A1A] mb-1">将二维码放入框内扫描</p>
      <p className="text-[12px] text-[#999] text-center">扫描无人车车身二维码，进行车厢开启、货物装卸、车辆状态查看等操作</p>
    </div>
  );
}
