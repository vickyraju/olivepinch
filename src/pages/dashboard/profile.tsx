import { Link } from "react-router-dom"
import { Activity, Truck, RefreshCw, ArrowRight, ShieldCheck } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import { Card } from "@/components/ui/card"

const LINKS = [
  { to: "/dashboard/health", label: "Health Tracker", desc: "Log weight and body measurements", icon: Activity },
  { to: "/dashboard/delivery", label: "Meal Delivery", desc: "Today's status, pause or resume days, see upcoming meals", icon: Truck },
  { to: "/dashboard/subscription", label: "Subscription", desc: "Renew, change plan length", icon: RefreshCw },
]

function Profile() {
  const { customer } = useDashboard()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-ink mb-1">Hi, {customer.name.split(" ")[0]}</h1>
        <p className="text-ink-muted">Your OlivePinch account hub.</p>
      </div>

      <Card className="p-6 sm:p-8">
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Full name</dt>
            <dd className="mt-1 text-lg text-ink">{customer.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Age</dt>
            <dd className="mt-1 text-lg text-ink">{customer.age}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Email</dt>
            <dd className="mt-1 text-lg text-ink">{customer.email}</dd>
          </div>
        </dl>
      </Card>

      <div>
        <h2 className="text-lg text-ink mb-3">Manage your account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINKS.map((link) => (
            <Link key={link.label} to={link.to} className="group">
              <Card className="p-5 flex items-center gap-4 h-full hover:border-olive-300 transition-colors">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-olive-50">
                  <link.icon className="h-5 w-5 text-olive-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink">{link.label}</div>
                  <div className="text-sm text-ink-muted">{link.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-olive-600 shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Link
        to="/dashboard/privacy"
        className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"
      >
        <ShieldCheck className="h-4 w-4" /> Privacy &amp; data settings
      </Link>
    </div>
  )
}

export default Profile
