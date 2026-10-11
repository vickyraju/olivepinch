import { Link } from "react-router-dom"
import { Logo } from "@/components/ui/logo"

const SOCIAL_LINKS = [
  {
    label: "TikTok",
    brand: "#000000",
    href: "https://www.tiktok.com/@olive.pinch",
    icon: (
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    ),
    filled: true,
  },
  {
    label: "Facebook",
    brand: "#1877F2",
    href: "https://www.facebook.com/profile.php?id=61594828121708",
    icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
    filled: true,
  },
  {
    label: "Instagram",
    brand: "url(#olivepinch-instagram-gradient)",
    href: "https://www.instagram.com/olivepinch.official/",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </>
    ),
    filled: false,
  },
]

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-cream-100">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 grid grid-cols-2 gap-10 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <Logo className="h-9" />
          <p className="mt-3 text-sm text-ink-muted max-w-xs">
            Fresh, tasty, delivered at your doorstep.
          </p>
          <div className="mt-5 flex items-center gap-3">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`OlivePinch on ${link.label}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-muted hover:text-olive-600 hover:border-olive-300 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill={link.filled ? link.brand : "none"}
                  stroke={link.filled ? "none" : link.brand}
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {link.label === "Instagram" && (
                    <defs>
                      <linearGradient id="olivepinch-instagram-gradient" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stopColor="#feda75" />
                        <stop offset="35%" stopColor="#fa7e1e" />
                        <stop offset="60%" stopColor="#d62976" />
                        <stop offset="100%" stopColor="#4f5bd5" />
                      </linearGradient>
                    </defs>
                  )}
                  {link.icon}
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-base font-semibold text-ink mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link to="/" className="hover:text-olive-600">Home</Link></li>
            <li><Link to="/about" className="hover:text-olive-600">About Us</Link></li>
            <li><Link to="/diet-plans" className="hover:text-olive-600">Meal Plans</Link></li>
            <li><Link to="/contact" className="hover:text-olive-600">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-base font-semibold text-ink mb-3">Get Started</h4>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link to="/subscribe" className="hover:text-olive-600">Check your postcode</Link></li>
            <li><Link to="/login" className="hover:text-olive-600">Log in</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-base font-semibold text-ink mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link to="/shipping-refund-policy" className="hover:text-olive-600">Shipping and Refund Policy</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-olive-600">Privacy Policy</Link></li>
            <li><a href="#" className="hover:text-olive-600">Terms &amp; Conditions</a></li>
            <li><Link to="/privacy-policy#cookies" className="hover:text-olive-600">Cookie Settings</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-5 text-xs text-ink-muted flex flex-col sm:flex-row gap-2 sm:justify-between">
          <span>© {new Date().getFullYear()} OlivePinch.</span>
          <span>Prices in GBP (£). Delivering to Birmingham postcodes only.</span>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-5 sm:px-8 py-5 text-xs text-ink-muted">
          <strong className="font-semibold text-ink">Disclaimer:</strong> OlivePinch meals are designed to be part of a varied and balanced diet. We do not
          provide medical, nutritional, or weight-management advice, and make no claims about
          health outcomes. For specific dietary or health needs, consult a registered dietitian
          or healthcare professional.
        </p>
      </div>
    </footer>
  )
}

export { SiteFooter }
