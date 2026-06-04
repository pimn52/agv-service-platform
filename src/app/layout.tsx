import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '城市无人车服务',
  description: '城市无人车物流与租车服务平台 - 物流配送、巡游贩卖、安防巡检',
  keywords: ['无人车', '物流配送', '巡游贩卖', '安防巡检', '智慧物流'],
};

export const viewport = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
