'use client';

import type { SubPage } from '@/store';

const MOCK_ADDRESSES = [
  { id: '1', name: '望京SOHO T1', contact: '王经理', phone: '139****1234', isDefault: true },
  { id: '2', name: '中关村软件园二期', contact: '赵女士', phone: '136****5678', isDefault: false },
  { id: '3', name: '建国门外大街1号', contact: '刘主管', phone: '137****4321', isDefault: false },
];

export function AddressPage({ page }: { page: SubPage }) {
  return (
    <div className="px-4 py-4 space-y-3">
      {MOCK_ADDRESSES.map((addr) => (
        <div key={addr.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-[#1A1A1A]">{addr.name}</span>
                {addr.isDefault && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#E6F0FF] text-[#1677FF] rounded">默认</span>
                )}
              </div>
              <div className="text-[12px] text-[#999] mt-1">{addr.contact} {addr.phone}</div>
            </div>
            <button className="text-[12px] text-[#1677FF] active:opacity-60">编辑</button>
          </div>
        </div>
      ))}

      <button className="w-full py-3 bg-white text-[#1677FF] text-[14px] font-medium rounded-xl border border-[#1677FF] active:bg-[#E6F0FF] transition-colors mt-2">
        新增地址
      </button>
    </div>
  );
}
