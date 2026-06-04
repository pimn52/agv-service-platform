'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus } from 'lucide-react';
import type { AddressEntry } from '@/data/addresses';

interface AddressBookButtonProps {
  currentValue: string;
  currentContactName?: string;
  currentContactPhone?: string;
  savedEntries: AddressEntry[];
  addressBookPreset: AddressEntry[];
  onSelect: (entry: AddressEntry) => void;
  onSave: (entry: AddressEntry) => void;
}

const PANEL_W = 220;
const PANEL_MAX_H = 210;

export function AddressBookButton({
  currentValue, currentContactName, currentContactPhone,
  savedEntries, addressBookPreset, onSelect, onSave,
}: AddressBookButtonProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const allEntries = [...addressBookPreset, ...savedEntries];

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.max(4, Math.min(r.right - PANEL_W, window.innerWidth - PANEL_W - 4));
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    // 下方空间够用或比上方多 → 向下；否则向上
    if (spaceBelow >= Math.min(PANEL_MAX_H, spaceBelow) || spaceBelow >= spaceAbove) {
      setPos({ top: r.bottom + 4, left });
    } else {
      setPos({ top: r.top - 4, left });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    calcPos();
    const onScroll = () => calcPos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, calcPos]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open) calcPos();
    setOpen(!open);
  };

  const handleSave = () => {
    const trimmed = currentValue.trim();
    if (!trimmed) return;
    onSave({ id: `user-${Date.now()}`, label: '', address: trimmed, name: currentContactName?.trim() || '', phone: currentContactPhone?.trim() || '' });
    setOpen(false);
  };

  return (
    <div className="relative shrink-0">
      <button ref={btnRef} type="button" onClick={handleToggle}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#F5F6FA] hover:bg-[#E6F0FF] text-[#999999] hover:text-[#1677FF] transition-colors" title="地址簿">
        <BookOpen size={13} />
      </button>

      {open && createPortal(
        <div ref={panelRef}
          className="fixed bg-white rounded-xl shadow-lg border border-[#EEEEEE] z-[9999] overflow-hidden"
          style={{ top: pos.top, left: pos.left, width: PANEL_W, maxHeight: PANEL_MAX_H }}
        >
          <div className="px-3 py-2 border-b border-[#F5F6FA] flex items-center justify-between sticky top-0 bg-white z-10">
            <span className="text-[11px] text-[#999999]">已存地址</span>
            {currentValue.trim() && (
              <button onClick={handleSave} className="flex items-center gap-0.5 text-[11px] text-[#1677FF] font-medium hover:text-[#4096FF]">
                <Plus size={10} />保存当前
              </button>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: PANEL_MAX_H - 36 }}>
            {allEntries.length === 0 && <p className="px-3 py-4 text-[11px] text-[#999999] text-center">暂无已存地址</p>}
            {allEntries.map((entry) => (
              <button key={entry.id} onClick={() => { onSelect(entry); setOpen(false); }}
                className="w-full px-3 py-2.5 text-left hover:bg-[#F5F6FA] active:bg-[#EEEEEE] transition-colors border-b border-[#F5F6FA] last:border-0">
                <p className="text-[12px] font-medium text-[#1A1A1A]">{entry.label || entry.address.slice(0, 16)}</p>
                <p className="text-[10px] text-[#999999] truncate">{entry.address}</p>
                {(entry.name || entry.phone) && <p className="text-[10px] text-[#999999]">{entry.name}{entry.name && entry.phone ? ' · ' : ''}{entry.phone}</p>}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}