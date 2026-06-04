'use client'

export function AgvIcon({ size = 80, className = '' }: { size?: number; className?: string }) {
  const c = '#1677FF' // 主色

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 圆底 */}
      <circle cx="40" cy="40" r="38" fill={c} fillOpacity="0.08" stroke={c} strokeWidth="0.5" strokeOpacity="0.15" />

      {/* === 背景层（远）=== */}
      <rect x="12" y="38" width="10" height="23" rx="2" fill={c} opacity="0.3" />
      <rect x="56" y="34" width="10" height="27" rx="2" fill={c} opacity="0.25" />

      {/* === 中层 === */}
      <rect x="22" y="28" width="10" height="28" rx="2" fill={c} opacity="0.55" />
      <rect x="24" y="31" width="2" height="3" rx="0.5" fill="#fff" opacity="0.4" />
      <rect x="28" y="31" width="2" height="3" rx="0.5" fill="#fff" opacity="0.4" />
      <rect x="24" y="37" width="2" height="3" rx="0.5" fill="#fff" opacity="0.4" />
      <rect x="28" y="37" width="2" height="3" rx="0.5" fill="#fff" opacity="0.4" />

      {/* 主楼 — 最高居中 */}
      <rect x="33" y="18" width="14" height="38" rx="2" fill={c} />
      <rect x="36" y="22" width="2.5" height="3" rx="0.5" fill="#fff" opacity="0.4" />
      <rect x="40.5" y="22" width="2.5" height="3" rx="0.5" fill="#fff" opacity="0.4" />
      <rect x="36" y="29" width="2.5" height="3" rx="0.5" fill="#fff" opacity="0.4" />
      <rect x="40.5" y="29" width="2.5" height="3" rx="0.5" fill="#fff" opacity="0.4" />
      <rect x="36" y="36" width="2.5" height="3" rx="0.5" fill="#fff" opacity="0.4" />
      <rect x="40.5" y="36" width="2.5" height="3" rx="0.5" fill="#fff" opacity="0.4" />

      {/* === 前景层（近）=== */}
      <rect x="16" y="38" width="12" height="24" rx="2" fill={c} opacity="0.75" />
      <rect x="18.5" y="41" width="2.5" height="3" rx="0.5" fill="#fff" opacity="0.35" />
      <rect x="23" y="41" width="2.5" height="3" rx="0.5" fill="#fff" opacity="0.35" />
      <rect x="18.5" y="47" width="2.5" height="3" rx="0.5" fill="#fff" opacity="0.35" />

      <rect x="46" y="34" width="11" height="22" rx="2" fill={c} opacity="0.65" />
      <rect x="48" y="37" width="2" height="3" rx="0.5" fill="#fff" opacity="0.35" />
      <rect x="52" y="37" width="2" height="3" rx="0.5" fill="#fff" opacity="0.35" />
      <rect x="48" y="43" width="2" height="3" rx="0.5" fill="#fff" opacity="0.35" />

      <rect x="55" y="42" width="9" height="20" rx="2" fill={c} opacity="0.5" />
      <rect x="57" y="45" width="2" height="2.5" rx="0.5" fill="#fff" opacity="0.35" />
      <rect x="60.5" y="45" width="2" height="2.5" rx="0.5" fill="#fff" opacity="0.35" />

      {/* 天线 */}
      <line x1="40" y1="18" x2="40" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}
