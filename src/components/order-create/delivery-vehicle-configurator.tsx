'use client';

import { Trash2 } from 'lucide-react';
import type { ShowcaseVehicleData } from './vehicle-data-helpers';

interface DeliveryVehicleConfiguratorProps {
  vehicles: ShowcaseVehicleData[];
  selections: { modelId: string; quantity: number }[];
  highlightedModelId: string;
  onHighlightChange: (id: string) => void;
  onAdd: (modelId: string) => void;
  onUpdateQuantity: (modelId: string, quantity: number) => void;
  onRemove: (modelId: string) => void;
}

export function DeliveryVehicleConfigurator({
  vehicles,
  selections,
  highlightedModelId,
  onHighlightChange,
  onAdd,
  onUpdateQuantity,
  onRemove,
}: DeliveryVehicleConfiguratorProps) {
  if (vehicles.length === 0) return null;

  const handleAdd = () => {
    if (highlightedModelId) onAdd(highlightedModelId);
  };

  const isSelected = (id: string) => selections.some((s) => s.modelId === id);
  const getQuantity = (id: string) => selections.find((s) => s.modelId === id)?.quantity ?? 0;

  return (
    <div className="space-y-2">
      {/* Chip 行 + 加入按钮 */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-1 min-w-0">
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => onHighlightChange(v.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-colors duration-200
                ${highlightedModelId === v.id
                  ? 'bg-[#E6F0FF] text-[#1677FF] border border-[#1677FF]'
                  : 'bg-[#F5F6FA] text-[#666666] border border-transparent'}`}
            >
              {v.name}
            </button>
          ))}
        </div>
        <button
          onClick={handleAdd}
          disabled={!highlightedModelId || isSelected(highlightedModelId)}
          className="shrink-0 px-3 py-1.5 bg-[#1677FF] text-white rounded-full text-[12px] font-medium
            hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors
            disabled:bg-[#CCCCCC] disabled:cursor-not-allowed"
        >
          + 选择
        </button>
      </div>

      {/* 已选车型列表 */}
      {selections.length > 0 && (
        <div className="pt-2 border-t border-[#F0F0F0] space-y-1.5">
          {selections.map((sel) => {
            const v = vehicles.find((m) => m.id === sel.modelId);
            if (!v) return null;
            return (
              <div key={sel.modelId} className="flex items-center gap-2">
                <img src={v.imageUrl} alt="" className="w-7 h-7 object-contain shrink-0 rounded" />
                <span className="text-[12px] text-[#1A1A1A] flex-1 min-w-0 truncate">{v.name}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onUpdateQuantity(sel.modelId, sel.quantity - 1)}
                    className="w-5 h-5 rounded border border-[#EEEEEE] flex items-center justify-center text-[#666666] hover:bg-[#F5F6FA] text-[11px]"
                  >
                    -
                  </button>
                  <span className="text-[12px] font-medium w-5 text-center">{sel.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(sel.modelId, sel.quantity + 1)}
                    className="w-5 h-5 rounded border border-[#EEEEEE] flex items-center justify-center text-[#666666] hover:bg-[#F5F6FA] text-[11px]"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => onRemove(sel.modelId)}
                  className="text-[#FF4D4F] hover:underline text-[10px] ml-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
