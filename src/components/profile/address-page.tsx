'use client';

import { useState, useEffect } from 'react';
import type { SubPage } from '@/store';
import { useAuthStore } from '@/store';
import { Trash2 } from 'lucide-react';

const DEMO_ADDRESSES = [
  { id: 'demo_1', name: '望京SOHO T1', contact: '王经理', phone: '139****1234', isDefault: true },
  { id: 'demo_2', name: '中关村软件园二期', contact: '赵女士', phone: '136****5678', isDefault: false },
  { id: 'demo_3', name: '建国门外大街1号', contact: '刘主管', phone: '137****4321', isDefault: false },
];

interface AddressItem {
  id: string;
  name: string;
  contact: string;
  phone: string;
  isDefault: boolean;
}

const STORAGE_KEY = 'agv_address_chosen';

export function AddressPage({ page }: { page: SubPage }) {
  void page;
  const demoMode = useAuthStore((s) => s.demoMode);
  const [chosen, setChosen] = useState<boolean | null>(null);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);

  // 初始化：演示用户直接加载演示地址；真实用户检查是否已选择
  useEffect(() => {
    if (demoMode) {
      setAddresses(DEMO_ADDRESSES);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'keep') {
      setAddresses(DEMO_ADDRESSES);
      setChosen(true);
    } else if (stored === 'clear') {
      setAddresses([]);
      setChosen(true);
    }
    // stored === null → 未选择，chosen 为 null → 显示提示
  }, [demoMode]);

  const handleKeep = () => {
    localStorage.setItem(STORAGE_KEY, 'keep');
    setAddresses(DEMO_ADDRESSES);
    setChosen(true);
  };

  const handleClear = () => {
    localStorage.setItem(STORAGE_KEY, 'clear');
    setAddresses([]);
    setChosen(true);
  };

  const handleDelete = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  // 新用户首次进入 → 显示提示
  if (!demoMode && chosen === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] px-6">
        <div className="bg-[#E6F0FF] rounded-xl p-5 w-full max-w-sm text-center">
          <p className="text-[13px] font-medium text-[#1677FF] mb-1">快捷设置</p>
          <p className="text-[12px] text-[#666] mb-4">
            是否保留演示地址方便快速体验？<br />
            包含望京SOHO、中关村软件园等常用地址。
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleKeep}
              className="flex-1 py-2 bg-[#1677FF] text-white text-[13px] font-medium rounded-lg active:bg-[#0958D9] transition-colors"
            >
              保留
            </button>
            <button
              onClick={handleClear}
              className="flex-1 py-2 border border-[#DDD] text-[#666] text-[13px] rounded-lg active:bg-[#F5F6FA] transition-colors"
            >
              清空，我自己加
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {addresses.length === 0 && (
        <div className="text-center py-12 text-[13px] text-[#999]">暂无地址，请新增</div>
      )}
      {addresses.map((addr) => (
        <div key={addr.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-[#1A1A1A] truncate">{addr.name}</span>
                {addr.isDefault && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#E6F0FF] text-[#1677FF] rounded shrink-0">默认</span>
                )}
              </div>
              <div className="text-[12px] text-[#999] mt-1">{addr.contact} {addr.phone}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button className="text-[12px] text-[#1677FF] active:opacity-60">编辑</button>
              <button
                onClick={() => handleDelete(addr.id)}
                className="text-[#FF4D4F] active:opacity-60 p-1 -mr-1"
              >
                <Trash2 size="14" />
              </button>
            </div>
          </div>
        </div>
      ))}

      <button className="w-full py-3 bg-white text-[#1677FF] text-[14px] font-medium rounded-xl border border-[#1677FF] active:bg-[#E6F0FF] transition-colors mt-2">
        新增地址
      </button>
    </div>
  );
}
