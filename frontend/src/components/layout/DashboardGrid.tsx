import { cn } from "@/lib/utils";

interface DashboardGridProps {
  children: React.ReactNode;
  cols?: 3 | 12;
}

export default function DashboardGrid({ children, cols = 3 }: DashboardGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 p-4 auto-rows-min",
        cols === 12
          ? "grid-cols-12"
          : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}
