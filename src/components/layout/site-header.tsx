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
  { label: "Meal Plans", to: "/diet-plans" },
  { label: "Contact Us", to: "/contact" },
]

const ORDER_NOW_URL = "https://orbitonline.co.uk/olivepinch/"

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

        <div className="hidden md:flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <a href={ORDER_NOW_URL} target="_blank" rel="noopener noreferrer">Order Now</a>
          </Button>
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

        <div className="flex md:hidden items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={ORDER_NOW_URL} target="_blank" rel="noopener noreferrer">Order Now</a>
          </Button>
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
          <button
            type="button"
            className="h-11 w-11 flex items-center justify-center cursor-pointer ml-1"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
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
        </nav>
      )}
    </header>
  )
}

export { SiteHeader }
