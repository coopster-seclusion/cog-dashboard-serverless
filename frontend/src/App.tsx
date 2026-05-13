import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import Prices from "@/pages/Prices";
import Quantities from "@/pages/Quantities";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <BrowserRouter>
        <nav className="flex items-center gap-6 px-6 py-3 border-b border-border text-sm">
          <span className="font-mono font-semibold tracking-tight mr-4">NZ Grid</span>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            Prices
          </NavLink>
          <NavLink
            to="/quantities"
            className={({ isActive }) =>
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            Quantities
          </NavLink>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<Prices />} />
            <Route path="/quantities" element={<Quantities />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}
