import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, UtensilsCrossed, CalendarRange, MapPin, Users, Truck, LogOut, ShieldCheck } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/logo"

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ path: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { path: "/orders", label: "Order Board", icon: Truck },
      { path: "/menu", label: "Menu Control", icon: UtensilsCrossed },
      { path: "/menu-weeks", label: "Weekly Menu", icon: CalendarRange },
    ],
  },
  {
    label: "People",
    items: [
      { path: "/customers", label: "Customers", icon: Users },
      { path: "/admins", label: "Admin Users", icon: ShieldCheck },
    ],
  },
  {
    label: "Settings",
    items: [{ path: "/zones", label: "Zones", icon: MapPin }],
  },
]

function Sidebar() {
  const location = useLocation()
  const { logout, admin } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface border-r border-border flex flex-col z-20">
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <Logo className="text-lg" />
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.path === "/" ? location.pathname === "/" : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-olive-50 text-olive-700 font-semibold"
                        : "font-medium text-ink-muted hover:bg-canvas hover:text-ink"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3 shrink-0">
        <div className="rounded-md bg-canvas px-3 py-2.5">
          <p className="text-xs font-medium text-ink truncate">{admin?.name}</p>
          <p className="text-[11px] text-ink-muted truncate mb-2">{admin?.email}</p>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted hover:text-coral-500 cursor-pointer transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Log out
          </button>
        </div>
      </div>
    </aside>
  )
}

export { Sidebar }
