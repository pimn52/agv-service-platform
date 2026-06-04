'use client';

import { useAppStore, type SubPage } from '@/store';
import { ArrowLeft } from 'lucide-react';
import { DeliveryOrderPage } from '@/components/order-create/delivery-order-page';
import { CruiseOrderPage } from '@/components/order-create/cruise-order-page';
import { CostConfirmPage } from '@/components/order-create/cost-confirm-page';
import { PaymentResultPage } from '@/components/order-create/payment-result-page';
import { OrderDetailPage } from '@/components/order/order-detail-page';
import { ScannerPage } from '@/components/shared/scanner-page';
import { CustomerServicePage } from '@/components/shared/customer-service-page';
import { CooperationPage } from '@/components/shared/cooperation-page';
import { RechargePage } from '@/components/profile/recharge-page';
import { InvoicePage } from '@/components/profile/invoice-page';
import { AddressPage } from '@/components/profile/address-page';
import { SettingsPage } from '@/components/profile/settings-page';
import { RoutePlanningPage } from '@/components/order-create/route-planning-page';

const SUB_PAGE_TITLES: Record<SubPage['key'], string> = {
  'delivery-order': '配送下单',
  'cruise-order': '巡游租车下单',
  'cost-confirm': '费用确认',
  'payment-result': '支付结果',
  'order-detail': '订单详情',
  scanner: '扫码',
  'customer-service': '在线客服',
  cooperation: '企业合作',
  recharge: '账户充值',
  invoice: '发票管理',
  address: '地址管理',
  settings: '设置',
  'route-plan': '路线规划',
};

const SUB_PAGE_COMPONENTS: Record<SubPage['key'], React.ComponentType<{ page: SubPage }>> = {
  'delivery-order': DeliveryOrderPage,
  'cruise-order': CruiseOrderPage,
  'cost-confirm': CostConfirmPage,
  'payment-result': PaymentResultPage,
  'order-detail': OrderDetailPage,
  scanner: ScannerPage,
  'customer-service': CustomerServicePage,
  cooperation: CooperationPage,
  recharge: RechargePage,
  invoice: InvoicePage,
  address: AddressPage,
  settings: SettingsPage,
  'route-plan': RoutePlanningPage,
};

/** 这些页面自带返回按钮，不显示 sub-page-renderer 的顶部返回栏 */
const PAGES_WITH_OWN_NAV = new Set<SubPage['key']>(['delivery-order', 'cruise-order', 'route-plan']);

export function SubPageRenderer() {
  const { pageStack, popPage } = useAppStore();
  const currentPage = pageStack[pageStack.length - 1];
  if (!currentPage) return null;

  const title = SUB_PAGE_TITLES[currentPage.key];
  const PageComponent = SUB_PAGE_COMPONENTS[currentPage.key];
  const hasOwnNav = PAGES_WITH_OWN_NAV.has(currentPage.key);

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* 顶部导航栏：仅对不带自带导航的页面显示 */}
      {!hasOwnNav && (
        <div className="flex items-center h-[44px] px-3 bg-white border-b border-[var(--border)] flex-shrink-0 safe-area-top">
          <button
            onClick={popPage}
            className="flex items-center gap-1 text-[#1677FF] active:opacity-60 transition-opacity"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="flex-1 text-center text-[15px] font-medium text-[#1A1A1A] pr-[52px]">
            {title}
          </h1>
        </div>
      )}

      {/* 页面内容 */}
      <div className={`flex-1 overflow-y-auto hide-scrollbar ${hasOwnNav ? '' : ''}`}>
        <PageComponent page={currentPage} />
      </div>
    </div>
  );
}
