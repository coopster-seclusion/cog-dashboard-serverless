import { useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { WITSProvider } from "@/context/WITSContext";
import { PropertiesProvider } from "@/context/PropertiesContext";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import NZXWITSData from "@/pages/NZXWITSData";
import COGProperties from "@/pages/COGProperties";


const NAV_LINK =
  "px-4 py-2 text-[11px] font-medium tracking-widest uppercase transition-colors border-b-2";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // WITSProvider and PropertiesProvider both wrap the whole app so
    // TopBar/Sidebar always have context regardless of active route.
    <WITSProvider>
      <PropertiesProvider>
      <BrowserRouter>
        <div className="flex flex-col h-screen overflow-hidden">
          <TopBar onMenuToggle={() => setSidebarOpen((o) => !o)} />

          <nav className="flex shrink-0 bg-[#0A0A0A] border-b border-[#2A2A2A] px-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${NAV_LINK} ${isActive ? "text-white border-[#E31937]" : "text-[#505050] border-transparent hover:text-[#A0A0A0]"}`
              }
            >
              NZX WITS Data
            </NavLink>
            <NavLink
              to="/properties"
              className={({ isActive }) =>
                `${NAV_LINK} ${isActive ? "text-white border-[#E31937]" : "text-[#505050] border-transparent hover:text-[#A0A0A0]"}`
              }
            >
              COG Properties
            </NavLink>
          </nav>

          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<NZXWITSData />} />
              <Route path="/properties" element={<COGProperties />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      </PropertiesProvider>
    </WITSProvider>
  );
}
