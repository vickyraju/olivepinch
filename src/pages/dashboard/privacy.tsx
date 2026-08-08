import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Download, Trash2 } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import { fetchWithAuth } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

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

function Privacy() {
  const { customer, updateMarketingOptIn, deleteAccount } = useDashboard()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-ink mb-1">Privacy &amp; data</h1>
        <p className="text-ink-muted">Your health data is only ever used for BMI and meal recommendations.</p>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="marketing-opt-in"
            checked={customer.marketingOptIn}
            onCheckedChange={(v) => updateMarketingOptIn(v === true)}
          />
          <Label htmlFor="marketing-opt-in" className="mb-0 font-normal cursor-pointer">
            Send me offers and newsletters (optional — order and delivery updates are sent either way)
          </Label>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg text-ink mb-1">Your data</h2>
        <p className="text-sm text-ink-muted mb-5">Export everything we hold on you, or permanently delete your account.</p>

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

export default Privacy
