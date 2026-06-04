'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Clock, Zap, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimeSlotPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
}

const BLOCKS = [
  { label: '凌晨', sub: '00-04', start: 0 },
  { label: '清晨', sub: '04-08', start: 4 },
  { label: '上午', sub: '08-12', start: 8 },
  { label: '下午', sub: '12-16', start: 12 },
  { label: '傍晚', sub: '16-20', start: 16 },
  { label: '夜间', sub: '20-24', start: 20 },
];

function buildDates() {
  const now = new Date();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    dates.push({
      dateStr: `${d.getFullYear()}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      label: i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '后天' : `${m}/${day}`,
    });
  }
  return dates;
}

function buildHalfSlots(dateStr: string, blockStart: number, isToday: boolean) {
  const now = new Date();
  const slots = [];
  for (let i = 0; i < 8; i++) {
    const h0 = blockStart + Math.floor(i / 2);
    const m0 = (i % 2) * 30;
    const endH = m0 === 30 ? h0 + 1 : h0;
    const endM = m0 === 30 ? 0 : 30;
    const label = `${String(h0).padStart(2, '0')}:${String(m0).padStart(2, '0')}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    const slotValue = `${dateStr} ${label}`;
    let disabled = false;
    if (isToday) {
      const t = new Date(now); t.setHours(endH, endM, 0, 0);
      disabled = t <= now;
    }
    slots.push({ label, value: slotValue, disabled });
  }
  return slots;
}

const PANEL_H = 320;

export function TimeSlotPicker({ value, onChange, placeholder, suffix = '来车' }: TimeSlotPickerProps) {
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState<'down' | 'up'>('down');
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [customDate, setCustomDate] = useState<{ dateStr: string; label: string } | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const wrapperRef = useRef<HTMLDivElement>(null);

  const builtinDates = useMemo(() => buildDates(), []);
  const allDates = useMemo(
    () => customDate ? [...builtinDates, customDate] : builtinDates,
    [builtinDates, customDate],
  );
  const effectiveDateStr = allDates[selectedDateIdx]?.dateStr || '';
  const isToday = effectiveDateStr === builtinDates[0]?.dateStr;

  const halfSlots = useMemo(() => {
    if (selectedBlock === null) return [];
    return buildHalfSlots(effectiveDateStr, BLOCKS[selectedBlock].start, isToday);
  }, [effectiveDateStr, selectedBlock, isToday]);

  const checkDir = useCallback(() => {
    if (!wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    setDir(r.bottom + PANEL_H > window.innerHeight && r.top > PANEL_H ? 'up' : 'down');
  }, []);

  useEffect(() => {
    if (!open) return;
    checkDir();
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, checkDir]);

  const handleAsap = () => { onChange('尽快'); setOpen(false); };

  // 自定义日期：切换内嵌日历
  const handleCustomClick = () => {
    if (showCustomPicker) { setShowCustomPicker(false); return; }
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setShowCustomPicker(true);
    setSelectedBlock(null);
  };

  // 内嵌日历选择日期
  const handleCalendarPick = useCallback((dateStr: string) => {
    // 检查是否已在 7 个内置日期中
    const builtinIdx = builtinDates.findIndex((d) => d.dateStr === dateStr);
    if (builtinIdx >= 0) {
      setSelectedDateIdx(builtinIdx);
      setSelectedBlock(null);
      setShowCustomPicker(false);
      return;
    }
    // 不在内置中 → 作为自定义日期追加
    const d = new Date(dateStr + 'T00:00:00');
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    setCustomDate({ dateStr, label: `${y}/${m}/${day}` });
    setSelectedDateIdx(allDates.length);
    setSelectedBlock(null);
    setShowCustomPicker(false);
  }, [allDates.length, builtinDates]);

  // 生成日历网格
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = builtinDates[0].dateStr; // "YYYY-MM-DD"
    const minDate = new Date(today + 'T00:00:00');
    const cells: { day: number; dateStr: string; disabled: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ day: 0, dateStr: '', disabled: true, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cellDate = new Date(ds + 'T00:00:00');
      cells.push({ day: d, dateStr: ds, disabled: cellDate < minDate, isToday: ds === today });
    }
    return { cells, year: calYear, month: calMonth };
  }, [calYear, calMonth, builtinDates]);

  const handleOpen = () => {
    if (!open) {
      if (value && value !== '尽快') {
        const di = allDates.findIndex((d) => value.startsWith(d.dateStr));
        if (di >= 0) { setSelectedDateIdx(di); const h = parseInt(value.slice(11, 13)); const bi = BLOCKS.findIndex((b) => h >= b.start && h < b.start + 4); if (bi >= 0) setSelectedBlock(bi); }
      }
      checkDir();
    }
    setOpen(!open);
  };

  const displayValue = (() => {
    if (!value) return '';
    if (value === '尽快') return '尽快';
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})\s(.+)$/);
    if (!m) return value;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dateLabel = m[1] + '-' + m[2] + '-' + m[3] === todayStr ? '今日' : `${parseInt(m[2])}月${parseInt(m[3])}日`;
    return `${dateLabel} ${m[4]}${suffix}`;
  })();

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={handleOpen}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[#F5F6FA] rounded-lg text-left hover:bg-[#EAEBF0] transition-colors">
        <Clock size={13} className="text-[#999999] shrink-0" />
        <span className={`flex-1 text-[12px] ${value ? 'text-[#1677FF]' : 'text-[#999999]'}`}>{displayValue || placeholder || '选择期望时间'}</span>
      </button>

      {open && (
        <div className={`absolute left-0 right-0 bg-white rounded-xl shadow-lg border border-[#EEEEEE] z-50 p-3 ${dir === 'down' ? 'top-full mt-1' : 'bottom-full mb-1'}`}>
          {/* 顶栏：尽快 + 自定义 */}
          <div className="flex items-center gap-2 mb-3">
            <button type="button" onClick={handleAsap}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${value === '尽快' ? 'bg-[#1677FF] text-white' : 'bg-[#E6F0FF] text-[#1677FF] hover:bg-[#BAE0FF]'}`}>
              <Zap size={12} />尽快
            </button>
            <div className="flex-1" />
            <button type="button" onClick={handleCustomClick}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-[#999999] hover:text-[#1677FF] hover:bg-[#F5F6FA] transition-colors">
              <Calendar size={11} />自定义
            </button>
          </div>

          {/* 三栏区域 / 自定义日期输入 */}
          <div className="flex gap-1.5" style={{ height: 240 }}>
            {showCustomPicker ? (
              /* 内嵌迷你日历 */
              <div className="flex-1 flex flex-col bg-white rounded-lg border-2 border-[#1677FF] overflow-hidden">
                {/* 月导航 */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-[#F5F6FA] shrink-0">
                  <button onClick={() => calMonth === 0 ? (setCalMonth(11), setCalYear(calYear - 1)) : setCalMonth(calMonth - 1)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#E6F0FF] text-[#666666]"><ChevronLeft size={12} /></button>
                  <span className="text-[12px] font-medium text-[#1A1A1A]">{calendarDays.year}年{calendarDays.month + 1}月</span>
                  <button onClick={() => calMonth === 11 ? (setCalMonth(0), setCalYear(calYear + 1)) : setCalMonth(calMonth + 1)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#E6F0FF] text-[#666666]"><ChevronRight size={12} /></button>
                </div>
                {/* 星期头 */}
                <div className="grid grid-cols-7 px-1 pt-1 shrink-0">
                  {['日','一','二','三','四','五','六'].map((w) => <span key={w} className="text-[9px] text-[#999999] text-center py-0.5">{w}</span>)}
                </div>
                {/* 日期格 */}
                <div className="grid grid-cols-7 px-1 pb-1 flex-1">
                  {calendarDays.cells.map((c, i) => (
                    <button key={i} type="button"
                      onClick={() => { if (!c.disabled && c.day) handleCalendarPick(c.dateStr); }}
                      disabled={c.disabled || !c.day}
                      className={`text-[11px] py-0.5 rounded text-center transition-colors ${
                        !c.day ? '' :
                        c.isToday ? 'bg-[#E6F0FF] text-[#1677FF] font-bold' :
                        c.disabled ? 'text-[#CCCCCC]' :
                        'text-[#1A1A1A] hover:bg-[#F5F6FA]'
                      }`}>
                      {c.day || ''}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* 第一栏：日期 */}
                <div className="flex-1 min-w-0 overflow-y-auto hide-scrollbar space-y-0.5">
                  {allDates.map((d, i) => (
                    <button key={d.dateStr} type="button"
                      onClick={() => { setSelectedDateIdx(i); setSelectedBlock(null); }}
                      className={`w-full text-center px-1 py-1.5 rounded-lg text-[11px] transition-all ${selectedDateIdx === i ? 'bg-[#1677FF] text-white font-medium' : 'text-[#666666] hover:bg-[#F5F6FA]'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* 第二栏：4h 区间 */}
                <div className="flex-1 min-w-0 overflow-y-auto hide-scrollbar space-y-0.5">
                  {BLOCKS.map((block, i) => {
                    const sel = selectedBlock === i;
                    let allPast = false;
                    if (isToday) { const t = new Date(); t.setHours(block.start + 4, 0, 0, 0); allPast = t <= new Date(); }
                    return (
                      <button key={i} type="button" onClick={() => setSelectedBlock(i)} disabled={allPast}
                        className={`w-full text-center px-1 py-1.5 rounded-lg transition-all ${sel ? 'bg-[#1677FF] text-white font-medium' : allPast ? 'text-[#CCCCCC] cursor-not-allowed' : 'text-[#666666] hover:bg-[#F5F6FA]'}`}>
                        <span className="text-[11px] block leading-tight">{block.label}</span>
                        <span className={`text-[10px] block leading-tight ${sel ? 'opacity-80' : 'opacity-60'}`}>{block.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 第三栏：半小时区间 */}
                <div className="flex-1 min-w-0 overflow-y-auto hide-scrollbar">
                  {selectedBlock !== null ? (
                    <div className="space-y-0.5">
                      {halfSlots.map((slot) => {
                        const isSelected = value === slot.value;
                        return (
                          <button key={slot.value} type="button"
                            onClick={() => { if (slot.disabled) return; onChange(slot.value); setOpen(false); }}
                            disabled={slot.disabled}
                            className={`w-full text-center py-1.5 rounded-lg text-[11px] font-medium transition-all ${isSelected ? 'bg-[#1677FF] text-white' : slot.disabled ? 'text-[#CCCCCC] cursor-not-allowed' : 'bg-[#F5F6FA] text-[#666666] hover:bg-[#E6F0FF] hover:text-[#1677FF]'}`}>
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[11px] text-[#CCCCCC] text-center px-1">点击左侧<br />4 小时区间</div>
                  )}
                </div>
              </>
            )}
          </div>

          {value && (
            <div className="mt-2 pt-2 border-t border-[#F5F6FA]">
              <span className="text-[11px] text-[#999999]">已选：</span>
              <span className="text-[11px] text-[#1677FF] font-medium">{displayValue}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
