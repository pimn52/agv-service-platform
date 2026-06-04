'use client';

import type { SubPage } from '@/store';
import { CONTACT } from '@/constants/services';

export function CooperationPage({ page }: { page: SubPage }) {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-[16px] font-semibold text-[#1A1A1A] mb-3">企业合作</h2>
        <p className="text-[13px] text-[#666] leading-6">
          城市无人车服务平台面向物流公司、商家、园区业主提供专业合作方案。
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-[14px] font-medium text-[#1A1A1A]">合作优势</h3>
        {[
          { title: '降低物流成本', desc: '无人化运营，降低人力成本60%以上' },
          { title: '24小时服务', desc: '全天候不间断配送和巡游服务' },
          { title: '智能调度', desc: 'AI算法自动优化路线和车辆分配' },
          { title: '数据驱动', desc: '完整的运营数据分析和管理系统' },
        ].map((item) => (
          <div key={item.title} className="p-3 bg-[#F5F6FA] rounded-lg">
            <div className="text-[13px] font-medium text-[#1A1A1A]">{item.title}</div>
            <div className="text-[12px] text-[#999] mt-0.5">{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-[14px] font-medium text-[#1A1A1A] mb-3">联系我们</h3>
        <div className="space-y-2 text-[13px] text-[#666]">
          <div>合作热线: {CONTACT.serviceHotline}</div>
          <div>商务邮箱: {CONTACT.businessEmail}</div>
        </div>
        <button className="w-full mt-4 py-2.5 bg-[#1677FF] text-white text-[14px] rounded-lg active:bg-[#0958D9] transition-colors">
          提交合作意向
        </button>
      </div>
    </div>
  );
}
