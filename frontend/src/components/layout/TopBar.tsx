interface TopBarProps {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle: _ }: TopBarProps) {
  return (
    <header className="flex flex-col shrink-0 bg-[#111111] border-b border-[#2A2A2A]">
      <div className="flex items-center h-12 px-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="w-0.5 h-4 bg-[#E31937] shrink-0" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-white uppercase whitespace-nowrap">
            COG Dashboard
          </span>
        </div>
      </div>
    </header>
  );
}
