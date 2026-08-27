import { useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { Menu, X, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { useAuth } from "@/lib/auth"
import { cn, splitFullName } from "@/lib/utils"

const BASE_LINKS = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Diet Plans", to: "/diet-plans" },
  { label: "Contact Us", to: "/contact" },
]

function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated, customer } = useAuth()
  const firstName = customer ? splitFullName(customer.fullName).firstName : ""
  const navLinks = [
    ...BASE_LINKS,
    isAuthenticated ? { label: "Dashboard", to: "/dashboard" } : { label: "Login", to: "/login" },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <Link to="/">
          <Logo className="text-xl" />
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "font-body text-sm font-normal transition-colors",
                  isActive ? "text-olive-600" : "text-ink hover:text-olive-600"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block">
          {isAuthenticated ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">
                <User className="h-3.5 w-3.5" /> Hi, {firstName}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="primary" size="sm">
              <Link to="/subscribe">Subscribe Now</Link>
            </Button>
          )}
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
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn("font-body text-base font-normal", isActive ? "text-olive-600" : "text-ink")}
            >
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <Button asChild variant="outline" size="md" className="w-full" onClick={() => setOpen(false)}>
              <Link to="/dashboard">
                <User className="h-4 w-4" /> Hi, {firstName}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="primary" size="md" className="w-full" onClick={() => setOpen(false)}>
              <Link to="/subscribe">Subscribe Now</Link>
            </Button>
          )}
        </nav>
      )}
    </header>
  )
}

export { SiteHeader }
