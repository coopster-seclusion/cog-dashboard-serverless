import { Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TopBarProps {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex flex-col shrink-0 bg-[#111111] border-b border-[#2A2A2A]">
      <div className="flex items-center h-12 px-4 gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open menu"
          className="flex items-center justify-center -ml-1 w-9 h-9 shrink-0 rounded text-[#808080] hover:text-white hover:bg-[#1A1A1A] transition-colors"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2">
          <span className="w-0.5 h-4 bg-[#E31937] shrink-0" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-white uppercase whitespace-nowrap">
            COG Dashboard
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-3 ml-auto">
            {user.picture && (
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-[11px] text-[#808080] tracking-wide hidden sm:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="text-[10px] tracking-[0.15em] text-[#808080] uppercase hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
