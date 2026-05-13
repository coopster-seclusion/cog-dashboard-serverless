import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  live?: boolean;
  colSpan?: 1 | 2 | 3;
  children: React.ReactNode;
}

export default function WidgetCard({
  title,
  subtitle,
  live = false,
  colSpan = 1,
  children,
}: WidgetCardProps) {
  const colClass =
    colSpan === 3
      ? "lg:col-span-2 xl:col-span-3"
      : colSpan === 2
        ? "xl:col-span-2"
        : "";

  return (
    <div
      className={cn(
        "flex flex-col bg-[#111111] border border-[#2A2A2A] rounded",
        colClass
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A] shrink-0">
        <div>
          <h3 className="text-[11px] font-medium tracking-widest uppercase text-[#A0A0A0]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-[#505050] mt-0.5">{subtitle}</p>
          )}
        </div>
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E31937] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E31937]" />
          </span>
        )}
      </div>
      {/* Chart area — no padding, widgets bleed to card edge */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export function WidgetSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-[#1A1A1A] rounded"
      style={{ height }}
    />
  );
}
