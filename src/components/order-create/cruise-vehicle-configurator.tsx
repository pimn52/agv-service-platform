'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Plus, Trash2, Upload, Download } from 'lucide-react';
import type { ShowcaseVehicleData } from './vehicle-data-helpers';
import { SectionHeader } from '@/components/shared/section-header';
import {
  VENDING_PACKAGES,
  SECURITY_PACKAGES,
} from '@/constants/services';

// ─── 类型 ────────────────────────────

export interface PackageOption {
  id: string;
  name: string;
  items: string[];
  price: number; // 总价（元）
  compatibleModels: readonly string[];
}

interface PackageSelection {
  packageId: string;
  quantity: number;
}

interface LocationItem {
  id: string;
  location: string;
  duration: string;
  packageSelections: PackageSelection[];
}

export interface CruiseVehicleConfiguratorHandle {
  scrollToModel: (modelId: string) => void;
}

interface CruiseVehicleConfiguratorProps {
  vehicles: ShowcaseVehicleData[];
  selectedModelId: string;
  serviceType: 'vending' | 'security';
  rentalDays: number;
  onRentalDaysChange: (days: number) => void;
  locations: LocationItem[];
  onAddLocation: () => void;
  onRemoveLocation: (id: string) => void;
  onUpdateLocation: (id: string, field: keyof LocationItem, value: string | PackageSelection[]) => void;
  onTogglePackage: (locId: string, pkgId: string) => void;
  onUpdatePackageQty: (locId: string, pkgId: string, qty: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  showCsvPreview: boolean;
  csvPreviewData: string[][];
  onConfirmCsv: () => void;
  onCancelCsv: () => void;
  onSelectModel: (modelId: string) => void;
  boundPackage?: PackageOption;
}

export const CruiseVehicleConfigurator = forwardRef<
  CruiseVehicleConfiguratorHandle,
  CruiseVehicleConfiguratorProps
>(function CruiseVehicleConfigurator(props, ref) {
  const {
    vehicles,
    selectedModelId,
    serviceType,
    rentalDays,
    onRentalDaysChange,
    locations,
    onAddLocation,
    onRemoveLocation,
    onUpdateLocation,
    onTogglePackage,
    onUpdatePackageQty,
    fileInputRef,
    onFileUpload,
    onDownloadTemplate,
    showCsvPreview,
    csvPreviewData,
    onConfirmCsv,
    onCancelCsv,
    onSelectModel,
    boundPackage,
  } = props;

  const modelRows = useRef<Map<string, HTMLElement>>(new Map());

  useImperativeHandle(ref, () => ({
    scrollToModel(modelId: string) {
      const el = modelRows.current.get(modelId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.classList.add('configurator-flash');
      setTimeout(() => el?.classList.remove('configurator-flash'), 1500);
    },
  }));

  const locCount = locations.length;

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <SectionHeader icon={<span className="text-[14px]">📦</span>} title="配套与数量" accent={false} />

      {/* 车型选择 chip 行 */}
      <div className="mb-3">
        <p className="text-[11px] text-[#999999] mb-1.5">选择车型</p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {vehicles.map((v) => {
            const isSel = v.id === selectedModelId;
            return (
              <button
                key={v.id}
                ref={(el) => { if (el) modelRows.current.set(v.id, el); }}
                onClick={() => onSelectModel(v.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-colors duration-200
                  ${isSel
                    ? 'bg-[#1677FF] text-white'
                    : 'bg-[#F5F6FA] text-[#666666] border border-transparent hover:border-[#CCCCCC]'}`}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 全局参数 */}
      {serviceType === 'vending' && (
        <div className="flex items-center gap-4 mb-3 pb-3 border-b border-[#F5F6FA]">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#999999]">租车天数</span>
            <button onClick={() => onRentalDaysChange(Math.max(1, rentalDays - 1))} className="w-6 h-6 rounded border border-[#EEEEEE] flex items-center justify-center text-[#666666] hover:bg-[#EEEEEE] text-[12px]">-</button>
            <span className="text-[13px] font-medium w-5 text-center">{rentalDays}</span>
            <button onClick={() => onRentalDaysChange(rentalDays + 1)} className="w-6 h-6 rounded border border-[#EEEEEE] flex items-center justify-center text-[#666666] hover:bg-[#EEEEEE] text-[12px]">+</button>
            <span className="text-[10px] text-[#999999]">天</span>
          </div>
        </div>
      )}

      {/* 套餐（车型决定套餐，自动绑定，仅展示） */}
      {boundPackage && (
        <div className="mb-3">
          <span className="text-[11px] text-[#999999] mb-1.5 block">绑定套餐（车型决定）</span>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#E6F0FF] border border-[#1677FF]/20">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#1677FF]">{boundPackage.name}</p>
              <p className="text-[10px] text-[#999999] truncate">{boundPackage.items.join('、')}</p>
            </div>
            <span className="text-[12px] text-[#1A1A1A] font-medium shrink-0">¥{boundPackage.price.toLocaleString()}<span className="text-[10px] text-[#999999]">/天</span></span>
          </div>
        </div>
      )}

      {/* 提车地点列表 */}
      <div className="border-t border-[#EEEEEE] pt-3">
        <SectionHeader icon={<span className="text-[14px]">📍</span>} title={locCount > 1 ? `提车地点（${locCount}个）` : '提车地点'} accent={false} />
      </div>
      {locations.map((loc, idx) => (
        <div key={loc.id}>
          {idx > 0 && <div className="mx-1 h-px bg-[#EEEEEE] my-2" />}
          <div className="bg-[#FAFAFA] rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[#999999]">#{idx + 1}</span>
              <div className="flex items-center gap-2">
                {locCount > 1 && (
                  <button onClick={() => onRemoveLocation(loc.id)} className="text-[#FF4D4F] hover:underline text-[11px] flex items-center gap-0.5">
                    <Trash2 size={11} />删除
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={serviceType === 'vending' ? '服务区域/地点' : '巡检区域'}
                    value={loc.location}
                    onChange={(e) => onUpdateLocation(loc.id, 'location', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                  />
                </div>
              </div>
              {serviceType === 'vending' && (
                <input
                  type="text"
                  placeholder="服务时长（如：4小时）"
                  value={loc.duration}
                  onChange={(e) => onUpdateLocation(loc.id, 'duration', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                />
              )}

              {/* 此地点车辆数量（套餐由车型自动绑定） */}
              {boundPackage && (
                <div className="pt-1.5 border-t border-[#EEEEEE]">
                  <span className="text-[10px] text-[#999999] mb-1 block">{boundPackage.name} · 车辆数量</span>
                  {loc.packageSelections.map((ps) => (
                    <div key={ps.packageId} className="flex items-center gap-2 bg-white rounded p-1.5">
                      <span className="text-[11px] flex-1 min-w-0 truncate">{boundPackage.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onUpdatePackageQty(loc.id, ps.packageId, Math.max(0, ps.quantity - 1))} className="w-5 h-5 rounded border border-[#EEEEEE] flex items-center justify-center text-[#666666] hover:bg-[#EEEEEE] text-[10px]">-</button>
                        <span className="text-[12px] font-medium w-4 text-center">{ps.quantity}</span>
                        <button onClick={() => onUpdatePackageQty(loc.id, ps.packageId, ps.quantity + 1)} className="w-5 h-5 rounded border border-[#EEEEEE] flex items-center justify-center text-[#666666] hover:bg-[#EEEEEE] text-[10px]">+</button>
                      </div>
                      <span className="text-[10px] text-[#999999]">辆</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-3 pt-2 border-t border-[#EEEEEE]">
        <button onClick={onAddLocation} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-[#1677FF] text-[12px] text-[#1677FF] hover:bg-[#E6F0FF] transition-colors">
          <Plus size={13} />添加车辆/区域
        </button>
        <label className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-[#EEEEEE] text-[11px] text-[#666666] hover:bg-[#F5F6FA] transition-colors cursor-pointer">
          <Upload size={12} />从CSV导入
          <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileUpload} className="hidden" />
        </label>
        <button onClick={onDownloadTemplate} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-[#EEEEEE] text-[11px] text-[#666666] hover:bg-[#F5F6FA] transition-colors">
          <Download size={12} />下载模板
        </button>
      </div>

      {/* CSV 预览 */}
      {showCsvPreview && csvPreviewData.length > 1 && (
        <div className="mt-2 p-2 bg-[#F5F6FA] rounded-lg border border-[#1677FF]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-[#1677FF]">识别到 {csvPreviewData.length - 1} 条</span>
            <div className="flex gap-2">
              <button onClick={onCancelCsv} className="text-[10px] text-[#999999]">取消</button>
              <button onClick={onConfirmCsv} className="text-[10px] text-[#1677FF] font-medium">确认导入</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead><tr className="bg-white">{csvPreviewData[0].map((h, i) => <th key={i} className="px-1.5 py-1 text-left text-[#999999]">{h}</th>)}</tr></thead>
              <tbody>
                {csvPreviewData.slice(1, 4).map((row, ri) => (
                  <tr key={ri}>{row.map((c, ci) => <td key={ci} className="px-1.5 py-0.5 text-[#666666]">{c}</td>)}</tr>
                ))}
                {csvPreviewData.length > 4 && (
                  <tr><td colSpan={csvPreviewData[0].length} className="px-1.5 py-0.5 text-[#999999] text-center">...共 {csvPreviewData.length - 1} 条</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});
