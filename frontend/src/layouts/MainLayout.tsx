import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
}