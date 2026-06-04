'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { VehicleShowcaseCard } from './vehicle-showcase-card';
import type { ShowcaseVehicleData } from './vehicle-data-helpers';

export interface VehicleShowcaseCarouselHandle {
  scrollToVehicle: (id: string) => void;
}

interface VehicleShowcaseCarouselProps {
  vehicles: ShowcaseVehicleData[];
  onVehicleClick?: (id: string) => void;
  useFullName?: boolean;
}

export const VehicleShowcaseCarousel = forwardRef<
  VehicleShowcaseCarouselHandle,
  VehicleShowcaseCarouselProps
>(function VehicleShowcaseCarousel({ vehicles, onVehicleClick, useFullName }, ref) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(vehicles.length - 1, 0));

  useImperativeHandle(ref, () => ({
    scrollToVehicle(id: string) {
      const i = vehicles.findIndex((v) => v.id === id);
      if (i >= 0) setIndex(i);
    },
  }), [vehicles]);

  if (vehicles.length === 0) {
    return <div className="h-[180px] flex items-center justify-center text-[#CCCCCC] text-[12px]">暂无车型</div>;
  }

  const current = vehicles[safeIndex];

  const handleChipClick = (v: ShowcaseVehicleData) => {
    const i = vehicles.findIndex((m) => m.id === v.id);
    if (i >= 0) setIndex(i);
    onVehicleClick?.(v.id);
  };

  return (
    <div>
      {/* 照片 */}
      {current && (
        <VehicleShowcaseCard
          vehicle={current}
          onClick={onVehicleClick}
        />
      )}

      {/* Chip 行（替代圆点指示器） */}
      <div className="flex justify-center gap-1.5 mt-2 overflow-x-auto hide-scrollbar">
        {vehicles.map((v) => {
          const active = v.id === current?.id;
          return (
            <button
              key={v.id}
              onClick={() => handleChipClick(v)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors duration-200
                ${active
                  ? 'bg-[#1677FF] text-white'
                  : 'bg-[#F5F6FA] text-[#666666] hover:bg-[#E6F0FF]'}`}
            >
              {useFullName ? v.name : v.shortName}
            </button>
          );
        })}
      </div>
    </div>
  );
});
