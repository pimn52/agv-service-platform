export function SectionHeader({
  icon,
  title,
  accent = true,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      {accent && <div className="w-0.5 h-3.5 bg-[#1677FF] rounded-full shrink-0" />}
      {icon}
      <span className="text-[13px] font-semibold text-[#1A1A1A]">{title}</span>
    </div>
  );
}
