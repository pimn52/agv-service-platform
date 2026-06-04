/** 本地通知（组件内部管理，非全局 AppNotification） */
export interface LocalNotification {
  id: string;
  orderId: string;
  message: string;
  type: 'general' | 'special';
  title?: string;
  dismissed: boolean;
  postponed: boolean;
}
