import { Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MonitorForm from "./pages/MonitorForm";
import MonitorDetail from "./pages/MonitorDetail";

function App() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="text-2xl">🕷️</span>
            <span>Spidey</span>
          </Link>
          {!isHome && (
            <Link
              to="/"
              className="text-sm text-gray-400 hover:text-gray-200 transition"
            >
              ← Back to Dashboard
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/monitors/new" element={<MonitorForm />} />
          <Route path="/monitors/:id/edit" element={<MonitorForm />} />
          <Route path="/monitors/:id" element={<MonitorDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
