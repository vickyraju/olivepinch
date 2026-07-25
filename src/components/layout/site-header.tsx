import { useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Diet Plans", to: "/diet-plans" },
  { label: "Contact Us", to: "/contact" },
]

function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <Link to="/">
          <Logo className="text-xl" />
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-olive-600" : "text-ink hover:text-olive-600"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild variant="accent" size="sm">
            <Link to="/subscribe">Subscribe Now</Link>
          </Button>
        </div>

        <button
          type="button"
          className="md:hidden h-11 w-11 flex items-center justify-center cursor-pointer"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav aria-label="Primary mobile" className="md:hidden border-t border-border bg-cream px-5 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn("text-base font-medium", isActive ? "text-olive-600" : "text-ink")}
            >
              {link.label}
            </NavLink>
          ))}
          <Button asChild variant="accent" size="md" className="w-full">
            <Link to="/subscribe">Subscribe Now</Link>
          </Button>
        </nav>
      )}
    </header>
  )
}

export { SiteHeader }
