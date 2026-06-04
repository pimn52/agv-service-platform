'use client';

import { Search } from 'lucide-react';

export function SearchBar() {
  return (
    <div className="flex items-center gap-2 h-[36px] bg-[#F5F6FA] rounded-lg px-3">
      <Search size="16" className="text-[#999]" />
      <input
        type="text"
        placeholder="搜索订单/服务"
        className="flex-1 bg-transparent text-[13px] text-[#1A1A1A] placeholder:text-[#999] outline-none"
      />
    </div>
  );
}
