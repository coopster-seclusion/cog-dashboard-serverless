import { cn } from "@/lib/utils";

// Explicit map so Tailwind JIT picks up all col-span-* classes
const COL_SPAN: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  rightContent?: string;
  live?: boolean;
  colSpan?: number;
  children: React.ReactNode;
}

export default function WidgetCard({
  title,
  subtitle,
  rightContent,
  live = false,
  colSpan,
  children,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-[#111111] border border-[#2A2A2A] rounded",
        colSpan ? COL_SPAN[colSpan] : "",
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
        <div className="flex items-center gap-2">
          {rightContent && (
            <span className="text-[10px] font-mono text-[#00BCD4] whitespace-nowrap">
              {rightContent}
            </span>
          )}
          {live && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
            </span>
          )}
        </div>
      </div>
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
