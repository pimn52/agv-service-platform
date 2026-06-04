'use client';

import { CitySelector } from './city-selector';
import { SearchBar } from './search-bar';
import { ServiceEntry } from './service-entry';
import { OrderDynamics } from './order-dynamics';
import { ServiceLinks } from './service-links';
import { QrCode } from 'lucide-react';
import { useAppStore } from '@/store';

export function HomePage() {
  const { pushPage } = useAppStore();

  return (
    <div className="flex flex-col min-h-full bg-[#F5F6FA]">
      {/* 顶部固定栏 */}
      <div className="bg-white sticky top-0 z-20">
        <div className="flex items-center justify-between h-[52px] px-4">
          {/* 左侧：城市选择（无定位图标） */}
          <div className="w-20 flex justify-start">
            <CitySelector />
          </div>

          {/* 中间：标题 */}
          <h1 className="text-[15px] font-normal text-[#1A1A1A]">
            城市无人车服务
          </h1>

          {/* 右侧：扫码按钮 */}
          <div className="w-20 flex justify-end">
            <button
              id="tour-scanner"
              onClick={() => pushPage({ key: 'scanner' })}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F6FA] active:bg-[#EEEEEE] transition-colors"
            >
              <QrCode className="w-[18px] h-[18px] text-[#666666]" />
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 pb-3">
          <SearchBar />
        </div>
      </div>

      {/* 下单入口栏 */}
      <div id="tour-service-entry" className="px-4 py-3">
        <ServiceEntry />
      </div>

      {/* 订单服务动态面板 */}
      <div id="tour-home-dynamics" className="px-4 pb-2">
        <OrderDynamics />
      </div>

      {/* 在线客服和企业合作 */}
      <div className="px-4 pb-2">
        <ServiceLinks />
      </div>

      {/* 底部品牌栏 */}
      <div className="px-4 pb-5 text-center">
        <p className="text-[10px] text-[#CCC]">© 洪攀 · 城市无人车商用运营平台</p>
      </div>
    </div>
  );
}
