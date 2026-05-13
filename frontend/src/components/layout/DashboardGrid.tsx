interface DashboardGridProps {
  children: React.ReactNode;
}

export default function DashboardGrid({ children }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-6 auto-rows-min">
      {children}
    </div>
  );
}
