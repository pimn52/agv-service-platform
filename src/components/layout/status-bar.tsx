'use client';

import { useState, useEffect } from 'react';
import { Signal, Wifi, Battery, BatteryCharging } from 'lucide-react';

/**
 * 模拟手机状态栏组件（苹果风格）
 * - 桌面端：白色背景，中间黑色刘海条，时间/信号/电池在刘海两侧
 * - 移动端：由 AppShell 控制隐藏，使用手机真实状态栏
 */
export function StatusBar() {
  const [time, setTime] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // 苹果风格：白色背景，黑色文字和图标，中间刘海由CSS伪元素实现
  const barClass = 'status-bar h-[32px] flex items-center justify-between px-6 text-[11px] font-semibold bg-white text-[#1A1A1A] relative z-[101]';

  if (!mounted) {
    return (
      <div className={barClass}>
        <span>--:--</span>
        <div className="flex items-center gap-1">
          <Signal className="w-3 h-3" />
          <Wifi className="w-3 h-3" />
          <Battery className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  return (
    <div className={barClass}>
      <span className="w-14">{time}</span>
      <div className="flex items-center gap-1">
        <Signal className="w-3 h-3" />
        <Wifi className="w-3 h-3" />
        <BatteryCharging className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
