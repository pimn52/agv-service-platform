'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useOrderStore, useAppStore } from '@/store';
import type { Order } from '@/types';

export function SearchBar() {
  const orders = useOrderStore((s) => s.orders);
  const { setActiveTab } = useAppStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return orders.filter((o) =>
      o.id.toLowerCase().includes(q) ||
      (typeof o.senderAddress === 'string' && o.senderAddress.includes(q)) ||
      (typeof o.receiverAddress === 'string' && o.receiverAddress.includes(q)) ||
      (o.cargoInfo && o.cargoInfo.includes(q)) ||
      (o.vehiclePlate && o.vehiclePlate.includes(q)) ||
      (o.pickupLocation && o.pickupLocation.includes(q))
    ).slice(0, 6);
  }, [query, orders]);

  const handleSelect = (order: Order) => {
    setOpen(false);
    setQuery('');
    const store = useOrderStore.getState();
    const appStore = useAppStore.getState();
    if (!['completed', 'cancelled'].includes(order.status)) {
      store.setActiveOrderId(order.id);
      appStore.setDynamicsTab(order.serviceType);
      setActiveTab('tracking');
    } else {
      setActiveTab('order');
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 h-[36px] bg-[#F5F6FA] rounded-lg px-3">
        <Search size="16" className="text-[#999]" />
        <input
          type="text"
          placeholder="搜索订单"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query) setOpen(true); }}
          className="flex-1 bg-transparent text-[13px] text-[#1A1A1A] placeholder:text-[#CCC] outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="shrink-0">
            <X size="14" className="text-[#999]" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#EEEEEE] z-30 overflow-hidden">
          {results.map((order) => (
            <button
              key={order.id}
              onClick={() => handleSelect(order)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F5F6FA] active:bg-[#EEEEEE] transition-colors text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-[#1A1A1A] truncate">
                  {order.vehiclePlate && <span className="text-[#1677FF] mr-1">{order.vehiclePlate}</span>}
                  {typeof order.senderAddress === 'string' ? order.senderAddress : order.senderAddress?.address || order.pickupLocation || order.id.slice(-8)}
                </div>
                <div className="text-[10px] text-[#999]">#{order.id.slice(-8)}</div>
              </div>
              <span className="text-[10px] text-[#999] shrink-0 ml-2">
                {['completed', 'cancelled'].includes(order.status) ? '已完成' : '在途'}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#EEEEEE] z-30 px-3 py-4 text-center">
          <p className="text-[12px] text-[#999]">未找到匹配订单</p>
        </div>
      )}
    </div>
  );
}
