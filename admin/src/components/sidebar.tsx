import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, UtensilsCrossed, MapPin, Users, Truck, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/orders", label: "Order Board", icon: Truck },
  { path: "/menu", label: "Menu Control", icon: UtensilsCrossed },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/zones", label: "Zones", icon: MapPin },
]

function Sidebar() {
  const location = useLocation()
  const { logout, admin } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-surface border-r border-border flex flex-col z-20">
      <div className="h-16 flex items-center px-5 border-b border-border">
        <span className="font-display text-lg font-extrabold text-olive-700">
          Olive<span className="text-coral-500">Pinch</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2.5 text-sm transition-colors",
                isActive
                  ? "font-semibold bg-olive-50 text-olive-700 border-l-2 border-olive-600"
                  : "font-medium text-ink-muted hover:bg-cream-100 border-l-2 border-transparent"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-ink-muted mb-2 truncate">{admin?.email}</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs font-medium text-destructive hover:text-destructive/80 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </aside>
  )
}

export { Sidebar }
