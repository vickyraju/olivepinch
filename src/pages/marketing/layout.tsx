import { Outlet } from "react-router-dom"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"

function MarketingLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <div className="border-t border-border bg-cream-100">
        <p className="mx-auto max-w-7xl px-5 sm:px-8 py-5 text-xs text-ink-muted leading-relaxed">
          <strong className="font-semibold text-ink">Disclaimer:</strong> OlivePinch meals are designed to be part of a varied and balanced diet. We do not provide medical, nutritional, or weight-management advice, and make no claims about health outcomes. For specific dietary or health needs, consult a registered dietitian or healthcare professional.
        </p>
      </div>
      <SiteFooter />
    </div>
  )
}

export default MarketingLayout
