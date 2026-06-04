export interface User {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  organization?: Organization;
  balance: number;            // 账户余额（分）
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: 'logistics' | 'merchant' | 'property'; // 物流公司/商家/业主
  contactName: string;
  contactPhone: string;
}

export interface InvoiceInfo {
  id: string;
  orderId: string;
  type: 'normal' | 'special';  // 普票/专票
  title: string;
  amount: number;
  status: 'pending' | 'issued' | 'cancelled';
  issuedAt?: string;
}
