import { useState } from "react"
import { Mail, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, ApiError } from "@/lib/api"

const CONTACT_INFO = [
  { icon: Mail, label: "hello@olivepinch.com" },
  { icon: Phone, label: "0121 312 9505" },
  { icon: MapPin, label: "Birmingham, UK" },
]

function Contact() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (sending) return
    const data = new FormData(e.currentTarget)
    setSending(true)
    setError("")
    try {
      await api.post("/contact", {
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        message: String(data.get("message") ?? ""),
        website: String(data.get("website") ?? ""),
      })
      setSent(true)
    } catch (err) {
      // The form stays filled in, so the customer can retry without retyping.
      setError(err instanceof ApiError ? err.message : "We couldn't send your message just now. Please email hello@olivepinch.com instead.")
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="pt-14 pb-20 sm:pt-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-xl mb-14">
          <h1 className="text-4xl sm:text-5xl text-ink mb-4">Get in touch</h1>
          <p className="text-ink-muted leading-relaxed">
            Question about a delivery, your subscription, or whether we cover your postcode?
            Send us a message and we'll get back to you within one business day.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <ul className="space-y-4 mb-10">
              {CONTACT_INFO.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-ink">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-olive-50 shrink-0">
                    <item.icon className="h-4.5 w-4.5 text-olive-600" />
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-2xl bg-surface border border-border p-8 shadow-soft">
            {sent ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <h3 className="text-xl text-ink mb-2">Message sent</h3>
                <p className="text-ink-muted">Thanks for reaching out — we'll reply within one business day.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Honeypot: invisible to people, tempting to bots. Never shown or tabbed to. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="contact-website">Website</label>
                  <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>
                <div className="mb-5">
                  <Label htmlFor="contact-name">Full name</Label>
                  <Input id="contact-name" name="name" required maxLength={100} autoComplete="name" />
                </div>
                <div className="mb-5">
                  <Label htmlFor="contact-email">Email address</Label>
                  <Input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" />
                </div>
                <div className="mb-6">
                  <Label htmlFor="contact-message">Message</Label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    maxLength={3000}
                    rows={4}
                    className="flex w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:border-olive-500 user-invalid:border-destructive user-invalid:bg-coral-50 user-invalid:ring-1 user-invalid:ring-destructive"
                  />
                </div>
                {error && (
                  <p role="alert" className="mb-4 text-sm text-coral-600">
                    {error}
                  </p>
                )}
                <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto" disabled={sending}>
                  {sending ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
