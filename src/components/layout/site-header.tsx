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

// "Order Now" plus Subscribe (or the signed-in "Hi, name" link). Rendered in the desktop header and in
// the phone buttons row below it, so the two never drift apart.
function HeaderActions({ className, buttonClassName }: { className?: string; buttonClassName?: string }) {
  const { isAuthenticated, customer } = useAuth()
  const firstName = customer ? splitFullName(customer.fullName).firstName : ""
  return (
    <div className={className}>
      <Button asChild variant="outline" size="sm" className={buttonClassName}>
        <a href={ORDER_NOW_URL} target="_blank" rel="noopener noreferrer">Order Now</a>
      </Button>
      {isAuthenticated ? (
        <Button asChild variant="outline" size="sm" className={buttonClassName}>
          <Link to="/dashboard">
            <User className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Hi, {firstName}</span>
          </Link>
        </Button>
      ) : (
        <Button asChild variant="primary" size="sm" className={buttonClassName}>
          <Link to="/subscribe">Subscribe Now</Link>
        </Button>
      )}
    </div>
  )
}

// Phones are too narrow for logo + two buttons + menu icon in one row (the logo got squashed to a
// sliver), so the buttons get their own full-width row under the logo, pinned with the header.
function MobileActionsBar() {
  return (
    <div className="md:hidden border-t border-border">
      <HeaderActions className="mx-auto grid max-w-7xl grid-cols-[repeat(2,minmax(0,1fr))] gap-3 px-5 py-2" buttonClassName="h-10 w-full" />
    </div>
  )
}

function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const navLinks = [
    ...BASE_LINKS,
    isAuthenticated ? { label: "Dashboard", to: "/dashboard" } : { label: "Login", to: "/login" },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 py-2 sm:px-8 md:h-18 md:py-3">
        <Link to="/" className="shrink-0">
          <Logo className="h-9" />
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

        <HeaderActions className="hidden md:flex items-center gap-3" />

        <div className="flex md:hidden items-center">
          <button
            type="button"
            className="-mr-2 h-11 w-11 flex items-center justify-center cursor-pointer"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <MobileActionsBar />

      {open && (
        <nav aria-label="Primary mobile" className="md:hidden max-h-[60dvh] overflow-y-auto border-t border-border bg-cream px-5 py-4 flex flex-col gap-4">
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
