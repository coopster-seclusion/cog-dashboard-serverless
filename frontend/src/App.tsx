import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PropertiesProvider } from "@/context/PropertiesContext";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import COGProperties from "@/pages/COGProperties";
import Login from "@/pages/Login";

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D]">
        <span className="text-[11px] tracking-[0.2em] text-[#404040] uppercase">
          Loading…
        </span>
      </div>
    );
  }

  // The SPA shell is served to everyone, but the dashboard (and the data queries
  // it fires) only mount once the session is verified — unauthorized users see
  // the login screen and nothing else.
  if (!isAuthenticated) return <Login />;

  return <Dashboard />;
}

function Dashboard() {
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
