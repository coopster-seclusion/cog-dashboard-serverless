import { useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { DashboardProvider } from "@/context/DashboardContext";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import Prices from "@/pages/Prices";
import Quantities from "@/pages/Quantities";

const NAV_LINK =
  "px-4 py-2 text-[11px] font-medium tracking-widest uppercase transition-colors border-b-2";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DashboardProvider>
      <BrowserRouter>
        <div className="flex flex-col h-screen overflow-hidden">
          <TopBar onMenuToggle={() => setSidebarOpen((o) => !o)} />

          {/* Page tabs */}
          <nav className="flex shrink-0 bg-[#0A0A0A] border-b border-[#2A2A2A] px-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${NAV_LINK} ${isActive ? "text-white border-[#E31937]" : "text-[#505050] border-transparent hover:text-[#A0A0A0]"}`
              }
            >
              Prices
            </NavLink>
            <NavLink
              to="/quantities"
              className={({ isActive }) =>
                `${NAV_LINK} ${isActive ? "text-white border-[#E31937]" : "text-[#505050] border-transparent hover:text-[#A0A0A0]"}`
              }
            >
              Quantities
            </NavLink>
          </nav>

          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Prices />} />
              <Route path="/quantities" element={<Quantities />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </DashboardProvider>
  );
}
