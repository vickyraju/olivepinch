import { Link } from "react-router-dom"
import { Logo } from "@/components/ui/logo"

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-cream-100">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 grid grid-cols-2 gap-10 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <Logo className="text-xl" />
          <p className="mt-3 text-sm text-ink-muted max-w-xs">
            Freshly prepared, goal-based meal plans delivered daily, one UK city at a time.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link to="/" className="hover:text-olive-600">Home</Link></li>
            <li><Link to="/about" className="hover:text-olive-600">About Us</Link></li>
            <li><Link to="/diet-plans" className="hover:text-olive-600">Diet Plans</Link></li>
            <li><Link to="/contact" className="hover:text-olive-600">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink mb-3">Get Started</h4>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link to="/subscribe" className="hover:text-olive-600">Check your postcode</Link></li>
            <li><Link to="/login" className="hover:text-olive-600">Log in</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link to="/privacy-policy" className="hover:text-olive-600">Privacy Policy</Link></li>
            <li><a href="#" className="hover:text-olive-600">Terms &amp; Conditions</a></li>
            <li><Link to="/privacy-policy#cookies" className="hover:text-olive-600">Cookie Settings</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-5 text-xs text-ink-muted flex flex-col sm:flex-row gap-2 sm:justify-between">
          <span>© {new Date().getFullYear()} OlivePinch. UK pilot.</span>
          <span>Prices in GBP (£). Delivering to Birmingham postcodes only.</span>
        </div>
      </div>
    </footer>
  )
}

export { SiteFooter }
