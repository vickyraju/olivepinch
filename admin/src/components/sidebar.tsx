import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { Logo } from "@/components/logo"

const navItems = [
  { path: "/", label: "Dashboard", icon: "dashboard" },
  { path: "/orders", label: "Order Board", icon: "list_alt" },
  { path: "/menu", label: "Menu Control", icon: "restaurant_menu" },
  { path: "/menu-weeks", label: "Weekly Menu", icon: "calendar_month" },
  { path: "/plans", label: "Plans", icon: "sell" },
  { path: "/customers", label: "Customers", icon: "group" },
  { path: "/zones", label: "Zones", icon: "location_on" },
]

export function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-white border-r border-gray-200 flex flex-col z-20">
      <div className="h-[80px] flex items-center px-6 border-b border-gray-100">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-6 py-3 transition-colors text-[14px] ${
                isActive
                  ? "font-bold bg-[#F0F7F3] text-[#2E6B3E] border-l-[3px] border-[#418A56]"
                  : "font-medium text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-100 py-2">
        <Link
          to="/admins"
          className={`flex items-center gap-3 px-6 py-3 text-[14px] transition-colors ${
            location.pathname.startsWith("/admins")
              ? "font-bold bg-[#F0F7F3] text-[#2E6B3E] border-l-[3px] border-[#418A56]"
              : "font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          <span className="material-symbols-outlined">admin_panel_settings</span>
          <span>Admin Users</span>
        </Link>
        <div className="px-6 pt-2 pb-4">
          <button
            onClick={logout}
            className="flex items-center gap-3 text-status-red hover:text-red-700 text-[14px] font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
