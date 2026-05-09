const LOGO_URL = "/Logo.png";

import { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const getActivePage = (pathname: string) => {
    if (pathname.startsWith("/ssylki")) return "ssylki";
    if (pathname.startsWith("/ankety")) return "ankety";
    if (pathname.startsWith("/otchety")) return "otchety";
    if (pathname.startsWith("/admin")) return "users";
    return "oprosi";
  };

  const activePage = getActivePage(location.pathname);
  const { user } = useAuth();
  const userName = user?.full_name || user?.email || "Автор";

  return (
    <>
      <div className="flex w-full items-center gap-4">
        <button
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-md bg-white shadow-sm"
          aria-label="Открыть меню"
          onClick={() => setMobileOpen(true)}
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 6h18M3 12h18M3 18h18"
              stroke="#0078FF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex-1 min-w-0 px-3 md:px-8 py-3 rounded-[10px] bg-white shadow-[0_15px_40px_5px_rgba(237,237,237,1)] text-center overflow-hidden">
          <h1 className="text-center text-sm md:text-2xl font-normal text-black truncate">
            <span className="sm:hidden">ИС качество в Сибгиу</span>
            <span className="hidden sm:inline">
              Информационная система «Качество в СибГИУ»
            </span>
          </h1>
        </div>
        <div className="flex-shrink-0 ml-3 hidden sm:block text-right">
          <span className="text-xs text-text-gray block">{userName}</span>
        </div>
      </div>

      {mobileOpen && (
        <Sidebar
          isMobile
          activePage={activePage}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
