'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
  value: string;
  onChange: (dateStr: string) => void;
  minDate?: string;
}

const PANEL_H = 260;
const PANEL_W = 224;

export function MiniCalendar({ value, onChange, minDate }: MiniCalendarProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const wrapperRef = useRef<HTMLDivElement>(null);

  const calcPos = useCallback(() => {
    if (!wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    const isDown = r.bottom + PANEL_H <= window.innerHeight || r.top < PANEL_H;
    setPos({
      left: Math.max(PANEL_W / 2 + 8, Math.min(window.innerWidth - PANEL_W / 2 - 8, window.innerWidth / 2)),
      top: isDown ? r.bottom + 4 : r.top - PANEL_H - 4,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    calcPos();
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('resize', calcPos);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', calcPos);
    };
  }, [open, calcPos]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startDow = firstDay.getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const min = minDate ? new Date(minDate + 'T00:00:00') : null;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cells: { day: number; dateStr: string; disabled: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ day: 0, dateStr: '', disabled: true, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cellDate = new Date(ds + 'T00:00:00');
      cells.push({ day: d, dateStr: ds, disabled: min ? cellDate < min : false, isToday: ds === todayStr });
    }
    return cells;
  }, [calYear, calMonth, minDate]);

  const displayText = value
    ? `至${value.slice(0, 4)}年${parseInt(value.slice(5, 7))}月${parseInt(value.slice(8, 10))}日`
    : '选择结束日期';

  const handlePick = useCallback((dateStr: string) => {
    onChange(dateStr);
    setOpen(false);
  }, [onChange]);

  const handleOpen = () => {
    if (!open) {
      const d = value ? new Date(value + 'T00:00:00') : new Date();
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
      calcPos();
    }
    setOpen(!open);
  };

  return (
    <div ref={wrapperRef} className="inline-flex">
      <button
        type="button"
        onClick={handleOpen}
        className={`text-[11px] px-1 py-0.5 rounded whitespace-nowrap transition-colors ${value ? 'text-[#1677FF] bg-[#E6F0FF]' : 'text-[#999999] bg-[#F5F6FA] hover:bg-[#EAEBF0]'}`}
      >
        {displayText}
      </button>

      {open && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-lg border border-[#EEEEEE] p-2"
          style={{ width: PANEL_W, top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center justify-between px-1 py-1">
            <button
              onClick={() => calMonth === 0 ? (setCalMonth(11), setCalYear(calYear - 1)) : setCalMonth(calMonth - 1)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#E6F0FF] text-[#666666]"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-[12px] font-medium text-[#1A1A1A]">{calYear}年{calMonth + 1}月</span>
            <button
              onClick={() => calMonth === 11 ? (setCalMonth(0), setCalYear(calYear + 1)) : setCalMonth(calMonth + 1)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#E6F0FF] text-[#666666]"
            >
              <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-7 px-1">
            {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
              <span key={w} className="text-[10px] text-[#999999] text-center py-0.5">{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 px-1">
            {calendarDays.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { if (!c.disabled && c.day) handlePick(c.dateStr); }}
                disabled={c.disabled || !c.day}
                className={`text-[11px] py-1 rounded text-center transition-colors ${
                  !c.day ? '' :
                  c.dateStr === value ? 'bg-[#1677FF] text-white font-medium' :
                  c.isToday ? 'bg-[#E6F0FF] text-[#1677FF] font-bold' :
                  c.disabled ? 'text-[#CCCCCC]' :
                  'text-[#1A1A1A] hover:bg-[#F5F6FA]'
                }`}
              >
                {c.day || ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
