import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { User, Activity, Truck, RefreshCw, LogOut } from "lucide-react"
import { DashboardProvider } from "@/lib/dashboard-context"
import { useAuth } from "@/lib/auth"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/dashboard", label: "Profile", icon: User, end: true },
  { to: "/dashboard/health", label: "Health Tracker", icon: Activity, end: false },
  { to: "/dashboard/delivery", label: "Meal Delivery", icon: Truck, end: false },
  { to: "/dashboard/subscription", label: "Subscription", icon: RefreshCw, end: false },
]

function DashboardLayoutInner() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/")
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link to="/">
            <Logo className="text-lg" />
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink cursor-pointer">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      <div className="flex-1 bg-cream">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 grid gap-8 md:grid-cols-[220px_1fr]">
          <nav aria-label="Dashboard" className="flex md:flex-col gap-1.5 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                    isActive ? "bg-olive-600 text-white" : "text-ink hover:bg-cream-100"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardLayout() {
  return (
    <DashboardProvider>
      <DashboardLayoutInner />
    </DashboardProvider>
  )
}

export default DashboardLayout
