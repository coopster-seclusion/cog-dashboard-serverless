import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PropertiesProvider } from "@/context/PropertiesContext";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import COGProperties from "@/pages/COGProperties";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PropertiesProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="flex flex-col h-screen overflow-hidden">
          <TopBar onMenuToggle={() => setSidebarOpen((o) => !o)} />

          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<COGProperties />} />
              {/* Single-page app for now — any other path falls back to the dashboard. */}
              <Route path="*" element={<COGProperties />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </PropertiesProvider>
  );
}
