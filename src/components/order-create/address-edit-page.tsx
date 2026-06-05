'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store';
import type { SubPage, AddressEditData } from '@/store';
import { useOrderStore } from '@/store/use-order-store';
import type { RouteStop, LTLWaybill } from '@/types';
import { AddressBookButton } from '@/components/shared/address-book-button';
import type { AddressEntry } from '@/data/addresses';
import { DELIVERY_ADDRESS_BOOK } from '@/data/addresses';
import { ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';

let _seq = 0;
function nextId() { _seq++; return `stop-${Date.now()}-${_seq}`; }

export function AddressEditPage({ page }: { page: SubPage }) {
  const pageData = (page as { key: 'address-edit'; data: AddressEditData }).data;
  const { popPage } = useAppStore();

  const isWaybill = !!pageData.ltlWaybills;
  const [savedAddresses, setSavedAddresses] = useState<AddressEntry[]>([]);

  // ─── 整车模式：stops 编辑 ───
  const [stops, setStops] = useState<RouteStop[]>(pageData.stops);
  const isFtl = pageData.mode !== 'lcl';
  const pickupLabel = isFtl ? '装货' : '投件';
  const deliveryLabel = isFtl ? '卸货' : '取件';
  const pickupCount = stops.filter((s) => s.type === 'pickup').length;
  const deliveryCount = stops.filter((s) => s.type === 'delivery').length;
  const canAddPickup = deliveryCount <= 1;
  const canAddDelivery = pickupCount <= 1;

  const updateStop = (id: string, updates: Partial<RouteStop>) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };
  const addPickup = useCallback(() => {
    setStops((prev) => {
      if (prev.filter((s) => s.type === 'delivery').length > 1) return prev;
      const lastIdx = prev.map((s) => s.type).lastIndexOf('pickup');
      const newStop: RouteStop = { id: nextId(), type: 'pickup', address: '', contactName: '', contactPhone: '', sequence: lastIdx + 1 };
      const next = [...prev];
      next.splice(lastIdx + 1, 0, newStop);
      return next.map((s, i) => ({ ...s, sequence: i }));
    });
  }, []);
  const addDelivery = useCallback(() => {
    setStops((prev) => {
      if (prev.filter((s) => s.type === 'pickup').length > 1) return prev;
      const newStop: RouteStop = { id: nextId(), type: 'delivery', address: '', contactName: '', contactPhone: '', sequence: prev.length };
      return [...prev, newStop].map((s, i) => ({ ...s, sequence: i }));
    });
  }, []);
  const removeStop = useCallback((id: string) => {
    setStops((prev) => {
      const target = prev.find((s) => s.id === id);
      if (!target) return prev;
      if (prev.filter((s) => s.type === target.type).length <= 1) return prev;
      return prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, sequence: i }));
    });
  }, []);

  // ─── 散件模式：ltlWaybills 编辑 ───
  const [ltlWaybills, setLtlWaybills] = useState<LTLWaybill[]>(pageData.ltlWaybills || []);
  const currentId = pageData.currentWaybillId || '';
  const wb = ltlWaybills.find((w) => w.id === currentId);
  const updateWaybillField = (field: keyof LTLWaybill, value: string) => {
    setLtlWaybills((prev) => prev.map((w) => (w.id === currentId ? { ...w, [field]: value } : w)));
  };

  const handleSave = () => {
    let payload: Record<string, unknown>;
    if (isWaybill) {
      payload = { mode: 'lcl', ltlWaybills };
    } else {
      // FTL：将编辑后的 stops 合并回完整 ftlWaybills，像 LTL 一样全量存
      const mergedFtl = (pageData.ftlWaybills || []).map((fw) =>
        fw.id === pageData.currentWaybillId ? { ...fw, stops } : fw
      );
      payload = { mode: 'full', ftlWaybills: mergedFtl, currentWaybillId: pageData.currentWaybillId };
    }
    sessionStorage.setItem('agv-addr-pending', JSON.stringify(payload))
    popPage();
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      <div className="bg-white border-b border-[#EEEEEE] shrink-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5">
          <button onClick={() => popPage()} className="flex items-center gap-1 text-[#1677FF] active:opacity-60 justify-self-start">
            <ArrowLeft size={18} />
            <span className="text-[13px]">返回</span>
          </button>
          <h1 className="text-[15px] font-medium text-[#1A1A1A]">编辑地址</h1>
          <button onClick={handleSave} className="text-[13px] text-[#1677FF] font-medium justify-self-end hover:underline">保存</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pt-3 space-y-3">
        {/* ─── 散件模式：投件 + 取件（无 ⊕ 按钮） ─── */}
        {isWaybill && wb && (
          <>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[#E6F0FF] text-[#1677FF] shadow-sm">发</span>
                <span className="text-[13px] font-semibold text-[#1A1A1A]">投件</span>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <input type="text" placeholder="投件地址" value={wb.pickupAddress} onChange={(e) => updateWaybillField('pickupAddress', e.target.value)}
                    className="w-full px-3 py-2 pr-8 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <AddressBookButton currentValue={wb.pickupAddress ?? ''} currentContactName={wb.pickupContactName ?? ''} currentContactPhone={wb.pickupContactPhone ?? ''}
                      savedEntries={savedAddresses} addressBookPreset={DELIVERY_ADDRESS_BOOK}
                      onSave={(entry) => setSavedAddresses((prev) => prev.some((e) => e.address === entry.address) ? prev : [entry, ...prev])}
                      onSelect={(entry) => { updateWaybillField('pickupAddress', entry.address); updateWaybillField('pickupContactName', entry.name || ''); updateWaybillField('pickupContactPhone', entry.phone || ''); }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="姓名" value={wb.pickupContactName} onChange={(e) => updateWaybillField('pickupContactName', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                  <input type="tel" placeholder="手机号" value={wb.pickupContactPhone} onChange={(e) => updateWaybillField('pickupContactPhone', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[#F6FFED] text-[#52C41A] shadow-sm">收</span>
                <span className="text-[13px] font-semibold text-[#1A1A1A]">取件</span>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <input type="text" placeholder="取件地址" value={wb.deliveryAddress} onChange={(e) => updateWaybillField('deliveryAddress', e.target.value)}
                    className="w-full px-3 py-2 pr-8 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <AddressBookButton currentValue={wb.deliveryAddress ?? ''} currentContactName={wb.deliveryContactName ?? ''} currentContactPhone={wb.deliveryContactPhone ?? ''}
                      savedEntries={savedAddresses} addressBookPreset={DELIVERY_ADDRESS_BOOK}
                      onSave={(entry) => setSavedAddresses((prev) => prev.some((e) => e.address === entry.address) ? prev : [entry, ...prev])}
                      onSelect={(entry) => { updateWaybillField('deliveryAddress', entry.address); updateWaybillField('deliveryContactName', entry.name || ''); updateWaybillField('deliveryContactPhone', entry.phone || ''); }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="姓名" value={wb.deliveryContactName} onChange={(e) => updateWaybillField('deliveryContactName', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                  <input type="tel" placeholder="手机号" value={wb.deliveryContactPhone} onChange={(e) => updateWaybillField('deliveryContactPhone', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── 整车模式：经停点列表 ─── */}
        {!isWaybill && (
          <>
            {pickupCount > 1 && (
              <div className="bg-[#E6F0FF] rounded-lg px-3 py-2 text-[11px] text-[#1677FF]">
                当前为集货模式（{pickupCount}{pickupLabel}→{deliveryCount}{deliveryLabel}），暂不支持同时新增{deliveryLabel}点
              </div>
            )}
            {deliveryCount > 1 && (
              <div className="bg-[#E6F0FF] rounded-lg px-3 py-2 text-[11px] text-[#1677FF]">
                当前为配送模式（{pickupCount}{pickupLabel}→{deliveryCount}{deliveryLabel}），暂不支持同时新增{pickupLabel}点
              </div>
            )}
            {pageData.mode === 'full' && stops.length > 2 && stops.some((s) => s.address) && (
              <button className="w-full py-2 rounded-lg border border-dashed border-[#1677FF] text-[12px] text-[#1677FF] flex items-center justify-center gap-1 hover:bg-[#E6F0FF] transition-colors">
                ✨ 智能优化经停点顺序
              </button>
            )}
            {stops.map((s, idx) => {
              const isPickup = s.type === 'pickup';
              const isFirst = idx === 0;
              const isLast = idx === stops.length - 1;
              const sameType = isPickup ? pickupCount : deliveryCount;
              return (
                <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shadow-sm ${isPickup ? 'bg-[#E6F0FF] text-[#1677FF]' : 'bg-[#F6FFED] text-[#52C41A]'}`}>
                        {isPickup ? '发' : '收'}
                      </span>
                      <span className="text-[13px] font-semibold text-[#1A1A1A]">{isPickup ? pickupLabel : deliveryLabel}</span>
                    </div>
                    {isFirst ? (
                      canAddPickup ? (
                        <button onClick={addPickup} className="flex items-center gap-0.5 text-[12px] text-[#999999] hover:text-[#1677FF] transition-colors"><PlusCircle size={12} />{pickupLabel}</button>
                      ) : null
                    ) : isLast ? (
                      canAddDelivery ? (
                        <button onClick={addDelivery} className="flex items-center gap-0.5 text-[12px] text-[#999999] hover:text-[#1677FF] transition-colors"><PlusCircle size={12} />{deliveryLabel}</button>
                      ) : null
                    ) : sameType > 1 ? (
                      <button onClick={() => removeStop(s.id)} className="flex items-center gap-0.5 text-[12px] text-[#999999] hover:text-[#FF4D4F] transition-colors"><Trash2 size={12} />删除</button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <input type="text" placeholder={isPickup ? `${pickupLabel}地址` : `${deliveryLabel}地址`} value={s.address} onChange={(e) => updateStop(s.id, { address: e.target.value })}
                        className="w-full px-3 py-2 pr-8 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2">
                        <AddressBookButton currentValue={s.address} currentContactName={s.contactName} currentContactPhone={s.contactPhone}
                          savedEntries={savedAddresses} addressBookPreset={DELIVERY_ADDRESS_BOOK}
                          onSave={(entry) => setSavedAddresses((prev) => prev.some((e) => e.address === entry.address) ? prev : [entry, ...prev])}
                          onSelect={(entry) => updateStop(s.id, { address: entry.address, contactName: entry.name || s.contactName, contactPhone: entry.phone || s.contactPhone })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="姓名" value={s.contactName} onChange={(e) => updateStop(s.id, { contactName: e.target.value })}
                        className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                      <input type="tel" placeholder="手机号" value={s.contactPhone} onChange={(e) => updateStop(s.id, { contactPhone: e.target.value })}
                        className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
