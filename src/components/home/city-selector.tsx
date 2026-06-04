'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import { CITIES } from '@/constants/cities';
import { ChevronDown, Check } from 'lucide-react';

export function CitySelector() {
  const { currentCity, setCurrentCity } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-0.5 text-[#1A1A1A] active:opacity-60 transition-opacity"
      >
        <span className="text-[14px] font-medium text-[#1A1A1A]">{currentCity.name}</span>
        <ChevronDown size="14" className={`text-[#999] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 城市选择下拉面板 */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-[200px] bg-white rounded-xl shadow-lg border border-[var(--border)] z-50 overflow-hidden">
            <div className="py-1 max-h-[280px] overflow-y-auto hide-scrollbar">
              {CITIES.map((city) => (
                <button
                  key={city.code}
                  onClick={() => {
                    if (city.available) {
                      setCurrentCity(city);
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    city.available
                      ? 'text-[#1A1A1A] active:bg-[#F5F6FA]'
                      : 'text-[#CCC] cursor-not-allowed'
                  } ${currentCity.code === city.code ? 'bg-[#E6F0FF]' : ''}`}
                >
                  <span>{city.name}</span>
                  <div className="flex items-center gap-2">
                    {!city.available && (
                      <span className="text-[10px] text-[#CCC]">即将开通</span>
                    )}
                    {currentCity.code === city.code && (
                      <Check size="14" className="text-[#1677FF]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
