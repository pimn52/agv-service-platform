'use client';

import type { ShowcaseVehicleData } from './vehicle-data-helpers';

interface VehicleShowcaseCardProps {
  vehicle: ShowcaseVehicleData;
  onClick?: (id: string) => void;
}

/** 纯车辆照片 + 规格文字，无车型名无背景无边框 */
export function VehicleShowcaseCard({ vehicle, onClick }: VehicleShowcaseCardProps) {
  return (
    <button
      onClick={() => onClick?.(vehicle.id)}
      className="w-full flex flex-col items-center"
    >
      <img
        src={vehicle.imageUrl}
        alt={vehicle.name}
        className="w-full h-[140px] object-contain"
      />
      <p className="text-[11px] text-[#999999] mt-1.5 text-center">
        {vehicle.specLines.join(' · ')}
      </p>
    </button>
  );
}
