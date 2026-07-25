import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Activity, Truck, RefreshCw, UtensilsCrossed, Download, Trash2, ArrowRight } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import { fetchWithAuth } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const LINKS = [
  { to: "/dashboard/health", label: "Health Tracker", desc: "Log weight and body measurements", icon: Activity },
  { to: "/dashboard/delivery", label: "Meal Delivery", desc: "Today's status, pause or resume days", icon: Truck },
  { to: "/dashboard/delivery", label: "Menu", desc: "See what's in your upcoming deliveries", icon: UtensilsCrossed },
  { to: "/dashboard/subscription", label: "Subscription", desc: "Renew, change plan length", icon: RefreshCw },
]

async function downloadData() {
  const res = await fetchWithAuth("/customers/me/export")
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "olivepinch-my-data.json"
  a.click()
  URL.revokeObjectURL(url)
}

function Profile() {
  const { customer, updateMarketingOptIn, deleteAccount } = useDashboard()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

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

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg text-ink mb-1">Privacy &amp; data</h2>
        <p className="text-sm text-ink-muted mb-5">Your health data is only ever used for BMI and meal recommendations.</p>

        <div className="flex items-center gap-2.5 mb-6">
          <Checkbox
            id="marketing-opt-in"
            checked={customer.marketingOptIn}
            onCheckedChange={(v) => updateMarketingOptIn(v === true)}
          />
          <Label htmlFor="marketing-opt-in" className="mb-0 font-normal cursor-pointer">
            Send me offers and newsletters (optional — order and delivery updates are sent either way)
          </Label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="button" variant="outline" onClick={() => downloadData()}>
            <Download className="h-4 w-4" /> Download my data
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="destructive">
                <Trash2 className="h-4 w-4" /> Delete my account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This erases your profile, health logs, and preferences. Payment records are kept for
                the period required by UK tax law; everything else is removed. This can't be undone.
              </DialogDescription>
              <div className="mt-6 flex justify-end gap-3">
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost">Cancel</Button>
                </DialogTrigger>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true)
                    await deleteAccount()
                    navigate("/")
                  }}
                >
                  {deleting ? "Deleting…" : "Confirm deletion"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  )
}

export default Profile
